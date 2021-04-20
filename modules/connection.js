import {simulator_controller} from "./simulator.js";

class Window_postMessage{
  constructor(isTrusted=false){
    this.isTrusted = isTrusted;
    window.onmessage = this.msg_handle.bind(this);
  }

  msg_handle(msg){
    if(this.isTrusted){ 
      conn.run_remote_cmd(msg.data.cmd); 
    }else{
      var operation = conn.operations[msg.data.cmd.op];
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
    notice.on('pnotify:confirm', () => conn.run_remote_cmd(cmd));
    notice.on('pnotify:cancel', () => "");
  }
}


export class Connection{
  constructor(){
    this.wpm = new Window_postMessage();
    this.operations = {"load_file": {desc: "Load file", f: this.load_file_from_base64}}
  }

  run_remote_cmd(cmd){
    this.operations[cmd.op].f(cmd.params);
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
  }
}

export const conn = new Connection();