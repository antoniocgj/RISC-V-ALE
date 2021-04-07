import { simulator_controller } from "../../modules/simulator.js";

export class WebTerminal{
  constructor(container, badge){
    this.stdio_ch = new BroadcastChannel("stdio_channel");
    this.sim_status_ch = new BroadcastChannel("simulator_status");
    this.container = container;
    this.firstOpen = true;
    this.term = $('#xterm-container').terminal(
      {
        whisper: function(...args) {
          simulator_controller.start_execution(args);
        },
        close: function(arg1, arg2) {
        }
      },
      {
        checkArity: false,
        prompt: '$ ',
        greetings: "Welcome to RISC-V ALE"
      }
    );
    this.term.parent = this;

    this.sim_status_ch.onmessage = function (e) {
      if(e.data.type == "status"){
        if(e.data.status.running){
          this.running_mode = true;
          if(e.data.status.debugging){
            this.term.push(function (stdin) {
              this.parent.stdio_ch.postMessage({fh:-1, debug:true, cmd:stdin});
            },
            {
              prompt: '[[;yellow;]>>> ]',
              keymap: {
                'CTRL+C': function(e, original) {
                  simulator_controller.stop_execution();
                  original();
                }, 
                'CTRL+D': function(e, original) {
                  // this.parent.sim_ctrl_ch.postMessage({dst:'bus', cmd: "stop_simulator"});
                }
              }

            }
            );
          }else{
            this.enter_input_mode();
          }
        }else if(this.running_mode){
          this.term.pop();
          this.running_mode = false;
        }
        if(e.data.status.starting_exec){
          this.term.echo(`$ whisper ${e.data.status.args.join(" ")}`);
          this.term.history().append(`whisper ${e.data.status.args.join(" ")}`);
        }
      }
    }.bind(this);

    this.stdio_ch.onmessage = function(e) {
      if(e.data.fh==1){
        this.term.echo(e.data.data);
      }else if(e.data.fh==2){
        this.term.echo(`[[;darkred;]${e.data.data}]`)
      }else if(e.data.fh == -1 && e.data.debug){
        this.term.echo("[[;yellow;]>>> ]" + e.data.cmd);
      }
    }.bind(this);
  }


  enter_input_mode(){
    this.term.push(function (stdin) {
      this.parent.stdio_ch.postMessage({fh:0, data:(stdin + "\n\0")});
    },
    {
      prompt: '',
      history: false,
      keymap: {
        'CTRL+C': function(e, original) {
          simulator_controller.stop_execution();
          original();
        }, 
        'CTRL+D': function(e, original) {
          // this.parent.sim_ctrl_ch.postMessage({dst:'bus', cmd: "stop_simulator"});
        }
      }
    }
    );
  }

  processCmd(){

  }

  openTerminal(){
    if(this.firstOpen){
      
    }

  }

  setSTDIN(value){
    this.stdio_ch.postMessage({fh:-1, init_stdin:true, data:value});
  }

  getSTDOUT(){
    
  }

  getSTDERR(){

  }

}
