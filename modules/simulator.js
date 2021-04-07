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
    return this.memory[size][(addr/size) | 0];
  }
  
  store(addr, size, value){
    addr &= 0xFFFF;
    this.memory[size][(addr/size) | 0] = value;
    simulator_controller.simulator.postMessage({type: "mmio", addr, size, value});
  }

  update_store(addr, size, value){
    addr &= 0xFFFF;
    this.memory[size][(addr/size) | 0] = value;
  }
}

class SimulatorController{
  constructor(){
    this.stdio_ch = new BroadcastChannel("stdio_channel");
    this.sim_status_ch = new BroadcastChannel('simulator_status');
    this.bus_ch = new BroadcastChannel('bus_channel');
    this.startSimulator();
    this.stdio_ch.onmessage = function (e) {
      if(e.data.fh==0){ // stdin
        this.simulator.postMessage({type: "stdin", stdin: e.data.data});
      }else if(e.data.debug){
        this.simulator.postMessage({type: "interactive", cmd: e.data.cmd});
      }else if(e.data.init_stdin){
        this.simulator.postMessage({type: "stdin", stdin: e.data.data});
      }
    }.bind(this);
  }

  triggerInterrupt(){
    this.simulator.postMessage({type: "interrupt", state: 1});
  }

  startSimulator(){
    this.simulator = new Worker("./modules/simulator_worker.js");
    this.mmio = mmio;
    this.simulator.onmessage = function(e){
      switch(e.data.type){
        case "stdio":
          // TODO throttle message frequency
          this.stdio_ch.postMessage({fh:e.data.stdioNumber,data:e.data.msg});
          break;
        case "output":
          // TODO
          break;
        case "mmio_write":
          mmio.update_store(e.data.addr, e.data.size, e.data.value);
          this.bus_ch.postMessage({write:true, addr: e.data.addr, size: e.data.size, value: e.data.value})
          break;
        case 'device_message':
          this.bus_ch.postMessage({so_emulation:true, syscall: e.data.syscall, data: e.data.message});
          break;
        case "status":
          this.sim_status_ch.postMessage(e.data);
          break;

        default:
          console.log("w: " + e.data);
      }
    }.bind(this);
  }

  start_execution(args){
    this.sim_status_ch.postMessage({type: "status", status:{starting_exec: true, args}});
    this.simulator.postMessage({type: "start", args});
  }

  load_syscall(number, code, desc){
    if(desc){
      this.sim_status_ch.postMessage({type: "load_syscall", number, desc, code});
    }
    this.simulator.postMessage({type: "load_syscall", number, code});
  }

  remove_syscall(number){
    this.simulator.postMessage({type: "disable_syscall", number});
  }

  load_files(files){
    this.simulator.postMessage({type: "add_files", files});
  }

  set_mem_limit(value){
    // TODO
  }

  set_freq_limit(value){
    this.simulator.postMessage({type: "set_freq_limit", value});
  }

  restart_simulator(){
    this.simulator.terminate();
    this.sim_status_ch.postMessage({type:"status", status:{running:false}});
    this.startSimulator();
  }

  stop_execution(){
    this.restart_simulator();
  }
}

class InterruptController{

  
}

export const mmio = new MMIO(0x10000);
export const simulator_controller = new SimulatorController();