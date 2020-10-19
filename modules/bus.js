class MMIO{
  constructor(size){
    this.sharedBuffer = new SharedArrayBuffer(size);
    this.memory = [];
    this.memory[1] = new Uint8Array(this.sharedBuffer);
    this.memory[2] = new Uint16Array(this.sharedBuffer);
    this.memory[4] = new Uint32Array(this.sharedBuffer);
    this.size = this.sharedBuffer.byteLength;
  }

  load(addr, size){
    addr &= 0xFFFF;
    return Atomics.load(this.memory[size], (addr/size) | 0);
  }

  store(addr, size, value){
    addr &= 0xFFFF;
    Atomics.store(this.memory[size], (addr/size) | 0, value);
  }
}

class Bus{
  constructor(sharedArraySize=0x10000){
    this.sharedArraySize = sharedArraySize;
    this.stdio_ch = new BroadcastChannel("stdio_channel");
    this.sim_ctrl_ch = new BroadcastChannel('simulator_control');
    this.bus_ch = new BroadcastChannel('bus_channel');
    this.startSimulator();
    this.stdio_ch.onmessage = function (e) {
      if(e.data.fh==0){ // stdin
        // this.simulator.postMessage({type: "stdin", stdin: e.data.data});
        while(Atomics.exchange(this.stdinBuffer, 0,  1) == 1); // lock
        var s_idx = Atomics.load(this.stdinBuffer, 1);
        for (var i = 0; i < e.data.data.length; i++) {
          Atomics.store(this.stdinBuffer, i+s_idx+2,  e.data.data.charCodeAt(i));
        }
        Atomics.store(this.stdinBuffer, e.data.data.length+s_idx+2, 10);
        Atomics.store(this.stdinBuffer, e.data.data.length+s_idx+3, -1);
        Atomics.store(this.stdinBuffer, 1, s_idx+e.data.data.length+2);
        Atomics.store(this.stdinBuffer, 0,  0);
      }else if(e.data.debug){
        if (e.data.cmd.length >= 510) return;
        for (var i = 1; i <= e.data.cmd.length; i++) {
          Atomics.store(this.interactiveBuffer, i,  e.data.cmd.charCodeAt(i-1));
        }
        Atomics.store(this.interactiveBuffer, i,  0);
        Atomics.store(this.interactiveBuffer, 0, 1);
      }else if(e.data.init_stdin){
        this.simulator.postMessage({type: "stdin", stdin: e.data.data});
      }
    }.bind(this);
    this.sim_ctrl_ch.onmessage = function (e) {
      if(e.data.dst=="bus"){
        if(e.data.cmd == "stop_simulator"){
          this.restartSimulator();
        }
      }
    }.bind(this);
    this.bus_ch.onmessage = function (e) {
      if(e.data.write && !e.data.committed){
        this.mmio.store(e.data.addr, e.data.size, e.data.value);
      }
    }.bind(this);
  }

  startSimulator(){
    this.simulator = new Worker("simulator_worker.js");
    this.simulator.onmessage = function(e){
      if(!e.data.type){
        console.log("w: " + e.data);
        return;
      }
      switch(e.data.type){
        case "stdio":
          // TODO throttle message frequency
          this.stdio_ch.postMessage({fh:e.data.stdioNumber,data:e.data.msg});
          break;
        case "output":
          // TODO
          break;
        case "mmio_write":
          this.bus_ch.postMessage({write:true, addr: e.data.addr, size: e.data.size, value: e.data.value})
          break;
        case 'device_message':
          this.bus_ch.postMessage({so_emulation:true, syscall: e.data.syscall, data: e.data.message});
          break;
        default:
          console.log("w: " + e.data);
      }
    }.bind(this);
    
    if(typeof SharedArrayBuffer != "undefined"){
      this.mmio = new MMIO(this.sharedArraySize);
      this.simulator.postMessage({type: "mmio", vec: this.mmio.sharedBuffer});
      var interruptMem = new SharedArrayBuffer(1);
      this.interruptTrigger = new Uint8Array(interruptMem);
      this.simulator.postMessage({type: "interrupt", vec: interruptMem});
      var interactiveMem = new SharedArrayBuffer(512);
      this.interactiveBuffer = new Uint8Array(interactiveMem);
      this.simulator.postMessage({type: "interactive", vec: interactiveMem});
      var stdinMem = new SharedArrayBuffer(2*65536);
      this.stdinBuffer = new Uint16Array(stdinMem);
      this.simulator.postMessage({type: "stdin_buffer", vec: stdinMem});
    }
  }

  restartSimulator(){
    this.simulator.terminate();
    this.sim_ctrl_ch.postMessage({dst:"interface", type:"status", status:{running:false}});
    this.startSimulator();
  }
}

var bus = new Bus();