/*jshint esversion: 6 */

var stdinBufferString = "";
var interactiveBufferString = "";
var mem_write_delay = 33;
var simulator_sleep = [1, 1, 1]; // int, read, write
var simulator_int_inst_delay = 1000;

onmessage = function(e) {
  console.log(e.data);
  switch(e.data.type){
    case "code_load":
      files = e.data.code;
      break;
    case "start_sim":  
      importScripts("whisper.js");
      break;
    case "stdin":
      stdinBufferString += e.data.stdin;
      console.log(stdinBufferString);
      break;
    case "mmio":
      mmio.update_store(e.data.addr, e.data.size, e.data.value);
      break;
    case "interactive":
      interactiveBufferString += e.data.cmd;
      break;
    case "interrupt":
      intController.changeState(e.data.state);
      break;
    case "add_files":
      files = e.data.files;
      break;
    case "start":
      console.log(e.data.args);
      Module.arguments = e.data.args;
      if(e.data.args.includes("--interactive")){
        postMessage({type:"status", status:{running:true, debugging:true}});
      }else{
        postMessage({type:"status", status:{running:true}});
      } 
      importScripts("whisper.js");
      break;

    case "load_syscall":
      syscall_emulator.register(parseInt(e.data.number), e.data.code);
      break;

    case "disable_syscall":
      syscall_emulator.unregister(parseInt(e.data.number));
      break;

    case 'interrupt_enabled':
      intController.interrupt_enabled = e.data.value;
      break;
    
    case 'set_freq_limit':
      let value = e.data.value;
      if(value == 1000){
        simulator_sleep[2] = 1;
      }else{
        simulator_sleep[2] = 1000*(1/value);
      } 
      break;
    case "set_int_delay":
      simulator_int_inst_delay = e.data.value;
      break;
  }
};

class MMIO{
  constructor(size){
    this.sharedBuffer = new ArrayBuffer(size);
    this.memory = [];
    this.memory[1] = new Uint8Array(this.sharedBuffer);
    this.memory[2] = new Uint16Array(this.sharedBuffer);
    this.memory[4] = new Uint32Array(this.sharedBuffer);
    this.size = this.sharedBuffer.byteLength;
  }

  load(addr, size){
    addr &= 0xFFFF;
    if(addr > this.size){
      postMessage({type: "output", subtype: "error", msg: "MMIO Access Error"});
    }

    return this.memory[size][(addr/size) | 0];
  }

  store(addr, size, value){
    addr &= 0xFFFF;
    if(addr > this.size){
      postMessage({type: "output", subtype: "error", msg: "MMIO Access Error"});
    }
    postMessage({type: "mmio_write", addr: (addr >>> 0), size, value});
    this.memory[size][(addr/size) | 0] = value;
  }

  update_store(addr, size, value){
    addr &= 0xFFFF;
    this.memory[size][(addr/size) | 0] = value;
  }
}

var mmio = new MMIO();


class InterruptionController{
  constructor(){
    this.state = 0;
    this.interrupt_enabled = 1;
  }

  changeState(state){
    this.state = state;
  }

  get interrupt(){
    let res = this.state;
    this.state = 0;
    return res;
  }

  get interruptEnabled(){
    return this.interrupt_enabled;
  }
}

class SyscallEmulator{
  constructor(){
    this.syscalls = [];
  }

  register(number, code){
    this.syscalls[number] = code;
  }

  unregister(number){
    delete this.syscalls[number];
  }

  run(a0, a1, a2, a3, a7){
    if(a7 in this.syscalls){
      var sendMessage = function(msg){
        postMessage({type: "device_message", syscall: a7, message: msg});
        if(mem_write_delay){
          let start = performance.now();
          while(performance.now() - start < mem_write_delay);
        }
      };
      eval(this.syscalls[a7]);
      return a0;
    }else{
      var text = "Invalid syscall: " + a7;
      postMessage({type: "stdio", stdioNumber: 2, msg: text});
      return 0;
    }
  }
}

var syscall_emulator = new SyscallEmulator();
var intController = new InterruptionController();


function getStdin (count){
  if(stdinBufferString.length == 0){
    return -1;
  }
  var uint8array = new TextEncoder("utf-8").encode(stdinBufferString);
  if(uint8array.length >= count){
    return (new TextDecoder().decode(uint8array.slice(0, count)));
  }
  if(uint8array.includes(0)){
    return (new TextDecoder().decode(uint8array));
  }
  return -1;
}

function getInteractiveCommand (){
  let res = interactiveBufferString;
  interactiveBufferString = "";
  return res;
}

function initFS() {
  FS.init(null, null, null);
  FS.mkdir('/working');
  if(files){
    FS.mount(WORKERFS, {
      files: files, // Array of File objects or FileList
    }, '/working');
  }
}

var xhr = new XMLHttpRequest();
function getDebugMsg(){
  postGDBWaiting = 1;
  while(1){
    try{
      xhr.open("GET", "http://127.0.0.1:5689/gdbInput", false);  // synchronous request
      xhr.send(null);
      if(xhr.status === 200){
        return xhr.responseText;
      }
    }catch(e){
      if(postGDBWaiting){
        postMessage({type: "output", subtype: "info", msg: "Waiting for GDB..."});
        postGDBWaiting = 0;
      }
    }
  }
}

var xhrS = new XMLHttpRequest();
function sendDebugMsg(msg){
  postGDBWaiting = 1;
  while(1){
    try {
      xhrS.open("POST", "http://127.0.0.1:5689/gdbInput", false);  // synchronous request
      xhrS.send(msg);
      if(xhrS.status === 200){
        return;
      }
    } catch (error) {
      if(postGDBWaiting){
        postMessage({type: "output", subtype: "info", msg: "Waiting for GDB..."});
        postGDBWaiting = 0;
      }
    }
  }
}

var Module = {
  // arguments : ["--version"],
  arguments : ["--newlib", "/working/ex2", "--isa", "acdfimsu", "--setreg", "sp=0x10000"],
  preRun : [initFS],
  print : function (text) {postMessage({type: "stdio", stdioNumber: 1, msg: text});},
  printErr : function (text) {postMessage({type: "stdio", stdioNumber: 2, msg: text});}
};

postMessage({type:"status", status:{running:false, starting:true}});