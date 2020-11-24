/*jshint esversion: 6 */

var stdinBuffer = "";
var stdinBufferString = "";
var mem_write_delay = 0;
const sim_ctrl_ch = new BroadcastChannel('simulator_control');


onmessage = function(e) {
  switch(e.data.type){
    case "code_load":
      files = e.data.code;
      break;
    case "start_sim":  
      importScripts("whisper.js");
      break;
    case "stdin":
      stdinBufferString = e.data.stdin;
      console.log(stdinBufferString);
      break;
    // case "set_args":
    //   Module.arguments = e.data.vec;
    //   break;
    case "mmio":
      mmio = new MMIO(e.data.vec);
      break;
    // case "syscall":
    //   syscall_emulator.register(parseInt(e.data.num), e.data.code);
    //   break;
    case "interactive":
      interactiveBuffer = new Uint8Array(e.data.vec);
      break;
    case "stdin_buffer":
      stdinBuffer = new Uint16Array(e.data.vec);
      break;
    case "interrupt":
      intController.setMemoryTrigger(e.data.vec);
      break;
  }
};

class MMIO{
  constructor(sharedBuffer, bc){
    this.memory = [];
    this.memory[1] = new Uint8Array(sharedBuffer);
    this.memory[2] = new Uint16Array(sharedBuffer);
    this.memory[4] = new Uint32Array(sharedBuffer);
    this.size = sharedBuffer.byteLength;
  }

  load(addr, size){
    addr &= 0xFFFF;
    if(addr > this.size){
      postMessage({type: "output", subtype: "error", msg: "MMIO Access Error"});
    }
    return Atomics.load(this.memory[size], (addr/size) | 0);
  }

  store(addr, size, value){
    addr &= 0xFFFF;
    if(addr > this.size){
      postMessage({type: "output", subtype: "error", msg: "MMIO Access Error"});
    }
    Atomics.store(this.memory[size], (addr/size) | 0, value);
    postMessage({type: "mmio_write", addr: (addr >>> 0), size, value});
    
    if(mem_write_delay){
      let start = performance.now();
      while(performance.now() - start < mem_write_delay);
    }
  }
}

class InterruptionController{
  constructor(){
    this.state = 0;
  }

  setMemoryTrigger(vec){
    this.memoryTrigger = new Uint8Array(vec);
  }

  changeState(state){
    this.state = state;
  }

  get interrupt(){
    return Atomics.load(this.memoryTrigger, 0);
  }

  get interruptEnabled(){
    return 1;
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


function loadStdin (){
  var e_idx = Atomics.load(stdinBuffer, 1);
  if(e_idx == 0) return;
  while(Atomics.exchange(stdinBuffer, 0,  1) == 1); // lock
  for (var i = 0; i < e_idx; i++) {
    stdinBufferString += String.fromCharCode(Atomics.load(stdinBuffer, i+2));
  }
  Atomics.store(stdinBuffer, 1, 0);
  Atomics.store(stdinBuffer, 0,  0); // free lock
}


function getStdin (){
  loadStdin();
  while(stdinBufferString.length == 0){
    loadStdin();
  }
  c = stdinBufferString.charCodeAt(0);
  stdinBufferString = stdinBufferString.slice(1);
  console.log(c);
  if(c==0 || c == 0xFFFF){
    return null;
  }
  return c;
}

function getInteractiveCommand (){
  while(true){
    if(Atomics.load(interactiveBuffer, 0) == 1 ){
      var i = 1;
      var string = "";
      var c = Atomics.load(interactiveBuffer, i);
      while(c != 0){
        string += String.fromCharCode(c);
        i++;
        c = Atomics.load(interactiveBuffer, i);
      }
      Atomics.store(interactiveBuffer, 0, 0);
      return string;
    }
  }
}

function initFS() {
  FS.init(getStdin, null, null);
  FS.mkdir('/working');
  if(files){
    FS.mount(WORKERFS, {
      files: files, // Array of File objects or FileList
    }, '/working');
  }
  // console.log(FS.stat("/working"));
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


sim_ctrl_ch.postMessage({dst:"interface", type:"status", status:{running:false, starting:true}});
sim_ctrl_ch.onmessage = function (e) {
  console.log("sim_worker:", e.data);
  if(e.data.dst=="simulator"){
    switch (e.data.cmd) {
      case "add_files":
        files = e.data.files;
        break;

      case "start":
        console.log(e.data.args);
        Module.arguments = e.data.args;
        if(e.data.args.includes("--interactive"))  sim_ctrl_ch.postMessage({dst:"interface", type:"status", status:{running:true, debugging:true}});
        else sim_ctrl_ch.postMessage({dst:"interface", type:"status", status:{running:true}});
        importScripts("whisper.js");
        break;

      case "load_syscall":
        syscall_emulator.register(parseInt(e.data.syscall.number), e.data.syscall.code);
        break;

      case "disable_syscall":
        syscall_emulator.unregister(parseInt(e.data.syscall_number));
        break;
      
      case 'set_freq_limit':
        let value = e.data.value;
        if(value == 1000){
          mem_write_delay = 0;
        }else{
          mem_write_delay = 1/value;
        } 
        break;

      default:
        console.log(e.data);
        break;
    }
    
  }
}