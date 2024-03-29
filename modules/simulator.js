class MMIO{
  constructor(size){
    this.sharedBuffer = new ArrayBuffer(size);
    this.memory = [];
    this.memory[1] = new Uint8Array(this.sharedBuffer);
    this.memory[2] = new Uint16Array(this.sharedBuffer);
    this.memory[4] = new Uint32Array(this.sharedBuffer);
    this.size = this.sharedBuffer.byteLength;
  }

  reset(){
    this.memory[4].fill(0)
  }

  load(addr, size){
    addr &= 0xFFFF;
    return this.memory[size][(addr/size) | 0];
  }
  
  store(addr, size, value){
    addr &= 0xFFFF;
    this.memory[size][(addr/size) | 0] = value;
    simulator_controller.add_mmio_update(addr, size, value);
  }

  update_store(addr, size, value){
    addr &= 0xFFFF;
    this.memory[size][(addr/size) | 0] = value;
  }
}

class SimulatorController{
  constructor(){
    this.stdio_ch = new BroadcastChannel("stdio_channel" + window.uniq_id);
    this.sim_status_ch = new BroadcastChannel('simulator_status' + window.uniq_id);
    this.bus_ch = new BroadcastChannel('bus_channel' + window.uniq_id);
    this.bus_freq_limit = 30;
    this.int_cont_freq_scale = 25;
    this.last_loaded_files = []
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
    this.simulator.onmessage = function(e){
      switch(e.data.type){
        case 'device_message':
          this.bus_ch.postMessage({so_emulation:true, syscall: e.data.syscall, data: e.data.message});
          break;
        case "sim_log":
          this.sim_status_ch.postMessage(e.data);
          break;
        case "status":
          if(e.data.status.finish){
            this.restart_simulator();
          }else{
            this.sim_status_ch.postMessage(e.data);
          }
          break;
        case 'sync':
          this.bus_sync(e.data);
          break;
          
        default:
          console.log("w: " + e.data);
      }
    }.bind(this);
    mmio.reset();
    this.mmio_write_buffer = [];
    this.set_freq_limit(this.bus_freq_limit);
    this.set_int_freq_scale_limit(this.int_cont_freq_scale);
  }

  add_mmio_update(addr, size, value){
    for (let i = 0; i < size; i++) {
      this.mmio_write_buffer[addr + i] = (value >> (i*8)) & 0xFF;
    }
  }

  bus_sync(data){
    if(data.stdout.length > 0) this.stdio_ch.postMessage({fh:1, data:data.stdout});
    if(data.stderr.length > 0) this.stdio_ch.postMessage({fh:2, data:data.stderr});
    for (const i in data.mmio_buffer) {
      mmio.memory[1][i] = data.mmio_buffer[i];
    }
    setTimeout( _ => {
      this.simulator.postMessage({type:"sync", buffer:this.mmio_write_buffer});
      this.mmio_write_buffer = [];
    }, 0);
  }

  start_execution(args){
    this.simulator.postMessage({type: "add_files", files: this.last_loaded_files});
    this.sim_status_ch.postMessage({type: "status", status:{starting_exec: true, args}});
    this.simulator.postMessage({type: "start", args});
    setTimeout( _ => {
      this.simulator.postMessage({type:"sync", buffer:this.mmio_write_buffer});
      this.mmio_write_buffer = [];
    }, 0)
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
    this.last_loaded_files = [];
    for (let i = 0; i < files.length; i++) {
      this.last_loaded_files[i] = files[i];
    }
    this.sim_status_ch.postMessage({type: "load_file", name: this.last_loaded_files[0].name, size: this.last_loaded_files[0].size});
  }

  load_new_file(file){
    for (let index = 0; index < this.last_loaded_files.length; index++) {
      if(this.last_loaded_files[index].name == file.name){
        this.last_loaded_files[index] = file;
        return;
      }
    }
    this.last_loaded_files.push(file);
  }

  set_int_freq_scale_limit(value){
    this.int_cont_freq_scale = value;
    if(value == 0){
      this.simulator.postMessage({type: "interrupt_enabled", value: 0});
    }else{
      this.simulator.postMessage({type: "interrupt_enabled", value: 1});
    }
    this.simulator.postMessage({type: "set_int_delay", value: (2**(32 - value)) - 1});
  }

  set_freq_limit(value){
    this.bus_freq_limit = value;
    this.simulator.postMessage({type: "set_freq_limit", value});
  }

  restart_simulator(){
    this.simulator.terminate();
    this.sim_status_ch.postMessage({type:"status", status:{stopping:true}});
    this.startSimulator();
  }

  stop_execution(){
    this.restart_simulator();
  }
}

class InterruptController{
  constructor(){
  }

  interrupt(device_id){
    if(mmio.load(0xFFFF0008, 4)){
      return false;
    }
    mmio.store(0xFFFF0004, 4, device_id);
    mmio.store(0xFFFF0008, 4, 1);
    simulator_controller.triggerInterrupt();
    return true;
  }


}

export const mmio = new MMIO(0x10000);
export const simulator_controller = new SimulatorController();
export const interrupt_controller = new InterruptController();