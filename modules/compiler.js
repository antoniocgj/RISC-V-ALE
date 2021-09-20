class Compiler{
  constructor(){
    this.timeout = 5000;
    this.loaded_files = [];
    this.stdio_ch = new BroadcastChannel("stdio_channel" + window.uniq_id);
    this.sim_status_ch = new BroadcastChannel('simulator_status' + window.uniq_id);
  }

  setup_worker(w, file_callback){
    w.onmessage = function (ev) {
      console.log(ev);
      switch (ev.data.type) {
        case 'stdio':
          this.stdio_ch.postMessage({fh:ev.data.stdioNumber,data:ev.data.msg,origin:"clang"});
          break;
        
        case 'file':
          file_callback(ev.data.file);
        default:
          break;
      }
    }.bind(this);
    w.postMessage({type: "add_files", files: this.loaded_files});
  }

  get_output_name(args, def){
    let idx = args.indexOf("-o");
    if(idx == -1 || args.length < idx + 2) return def;
    return args[idx + 1];
  }

  set_file_array(array){
    this.loaded_files = array;
  }

  load_files(files){
    this.loaded_files = [];
    for (let i = 0; i < files.length; i++) {
      this.loaded_files[i] = files[i];
    }
  }

  load_new_file(file){
    for (let index = 0; index < this.loaded_files.length; index++) {
      if(this.loaded_files[index].name == file.name){
        this.loaded_files[index] = file;
        return;
      }
    }
    this.loaded_files.push(file);
  }

  async invoke_clang(op, args, out_filename, in_file){
    var worker = new Worker("./modules/clang_worker.js");
    return new Promise(resolve =>{
      var cto = setTimeout(function () {
        worker.terminate();
        this.stdio_ch.postMessage({fh:2, data: "Compiler timed out"});
        resolve(-1);
      }.bind(this), this.timeout);
      var file_callback = function (file) {
        clearTimeout(cto);
        worker.terminate();
        resolve(file);
      };
      this.setup_worker(worker, file_callback);
      worker.postMessage({type: op, args, file: in_file, out_filename});
    });
  }

  async auto_compile(c_ext, asm_ext, obj_ext, elf_ext){
    let obj_files = [];
    for (let index = 0; index < this.loaded_files.length; index++) {
      const element = this.loaded_files[index];
      if(element.name.endsWith(c_ext)) {
        await this.cc([element.name, "-o", element.name.slice(0, -2) + obj_ext]);
      } else if(element.name.endsWith(asm_ext)) {
        await this.as([element.name, "-o", element.name.slice(0, -2) + obj_ext]);
      }
    }
    for (let index = 0; index < this.loaded_files.length; index++) {
      const element = this.loaded_files[index];
      if(element.name.endsWith(obj_ext)) {
        obj_files.push(element.name);
      }
    }
    if(obj_files.length > 0){
      if(await this.ld([obj_files, "-o", "main" + elf_ext].flat())){
        return "main" + elf_ext;
      }
    }
  }

  async cc(args, load_result=true) {
    this.sim_status_ch.postMessage({type: "clang_status", status:{starting: true, tool: "cc", args}});
    let out_name = this.get_output_name(args, "out.o");
    var bytes = await this.invoke_clang("clang_c", args, out_name);
    this.sim_status_ch.postMessage({type: "clang_status", status:{finish: true}});
    if(bytes === -1) return;
    var blob = new Blob([bytes], {type: 'application/binary'});
    var file = new File([blob], out_name);
    if(load_result) this.load_new_file(file);
    return file;
  }

  async as(args, load_result=true){
    this.sim_status_ch.postMessage({type: "clang_status", status:{starting: true, tool: "as", args}});
    let out_name = this.get_output_name(args, "out.o");
    var bytes = await this.invoke_clang("clang_s", args, out_name);
    this.sim_status_ch.postMessage({type: "clang_status", status:{finish: true}});
    if(bytes === -1) return;
    var blob = new Blob([bytes], {type: 'application/binary'});
    var file = new File([blob], out_name);
    if(load_result) this.load_new_file(file);
    return file;
  }

  async ld(args, load_result=true){
    this.sim_status_ch.postMessage({type: "clang_status", status:{starting: true, tool: "ld", args}});
    let out_name = this.get_output_name(args, "out.x");
    var bytes = await this.invoke_clang("ld", args, out_name);
    this.sim_status_ch.postMessage({type: "clang_status", status:{finish: true}});
    if(bytes === -1) return;
    var blob = new Blob([bytes], {type: 'application/binary'});
    var file = new File([blob], out_name);
    if(load_result) this.load_new_file(file);
    return file;
  }
}

export const compiler = new Compiler();
