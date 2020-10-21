/*jshint esversion: 9 */

var cacheName = 'RISC-V_ALE_v0.2:4';
var urlsToCache = [ ];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(cacheName).then(function(cache) {
      return cache.addAll(urlsToCache).then(function() {
        self.skipWaiting();
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
      return fetch(event.request);
    })
  );
});