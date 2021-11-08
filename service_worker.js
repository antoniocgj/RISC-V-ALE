/*jshint esversion: 9 */

var cacheName = 'RISC-V_ALE_v0.2:196';
var urlsToCache = ['./', './code_test.html', './index.html', './LICENSE', './manifest.json', './README.md', './assets/bootstrap/css/bootstrap.min.css', './assets/bootstrap/js/bootstrap.min.js', './assets/css/BrightTheme.css', './assets/css/jquery.terminal.min.css', './assets/css/Material.css', './assets/css/noty.css', './assets/css/PNotify.css', './assets/css/PNotifyConfirm.css', './assets/css/styles.css', './assets/css/Top--Right--Left-Navigation-by-Jigar-Mistry.css', './assets/css/Vertical-Left-SideBar-by-Jigar-Mistry.css', './assets/fonts/fa-brands-400.eot', './assets/fonts/fa-brands-400.svg', './assets/fonts/fa-brands-400.ttf', './assets/fonts/fa-brands-400.woff', './assets/fonts/fa-brands-400.woff2', './assets/fonts/fa-regular-400.eot', './assets/fonts/fa-regular-400.svg', './assets/fonts/fa-regular-400.ttf', './assets/fonts/fa-regular-400.woff', './assets/fonts/fa-regular-400.woff2', './assets/fonts/fa-solid-900.eot', './assets/fonts/fa-solid-900.svg', './assets/fonts/fa-solid-900.ttf', './assets/fonts/fa-solid-900.woff', './assets/fonts/fa-solid-900.woff2', './assets/fonts/fontawesome-all.min.css', './assets/fonts/material-icons.min.css', './assets/fonts/MaterialIcons-Regular.eot', './assets/fonts/MaterialIcons-Regular.svg', './assets/fonts/MaterialIcons-Regular.ttf', './assets/fonts/MaterialIcons-Regular.woff', './assets/fonts/MaterialIcons-Regular.woff2', './assets/img/logo_circle.png', './assets/img/logo_square.png', './assets/img/Standard-White_2.png', './assets/img/Standard_2.png', './assets/img/Standard_2ALE.png', './assets/js/bootstrap-table.min.js', './assets/js/bs-init.js', './assets/js/interface_elements.js', './assets/js/jquery-ui.min.js', './assets/js/jquery.min.js', './assets/js/jquery.terminal.min.js', './assets/js/lz-string.min.js', './assets/js/noty.min.js', './assets/js/PNotify.js', './assets/js/PNotifyConfirm.js', './assets/js/xterm-addon-fit.min.js', './assets/js/xterm.min.js', './assets/js/z-worker.js', './assets/js/zip.min.js', './data/config.json', './data/devices.json', './data/home.json', './data/syscalls.json', './data/html/calculator.html', './data/html/calculator.js', './data/html/getting_started.html', './data/html/hello.x', './extensions/README.md', './extensions/devices/canvas.js', './extensions/devices/cleaner_robot.js', './extensions/devices/general_purpose_timer.js', './extensions/devices/midi_synthesizer.js', './extensions/devices/self_driving_car.js', './extensions/devices/serial_port.js', './extensions/devices/uoli_robot.js', './extensions/devices/utils.js', './extensions/devices/dependencies/webaudio-tinysynth.js', './extensions/devices/dependencies/roomba-unity/index.html', './extensions/devices/dependencies/roomba-unity/Build/build.data.unityweb', './extensions/devices/dependencies/roomba-unity/Build/build.json', './extensions/devices/dependencies/roomba-unity/Build/build.wasm.code.unityweb', './extensions/devices/dependencies/roomba-unity/Build/build.wasm.framework.unityweb', './extensions/devices/dependencies/roomba-unity/Build/UnityLoader.js', './extensions/devices/dependencies/roomba-unity/TemplateData/favicon.ico', './extensions/devices/dependencies/roomba-unity/TemplateData/fullscreen.png', './extensions/devices/dependencies/roomba-unity/TemplateData/progressEmpty.Dark.png', './extensions/devices/dependencies/roomba-unity/TemplateData/progressEmpty.Light.png', './extensions/devices/dependencies/roomba-unity/TemplateData/progressFull.Dark.png', './extensions/devices/dependencies/roomba-unity/TemplateData/progressFull.Light.png', './extensions/devices/dependencies/roomba-unity/TemplateData/progressLogo.Dark.png', './extensions/devices/dependencies/roomba-unity/TemplateData/progressLogo.Light.png', './extensions/devices/dependencies/roomba-unity/TemplateData/style.css', './extensions/devices/dependencies/roomba-unity/TemplateData/UnityProgress.js', './extensions/devices/dependencies/roomba-unity/TemplateData/webgl-logo.png', './extensions/devices/dependencies/self_driving_car_unity/index.html', './extensions/devices/dependencies/self_driving_car_unity/Build/self_driving_car_unity.data', './extensions/devices/dependencies/self_driving_car_unity/Build/self_driving_car_unity.framework.js', './extensions/devices/dependencies/self_driving_car_unity/Build/self_driving_car_unity.loader.js', './extensions/devices/dependencies/self_driving_car_unity/Build/self_driving_car_unity.wasm', './extensions/devices/dependencies/self_driving_car_unity/TemplateData/favicon.ico', './extensions/devices/dependencies/self_driving_car_unity/TemplateData/fullscreen-button.png', './extensions/devices/dependencies/self_driving_car_unity/TemplateData/progress-bar-empty-dark.png', './extensions/devices/dependencies/self_driving_car_unity/TemplateData/progress-bar-empty-light.png', './extensions/devices/dependencies/self_driving_car_unity/TemplateData/progress-bar-full-dark.png', './extensions/devices/dependencies/self_driving_car_unity/TemplateData/progress-bar-full-light.png', './extensions/devices/dependencies/self_driving_car_unity/TemplateData/style.css', './extensions/devices/dependencies/self_driving_car_unity/TemplateData/unity-logo-dark.png', './extensions/devices/dependencies/self_driving_car_unity/TemplateData/unity-logo-light.png', './extensions/devices/dependencies/self_driving_car_unity/TemplateData/webgl-logo.png', './extensions/devices/dependencies/uoli-unity/index.html', './extensions/devices/dependencies/uoli-unity/Build/build.data.unityweb', './extensions/devices/dependencies/uoli-unity/Build/build.json', './extensions/devices/dependencies/uoli-unity/Build/build.wasm.code.unityweb', './extensions/devices/dependencies/uoli-unity/Build/build.wasm.framework.unityweb', './extensions/devices/dependencies/uoli-unity/Build/UnityLoader.js', './extensions/devices/dependencies/uoli-unity/TemplateData/favicon.ico', './extensions/devices/dependencies/uoli-unity/TemplateData/fullscreen.png', './extensions/devices/dependencies/uoli-unity/TemplateData/progressEmpty.Dark.png', './extensions/devices/dependencies/uoli-unity/TemplateData/progressEmpty.Light.png', './extensions/devices/dependencies/uoli-unity/TemplateData/progressFull.Dark.png', './extensions/devices/dependencies/uoli-unity/TemplateData/progressFull.Light.png', './extensions/devices/dependencies/uoli-unity/TemplateData/progressLogo.Dark.png', './extensions/devices/dependencies/uoli-unity/TemplateData/progressLogo.Light.png', './extensions/devices/dependencies/uoli-unity/TemplateData/style.css', './extensions/devices/dependencies/uoli-unity/TemplateData/UnityProgress.js', './extensions/devices/dependencies/uoli-unity/TemplateData/webgl-logo.png', './modules/assistant.js', './modules/clang.js', './modules/clang.wasm', './modules/clang_worker.js', './modules/compiler.js', './modules/connection.js', './modules/ld.lld.js', './modules/LICENSE_clang_lld', './modules/LICENSE_whisper', './modules/lld.wasm', './modules/mmio_manager.js', './modules/simulator.js', './modules/simulator_worker.js', './modules/terminal.js', './modules/whisper.js', './modules/whisper.wasm'];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(cacheName).then(function(cache) {
      return cache.addAll(urlsToCache).then(function() {
        //self.skipWaiting();
      });
    })
  );
});

self.addEventListener('activate', event => {
  // delete any caches that aren't cacheName
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
    keys.map(key => {
      if (cacheName != key) {
        return caches.delete(key);
      }
    })
    )).then(() => {
      // console.log('V2 now ready to handle fetches!');
    })
  );
});


self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) {
        // cache hit
        return response;
      }
      // cache miss
      return fetch(event.request).catch(function(err) {       // fallback mechanism
        console.log("Fail to fetch", event.request, err);
      });
    })
  );
});

self.addEventListener('message', function (event) {
  if (event.data.action === 'skipWaiting') {
    console.log("skip waiting");
    self.skipWaiting();
  }
});