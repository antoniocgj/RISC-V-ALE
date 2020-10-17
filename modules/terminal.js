export class WebTerminal{
  constructor(container, badge){
    this.stdio_ch = new BroadcastChannel("stdio_channel");
    this.sim_ctrl_ch = new BroadcastChannel("simulator_control");
    this.container = container;
    this.firstOpen = true;
    this.term = $('#xterm-container').terminal(
      {
        whisper: function(...args) {
          this.parent.sim_ctrl_ch.postMessage({dst: "simulator", cmd: "start", args});
        },
        close: function(arg1, arg2) {
        }
      },
      {
        checkArity: false,
        prompt: '$ ',
        greetings: "Welcome to RISC-V ALE!"
      }
    );
    this.term.parent = this;

    this.sim_ctrl_ch.onmessage = function (e) {
      if(e.data.dst == "interface"){
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
                    this.parent.sim_ctrl_ch.postMessage({dst:'bus', cmd: "stop_simulator"});
                    original();
                  }, 
                  'CTRL+D': function(e, original) {
                    this.parent.sim_ctrl_ch.postMessage({dst:'bus', cmd: "stop_simulator"});
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
        }
      }else if(e.data.dst == "simulator" && e.data.cmd=="start"){
        this.term.echo(`$ whisper ${e.data.args.join(" ")}`);
        this.term.history().append(`whisper ${e.data.args.join(" ")}`);
      }
    }.bind(this);

    this.stdio_ch.onmessage = function(e) {
      if(e.data.fh==1){
        this.term.echo(e.data.data);
      }else if(e.data.fh==2){
        this.term.echo(`[[;darkred;]${e.data.data}]`)
      }
    }.bind(this);
  }


  enter_input_mode(){
    this.term.push(function (stdin) {
      this.parent.stdio_ch.postMessage({fh:0, data:stdin});
    },
    {
      prompt: '',
      history: false,
      keymap: {
        'CTRL+C': function(e, original) {
          this.parent.sim_ctrl_ch.postMessage({dst:'bus', cmd: "stop_simulator"});
          original();
        }, 
        'CTRL+D': function(e, original) {
          this.parent.sim_ctrl_ch.postMessage({dst:'bus', cmd: "stop_simulator"});
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

  setSTDIN(){

  }

  getSTDOUT(){

  }

  getSTDERR(){

  }

}
