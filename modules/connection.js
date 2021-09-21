import {simulator_controller} from "./simulator.js";
import {compiler} from "./compiler.js";

export class Connection{
  constructor(){
    this.operations = {"load_file": {desc: "Load file", f: this.load_file_from_base64.bind(this)},
                       "load_files_from_array": {desc: "Load files from array", f: this.load_files_from_array.bind(this)},
                       "load_add_file": {desc: "Load Add. file", f: this.load_add_file_from_base64.bind(this)},
                       "echo": {desc: "Echo", f: this.echo.bind(this)},
                       "start_assistant": {desc: "Start Assistant Script", f: this.start_assistant.bind(this)}}

  }

  send(data){

  }

  run_remote_cmd(cmd){
    this.operations[cmd.op].f(cmd.params);
  }



  load_add_file_from_base64(params){
    var base64ToArrayBuffer = function (base64) {
      var binaryString = window.atob(base64);
      var binaryLen = binaryString.length;
      var bytes = new Uint8Array(binaryLen);
      for (var i = 0; i < binaryLen; i++) {
         var ascii = binaryString.charCodeAt(i);
         bytes[i] = ascii;
      }
      return bytes;
    };
    var bytes = base64ToArrayBuffer(params.str64);
    var blob = new Blob([bytes], {type: 'application/binary'});
    let file = new File([blob], params.name);
    simulator_controller.load_new_file(file);
  }

  load_files_from_array(files){
    simulator_controller.load_files(files);
    compiler.set_file_array(simulator_controller.last_loaded_files);
  }

  load_file_from_base64(params){
    var base64ToArrayBuffer = function (base64) {
      var binaryString = window.atob(base64);
      var binaryLen = binaryString.length;
      var bytes = new Uint8Array(binaryLen);
      for (var i = 0; i < binaryLen; i++) {
         var ascii = binaryString.charCodeAt(i);
         bytes[i] = ascii;
      }
      return bytes;
    };
    var bytes = base64ToArrayBuffer(params.str64);
    var blob = new Blob([bytes], {type: 'application/binary'});
    let file = new File([blob], params.name);
    simulator_controller.load_files([file]);
    compiler.set_file_array(simulator_controller.last_loaded_files);
  }

  start_assistant(){
    document.getElementById("assistant_run_button").click();
  }

  echo(data){
    this.send(data);
  }
}

class Window_postMessage extends Connection{
  constructor(isTrusted=false){
    super();
    this.isTrusted = isTrusted;
    window.onmessage = this.msg_handle.bind(this);
  }

  msg_handle(msg){
    if(this.isTrusted || window.origin == msg.origin){ 
      this.run_remote_cmd(msg.data.cmd); 
    }else{
      var operation = this.operations[msg.data.cmd.op];
      if(operation) operation = operation.desc;
      this.confirmation_dialog(msg.data.name, msg.origin, operation, msg.data.cmd);
    }
  }

  confirmation_dialog(name, origin, operation, cmd){
    const notice = PNotify.notice({
      title: `Remote Command Received`,
      text: `${name} is trying to execute a remote command in the simulator. Do you wish to proceed? \n \n Operation: ${operation} \n Origin: ${origin}`,
      icon: 'fas fa-exclamation-triangle',
      hide: false,
      closer: false,
      sticker: false,
      destroy: true,
      stack: new PNotify.Stack({
        dir1: 'down',
        modal: true,
        firstpos1: 25,
        overlayClose: false
      }),
      modules: new Map([
        ...PNotify.defaultModules,
        [PNotifyConfirm, {
          confirm: true
        }]
      ])
    });
    notice.on('pnotify:confirm', () => this.run_remote_cmd(cmd));
    notice.on('pnotify:cancel', () => "");
  }

  send(data){
    if(data.constructor.name === "ArrayBuffer"){
      // TODO?
    }else{ // TODO: validate data
      window.parent.postMessage(data);
    }
  }
}

export class LocalReport extends Connection{
  constructor(){
    super();
    this.restart();
  }

  restart(){
    this.log = [];
    this.report = {log:this.log};
    this.dataLog = [];
    this.dataLogSizes = []
  }

  send(data){
    if(data.constructor.name === "ArrayBuffer"){
      this.dataLog.push(data)
      this.dataLogSizes.push(data.byteLength);
      this.log[this.log.length - 1]["data_log_idx"] = this.dataLog.length - 1;
    }else{ // TODO: validate data
      this.log.push(data);
    }
  }

  hashLog(){

  }

  generate_report(){
    let header = new Uint32Array(this.dataLogSizes.length + 2);
    header[0] = this.dataLogSizes.length + 2;
    let reportJson = new TextEncoder("utf-8").encode(JSON.stringify(this.report));
    header[1] = reportJson.byteLength;
    header.set(this.dataLogSizes, 2);
    let blob = new Blob([header, reportJson, this.dataLog].flat(), {type: "application/octet-stream"});
    return blob;
  }

}

export const conn = new Connection();
export const win_postmessage = new Window_postMessage();
