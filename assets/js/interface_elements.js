/*jshint esversion: 9*/

// Notification stacks
window.stackBottomRight = new PNotify.Stack({
  dir1: 'up',
  dir2: 'left',
  firstpos1: 25,
  firstpos2: 25,
  modal: false,
  maxOpen: Infinity
});

window.stackBarTop = new PNotify.Stack({
  modal: false,
  dir1: 'down',
  firstpos1: 0,
  spacing1: 0,
  push: 'top',
  maxOpen: Infinity
});


// register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service_worker.js').then(function(reg) {
      console.log('Successfully registered service worker', reg);
      reg.addEventListener("updatefound", function () {
        let newWorker = reg.installing;
        newWorker.addEventListener("statechange", function () {
          if(newWorker.state == "installed" && navigator.serviceWorker.controller){
            const update_notice = PNotify.info({
              title: 'Update received',
              text: 'A new version of RISC-V ALE is available. Click to update.',
              sticker: false,
              delay: Infinity,
              stack: window.stackBottomRight
            });
            update_notice.refs.elem.style.cursor = 'pointer';
            update_notice.on('click', e => {
              if ([...update_notice.refs.elem.querySelectorAll('.pnotify-closer *, .pnotify-sticker *')].indexOf(e.target) !== -1) {
                return;
              }
              newWorker.postMessage({ action: 'skipWaiting' });
              update_notice.update({
                text: 'Please Wait',
                icon: 'fas fa-spinner fa-pulse',
              });
            });
          }
        })
      })
  }).catch(function(err) {
    PNotify.error({
      title: 'Service Worker',
      text: 'Error while registering service worker ' + err,
      sticker: false,
      delay: Infinity,
      stack: window.stackBottomRight
    });
  });

  let refreshing;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (refreshing) return;
    window.location.reload();
    refreshing = true;
  });
}else{
  PNotify.error({
    title: 'Service Worker',
    text: 'Failed to register Service Worker.',
    sticker: false,
    stack: window.stackBottomRight
  });
}

// check for errors

// load modules
import {MMIO_Manager} from "../../modules/mmio_manager.js";
import {WebTerminal} from "../../modules/terminal.js";
import {Assistant} from "../../modules/assistant.js";
import {simulator_controller} from "../../modules/simulator.js";
import {compiler} from "../../modules/compiler.js";
import {conn} from "../../modules/connection.js";

var mmio_manager = new MMIO_Manager();
var web_terminal = new WebTerminal(document.getElementById('xterm-container'), document.getElementById("terminal_badge"));
var assistant = new Assistant(document.getElementById('assistant_container'), document.getElementById('assistant_button'));

// load plugins

// navegation

class InterfaceNavegation{
  constructor(){
    this.tabs = ["home_tab", "hardware_tab", "os_tab", "settings_tab"];
  }

  addTab(name, icon, id, content){
    this.tabs.push(id+ "_tab");
    settings_nav_item.insertAdjacentHTML('beforebegin', `
    <li class="nav-item list-group-item pl-1 py-2">
      <a class="nav-link" href="#${id}">
          <div class="d-xl-flex flex-grow-0 align-items-xl-center"><i class="fas ${icon}"></i><span style="padding: 10px;">${name}</span></div>
      </a>
    </li>
    `);

    settings_tab.insertAdjacentHTML('beforebegin', `
    <div id="${id+ "_tab"}" class="content_area" hidden="true">
      ${content}
    </div>
    `);
  }

  hideTab(id){
    document.getElementById(id).hidden = true;
  }

  locationHashChanged(){
    this.tabs.map(this.hideTab);
    let newHash = location.hash.slice(1) + "_tab";
    if(this.tabs.includes(newHash)){
      document.getElementById(newHash).hidden = false;
    }else{
      home_tab.hidden = false;
      console.log(location.hash);
      if(location.hash.slice(0, 15) == "#select_content"){
        config.load_content(location.hash.split("=")[1]);
      }else if(location.hash.slice(0, 19) == "#select_url_content"){
        config.load_content_string(location.hash.slice(20));
      }
      location.hash = "";
    }
  }
}

export const navegation = new InterfaceNavegation();
window.onhashchange = navegation.locationHashChanged.bind(navegation);


// tables
$(function() {$('#table_devices').bootstrapTable()})
$(function() {$('#table_syscalls').bootstrapTable()})

class ConfigurationManager{
  constructor(){
    this.currentConfig = {options:{}, syscalls:{}, devices:{}}
    this.trackedOptions = {checkboxes: ["config_isaA", "config_isaC", "config_isaD", "config_isaF", "config_isaI", 
    "config_isaM", "config_isaS", "config_isaU", "enable_so_checkbox"], values: ["so_stack_pointer_value", "int_freq_range"]};
  }

  log_current_options(){
    for (const opt in this.trackedOptions.checkboxes) {
      const element = this.trackedOptions.checkboxes[opt];   
      this.currentConfig.options[element] = document.getElementById(element).checked;
    }
    for (const opt in this.trackedOptions.values) {
      const element = this.trackedOptions.values[opt];   
      this.currentConfig.options[element] = document.getElementById(element).value;
    }
  }

  add_device(name, slot){
    this.currentConfig.devices[name] = {slot: slot};
  }

  add_syscall(id, code){
    this.currentConfig.syscalls[id] = code;
  }

  remove_syscall(id){
    delete this.currentConfig.syscalls[id];
  }

  load_syscalls(){
    for (const id in this.currentConfig.syscalls) {
      const value = this.currentConfig.syscalls[id];
      simulator_controller.load_syscall(value.number, value.code);
    }
  }

  load_configuration_json(config_json){
    this.load_configuration(JSON.parse(config_json));
  }

  load_configuration(new_config){
    this.currentConfig = new_config;
    // options
    for (const opt in this.currentConfig.options) {
      if(this.trackedOptions.checkboxes.includes(opt)){
        document.getElementById(opt).checked = this.currentConfig.options[opt];   
      }else{
        document.getElementById(opt).value = this.currentConfig.options[opt];
      }
    }
    freq_change();
    // devices
    for (const name in this.currentConfig.devices) {
      mmio_manager.getSlot(name.slot);
      load_device(name, name.slot);
    }
    // syscalls
    this.load_syscalls();
  }

  get_config_json(){
    return this.currentConfig;
  }

  load_content_string(base64Data){
    var cData = LZString.decompressFromEncodedURIComponent(atob(base64Data));
    var configs = JSON.parse(cData);
    home_header.hidden = true;
    content_selection.hidden = true;
    selected_content.hidden = false;
    selected_content.insertAdjacentHTML('beforeend', `<iframe style="width:100%;height:100%" src="${configs.main_page}" frameborder="0"></iframe>`);
    assistant.setScript(configs.assistant_script);
    this.load_configuration(configs.config);
  }

  load_content(id) {
    home_header.hidden = true;
    content_selection.hidden = true;
    selected_content.hidden = false;
    fetch('./data/config.json').then(function (request) {
      request.json().then(function (configs) {
        selected_content.insertAdjacentHTML('beforeend', `<iframe style="width:100%;height:100%" src="${configs[id].main_page}" frameborder="0"></iframe>`);
        assistant.setScript(configs[id].assistant_script);
        this.load_configuration(configs[id].config);
      });
    });
  }
}

const config = new ConfigurationManager();


// utils

function download(filename, text) {
  var element = document.createElement('a');
  var url = URL.createObjectURL( new Blob( [text], {type:'text/plain'} ) );
  element.setAttribute('href', url);
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(url);
}



//

const sim_status_ch = new BroadcastChannel('simulator_status' + window.uniq_id);

sim_status_ch.onmessage = function (ev) {
  if(ev.data.type == "message"){
    let msgTypes = {success: PNotify.success, info: PNotify.info, error: PNotify.error, notice: PNotify.notice};
    var delay = 8000;
    if(ev.data.msg.delay){ 
      delay = ev.data.msg.delay;
    }
    msgTypes[ev.data.msg.type]({
      title: ev.data.msg.title,
      text: ev.data.msg.text,
      stack: window.stackBottomRight,
      delay
    });
  }
  switch (ev.data.type) {
    case "sim_log":
      // settings_tab_simulator_log.insertAdjacentHTML('beforeend', ev.data.msg + "<br>");
      break;

    case "status":
      if(ev.data.status.running){
        run_button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Stop';
        run_button.setAttribute("class", "btn btn-danger");
        run_button.style.background = "";
        run_options_selector.setAttribute("disabled", "");
        run_button.onclick = function(){
          simulator_controller.restart_simulator();
        };
        if(!($("#modal_terminal").data('bs.modal') || {})._isShown){
          $('#modal_terminal').modal({backdrop: false,show: true});
          $('#modal_terminal').draggable({handle: ".modal-header"});
          web_terminal.openTerminal();
        }
      }else if(ev.data.status.stopping || ev.data.status.finish){
        run_button.innerHTML = 'Run';
        run_button.setAttribute("class", "btn btn-outline-success");
        run_button.style.background = "#FFFFFF";
        run_options_selector.removeAttribute("disabled", "");
        run_button.onclick = function(){run_simulator(false);};
      }
      if(ev.data.status.starting){
        config.load_syscalls();
      }
      break;

    case "load_syscall":
      if(ev.data.desc){
        add_syscall_to_table(ev.data.number, ev.data.desc, ev.data.code);
      }
      break;

    case "clang_status":
      if(ev.data.status.starting){
        if(!($("#modal_terminal").data('bs.modal') || {})._isShown){
          $('#modal_terminal').modal({backdrop: false,show: true});
          $('#modal_terminal').draggable({handle: ".modal-header"});
          web_terminal.openTerminal();
        }
      }else{
        run_button.onclick = function(){run_simulator(false);};
      }
      break;

    case "load_file":
      PNotify.info({
        title: 'File Loaded',
        text: 'Name: ' + ev.data.name + '\n (' + ev.data.size + ' bytes)',
        sticker: false,
        stack: window.stackBottomRight
      });
      break;

    default:
      break;
  }
}

// upper menu

file_select_button.onclick = function () {
  document.getElementById("codeSelector").click();
} 

function load_file(){
  if(codeSelector.files.length){
    // label_codeSelector.innerHTML = codeSelector.files;
    run_button.setAttribute("class", "btn btn-outline-success");
    simulator_controller.load_files(codeSelector.files);
    compiler.set_file_array(simulator_controller.last_loaded_files);
    setTimeout(function(){
      codeSelector.value = null;
    }, 100);
    // run_button.style.background = "";
  }else{
    run_button.setAttribute("class", "btn btn-outline-secondary");
  }
};
codeSelector.onchange = load_file;

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

async function auto_compile() {
  if(!document.getElementById("auto_compile").checked) return -1;
  return await compiler.auto_compile(document.getElementById("c_ext").value, document.getElementById("asm_ext").value, document.getElementById("obj_ext").value, document.getElementById("elf_ext").value);
}

async function run_simulator(debug) {
  if(simulator_controller.last_loaded_files.length == 0){
    PNotify.notice({
      title: 'No input files',
      text: 'Select at least one input file to run or compile',
      sticker: false,
      stack: window.stackBottomRight
    });
    return false;
  }
  run_button.onclick = function () {console.log("Repeated click");};
  var filename = await auto_compile();
  if(!filename){
    for (let index = 0; index < simulator_controller.last_loaded_files.length; index++) {
      const element = simulator_controller.last_loaded_files[index];
      if(element.name.endsWith(document.getElementById("elf_ext").value)) {
        filename = element.name;
        break;
      }
    }
  }
  if(!filename) filename = simulator_controller.last_loaded_files[0].name;
  var args = [];
  args.push('/' + filename.replace(" ", "_"));
  if(enable_so_checkbox.checked) {
    args.push("--newlib");
    args.push("--setreg", `sp=${so_stack_pointer_value.value}`);
  }
  if(debug) args.push("--interactive");
  args.push("--isa", get_checked_ISAs());
  simulator_controller.start_execution(args);
}

run_button.onclick = function(){run_simulator(false);};
run_with_debug_button.onclick = function(){run_simulator(true);};

// terminal

terminal_button.onclick = function(){
  $('#modal_terminal').modal({backdrop: false,show: true});
  $('#modal_terminal').draggable({handle: ".modal-header"});
  web_terminal.openTerminal();
}
 
assistant_button.onclick = function () {
  $('#modal_assistant').modal({backdrop: false,show: true});
  $('#modal_assistant').draggable({handle: ".modal-header"});
}


// home tab

function load_content_from_json(list, item_list) {
  for (const item in item_list) {
    const element = item_list[item];
    let params = element.params?element.params:"";
    var code = `
    <li class="list-group-item">
      <div class="card">
          <div class="card-body">
              <h4 class="card-title">${element.title}</h4>
              <h6 class="text-muted card-subtitle mb-2">${element.subtitle}</h6>
              <p class="card-text">${element.text}</p><a class="card-link" ${params} href="${element.link1}">${element.option1}</a><a class="card-link" ${params} href="${element.link2}">${element.option2}</a></div>
      </div>
    </li>
    ` 
    list.insertAdjacentHTML('beforeend',code);
  }
}

fetch('./data/home.json').then(function (request) {
  request.json().then(function (home_contents) {
    load_content_from_json(home_tab_tutorials_list, home_contents.tutorials);
    load_content_from_json(home_tab_resources_list, home_contents.resources);
  });
});

// hardware tab

function freq_change() {
  let value = int_freq_range.value;
  if(value == 0){
    int_freq_range_indicator.innerHTML = "1/∞";
  }else{
    int_freq_range_indicator.innerHTML = "1/2<sup>"+ (32 - value) +"</sup>";
  }
  simulator_controller.set_int_freq_scale_limit(value);
}
int_freq_range.onchange = freq_change;

window.load_device = async function (name, slot){
  if(slot == undefined){
    slot = mmio_manager.getFreeSlot();
  }
  document.getElementById("mapped_devices_table").insertAdjacentHTML('beforeend', 
    `<tr>
    <td>0xFFFF${slot.toString(16).padStart(4, '0')} - <br />0xFFFF${(slot + mmio_manager.slot_size).toString(16).padStart(4, '0')}<br /><br /></td>
    <td>${name}</td>
    </tr>
    `
  );
  const module = await import("../../extensions/devices/" + name);
  config.add_device(name, slot);
  module.default.setBaseAddress(slot);
}

window.device_action_formatter = function(value) {
  return `<a onclick="window.load_device('${value}');this.hidden = true;"><i class="material-icons pointer">add</i></a>`;
}

// os tab

window.load_syscall = function(value) {
  value = JSON.parse(unescape(value));
  if(document.getElementById(`syscall_checkbox-${value.number}`).checked){
    simulator_controller.load_syscall(value.number, value.code);
    config.add_syscall(value.number, value);
  }else{
    simulator_controller.remove_syscall(value.number);
    config.remove_syscall(value.number);
  }
}

function add_syscall_to_table(number, desc, code) {
  var rowId = $("#table_syscalls >tbody >tr").length;
  rowId = 0// rowId + 1;
  $('#table_syscalls').bootstrapTable('insertRow',{
      index: rowId,
      row: {
        "number": number,
        "desc": desc,
        "action": {builtin: false, number, code, checked:"checked"}
      }
  });
}

window.syscall_action_formatter = function(value) {
  if(value.builtin){
    return `<div class="custom-control custom-control-inline disabled custom-switch"><input type="checkbox" class="custom-control-input" id="syscall_checkbox-${value.number}" checked disabled /><label class="custom-control-label" for="syscall_checkbox-${value.number}"></label></div>`;
  }
  return `<div class="custom-control custom-control-inline disabled custom-switch" onchange="window.load_syscall('${escape(JSON.stringify(value))}');"><input type="checkbox" class="custom-control-input" id="syscall_checkbox-${value.number}" ${value.checked}/><label class="custom-control-label" for="syscall_checkbox-${value.number}"></label></div>`;
}

os_tab_stdio_refresh.onclick = function() {
  if(os_tab_stdin_radio.checked){
    web_terminal.setSTDIN(os_tab_stdio_textarea.value)
    PNotify.info({
      title: 'Text loaded to STDIN',
      text: `${os_tab_stdio_textarea.value.length} chars loaded.`,
      sticker: false,
      stack: window.stackBottomRight
    });
  }else if(os_tab_stdout_radio.checked){
    os_tab_stdio_textarea.value = web_terminal.getSTDOUT()
  }else{
    os_tab_stdio_textarea.value = web_terminal.getSTDERR()
  }
}.bind(this);

os_tab_stdin_radio.onchange = function () {
  if(os_tab_stdin_radio.checked){
    os_tab_stdio_upload.removeAttribute("disabled", "");
  }else{
    os_tab_stdio_upload.setAttribute("disabled", "");
  }
}

os_tab_stdio_upload.onclick = function () {
  stdio_file_input.click();
}

stdio_file_input.onchange = function() {
  if(stdio_file_input.files.length){
    var file = stdio_file_input.files[0];
    var reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    reader.onload = function (evt) {
      os_tab_stdio_textarea.value = evt.target.result;
    };
    reader.onerror = function (evt) {
      console.log("error reading file", evt);
    };
  }
}

os_tab_stdio_download.onclick = function() {
  download("stdio.txt", os_tab_stdio_textarea.value);
}

// tab settings_tab_simulator_log

function generate_config_link(){
  config.log_current_options();
  const conf = config.get_config_json();
  if(conf_export_assistant_script.files.length){
    var file = conf_export_assistant_script.files[0];
    var reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    reader.onload = function (evt) {
      settings_tab_conf_export_desc.value = location.origin + location.pathname + "#select_url_content=" + btoa(LZString.compressToEncodedURIComponent(JSON.stringify({main_page: conf_export_desc_url.value, assistant_script: evt.target.result, config: conf})));
    }.bind(this);
    reader.onerror = function (evt) {
      console.log("error reading file", evt);
    };
  }else{
    settings_tab_conf_export_desc.value = location.origin + location.pathname + "#select_url_content=" + btoa(LZString.compressToEncodedURIComponent(JSON.stringify({main_page: conf_export_desc_url.value, assistant_script: "", config: conf})));
  }
}

settings_tab_conf_generate.onclick = generate_config_link;

settings_tab_conf_export.onclick = function () {
  generate_config_link();
  navigator.clipboard.writeText(settings_tab_conf_export_desc.value).then(function() {
    PNotify.info({
      title: 'Link copied to clipboard',
      sticker: false,
      stack: window.stackBottomRight
    });
  }, function(err) {
    console.error('Could not copy text: ', err);
  });
}

navegation.locationHashChanged();
load_file();
freq_change();