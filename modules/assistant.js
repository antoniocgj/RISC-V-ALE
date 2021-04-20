/*jshint esversion: 9*/

import {bus_helper} from "../extensions/devices/utils.js";
import { simulator_controller } from "../../modules/simulator.js";


export class UI_Helper{
  constructor(intro){
    this.tests = []
    this.item_log = ""
    document.getElementById("assistant_intro").innerHTML = intro;
    document.getElementById("assistant_run_button").onclick = this.runTests.bind(this);
    this.sleep = (milliseconds) => {
      return new Promise(resolve => setTimeout(resolve, milliseconds));
    };
  }

  add_test(desc, f){
    const itemID = this.tests.length;
    document.getElementById("assistant_test_list").insertAdjacentHTML("beforeend", `
    <li>${desc} <span id=assistant_item_${itemID}></span></li>
    `)
    this.tests.push(f);
  }

  async runTests(){
    for (const t in this.tests) {
      const html_item = document.getElementById(`assistant_item_${t}`);
      this.item_log = "";
      html_item.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Running ...`;
      if(await this.tests[t]()){
        html_item.setAttribute("class", "pointer");
        html_item.setAttribute("onclick", `alert(unescape("${escape(this.item_log)}"))`);
        html_item.style.color = "darkgreen";
        html_item.innerHTML = "Pass";
      }else{
        html_item.setAttribute("class", "pointer");
        html_item.style.color = "darkred";
        html_item.style["font-weight"] = "bold";
        html_item.setAttribute("onclick", `alert(unescape("${escape(this.item_log)}"))`);
        html_item.innerHTML = "Failed";
      }
      await this.sleep(1000);
    }
  }

  log(msg){
    this.item_log += msg + "\n";
  }
}

export class Assistant_Script{
  constructor(){
    this.stdio_ch = new BroadcastChannel("stdio_channel" + window.uniq_id );
    this.sim_ctrl_ch = new BroadcastChannel("simulator_control" + window.uniq_id );
    this.bus = bus_helper;
    this.stdioCallback = undefined;
    this.stdio_ch.onmessage = function(e) {
      if(this.stdioCallback) this.stdioCallback();
      if(e.data.fh==1){
        this.stdoutBuffer += e.data.data+"\n";
      }else if(e.data.fh==2){
        this.stderrBuffer += e.data.data+"\n";
      }
    }.bind(this);

    this.sleep = (milliseconds) => {
      return new Promise(resolve => setTimeout(resolve, milliseconds));
    };

    this.run_interactive_cmd = async function(cmd, timeout=1500){
      var stdoutBufferSize = this.stdoutBuffer.length;
      this.stdio_ch.postMessage({fh:-1, debug:true, cmd});
      await this.wait_for_output({timeout});
      await this.sleep(500);
      return this.stdoutBuffer.slice(stdoutBufferSize);
    };

    this.wait_for_output = async function({msg="", size=1, fh=1, timeout=5000, bufferStart=0} = {}) {
      return new Promise(resolve =>{
        this.stdioCallback = function () {
          var stdioHandler = [this.stdoutBuffer, this.stderrBuffer][fh - 1]; 
          if(stdioHandler.slice(bufferStart).includes(msg) && (stdioHandler.length - bufferStart >= size)) resolve();
        }.bind(this);
        setTimeout(resolve, timeout);
      });
    }

    this.get_symbol_address = async function(symbol){
      var symbols = await this.run_interactive_cmd("symbols", 5000);
      symbols = symbols.split("\n");
      for(var s in symbols){
        var f = symbols[s].split(" ");
        if((f.length == 2) && (f[0] == symbol)){
          return parseInt(f[1]);
        }
      }
      return -1;
    };

    this.get_symbols = async function(){
      var symbols = await this.run_interactive_cmd("symbols", 5000);
      symbols = symbols.split("\n");
      var symList = {};
      for(var s in symbols){
        var f = symbols[s].split(" ");
        if((f.length == 2)){
          symList[f[0]] = parseInt(f[1]);
        }
      }
      return symList;
    };

  }

  simple_equality_test(stdin, expected_output, timeout=5000){
    return async function () {
      this.set_init_STDIN(stdin);
      if(!(await this.run_simulator())){
        this.ui.log("No file selected");
        return false;
      }
      await this.wait_for_output({size:expected_output.length, timeout});
      console.log(this.stdoutBuffer);
      const result = this.stdoutBuffer.trim();
      this.ui.log(`Input: ${stdin.slice(0,-2)} Expected: ${expected_output} Result: ${result}`);
      this.stop_simulator();
      if(result == `${expected_output}`){
        return true;
      }else{
        return false;
      }
    }.bind(this);
  }

  async run_simulator(debug) {
    if(!simulator_controller.last_loaded_files){
      return false;
    }

    function get_checked_ISAs(){
      var ISAs = "";
      if(document.getElementById("config_isaA").checked) ISAs += "a";
      if(document.getElementById("config_isaC").checked) ISAs += "c";
      if(document.getElementById("config_isaD").checked) ISAs += "d";
      if(document.getElementById("config_isaF").checked) ISAs += "f";
      if(document.getElementById("config_isaI").checked) ISAs += "i";
      if(document.getElementById("config_isaM").checked) ISAs += "m";
      if(document.getElementById("config_isaS").checked) ISAs += "s";
      if(document.getElementById("config_isaU").checked) ISAs += "u";
      return ISAs;
    }

    // assistant history
    this.stdoutBuffer = "";
    this.stderrBuffer = "";
    this.unityLog = "";
    this.unityLastLog = "";
    // start sim
    let filename = simulator_controller.last_loaded_files[0].name;
    var args = [];
    args.push('/' + filename.replace(" ", "_"));
    if(enable_so_checkbox.checked) {
      args.push("--newlib");
      args.push("--setreg", `sp=${so_stack_pointer_value.value}`);
    }
    if(debug) args.push("--interactive");
    args.push("--isa", get_checked_ISAs());
    simulator_controller.start_execution(args);
    this.wait_for_output({msg: "Calling stub instead of sigaction", fh:2});
    return true;
  }

  stop_simulator(){
    simulator_controller.stop_execution();
  }

  send_STDIN(value){
    this.stdio_ch.postMessage({fh:0, data:value});
  }

  set_init_STDIN(value){
    this.stdio_ch.postMessage({fh:-1, init_stdin:true, data:value});
  }
  
}

export class Assistant{
  constructor(container, button){
    this.button = button;
  }

  loadScript(content) {
    var script = document.createElement('script');
    script.type = "module";
    var prior = document.getElementsByTagName('script')[0];
    script.async = 1;
    script.innerHTML = content;
    // script.src = source;
    prior.parentNode.insertBefore(script, prior);
  }

  setScript(encodedJs){
    if(encodedJs == "") return;
    this.loadScript(encodedJs);
  }

}

