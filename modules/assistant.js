/*jshint esversion: 9*/

import {bus_helper} from "../extensions/devices/utils.js";

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
    this.stdio_ch = new BroadcastChannel("stdio_channel");
    this.sim_ctrl_ch = new BroadcastChannel("simulator_control");
    this.bus = bus_helper;
    this.stdio_ch.onmessage = function(e) {
      if(e.data.fh==1){
        this.stdoutBuffer += e.data.data;
      }else if(e.data.fh==2){
        this.stderrBuffer += e.data.data;
      }
    }.bind(this);

    this.sleep = (milliseconds) => {
      return new Promise(resolve => setTimeout(resolve, milliseconds));
    };

    this.run_interactive_cmd = async function(cmd, timeout=1500){
      var stdoutBufferSize = stdoutBuffer.length;
      this.stdio_ch.postMessage({fh:-1, debug:true, cmd});
      await this.sleep(timeout);
      return stdoutBuffer.slice(stdoutBufferSize);
    };

    this.get_symbol_address = async function(symbol){
      var symbols = await this.runInteractiveCmd("symbols", 5000);
      symbols = symbols.split("\n");
      for(var s in symbols){
        var f = symbols[s].split(" ");
        if((f.length == 2) && (f[0] == symbol)){
          return parseInt(f[1]);
        }
      }
      return -1;
    };

  }

  simple_equality_test(stdin, expected_output, timeout=5000){
    return async function () {
      this.set_init_STDIN(stdin);
      if(!this.run_simulator()){
        this.ui.log("No file selected");
        return false;
      }
      await this.sleep(timeout);
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

  run_simulator(debug) {
    if(codeSelector.files.length == 0){
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
    this.sim_ctrl_ch.postMessage({dst: "simulator", cmd: "add_files", files: codeSelector.files});
    var args = [];
    args.push("/working/" + codeSelector.files[0].name);
    if(enable_so_checkbox.checked) {
      args.push("--newlib");
      args.push("--setreg", `sp=${so_stack_pointer_value.value}`);
    }
    if(debug) args.push("--interactive");
    args.push("--isa", get_checked_ISAs());
    this.sim_ctrl_ch.postMessage({dst: "simulator", cmd: "start", args});
    return true;
  }

  stop_simulator(){
    this.sim_ctrl_ch.postMessage({dst:'bus', cmd: "stop_simulator"});
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

