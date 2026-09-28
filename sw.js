/* NICK-VERSE Scanner: offline service worker.
   Network-first for pages (so updates arrive promptly), cache-first for versioned assets.
   Cross-origin requests (Open-Meteo weather, Tesseract.js CDN) are never cached or intercepted. */
const VERSION = '10.0.0';
const CACHE = 'nickverse-scanner-v10';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/util.js', './js/audio.js', './js/background.js', './js/sensors.js', './js/jarvis.js', './js/camera.js', './js/modules.js', './js/light.js', './js/cinco.js',
  './js/optics.js', './js/detect.js', './js/sky.js', './js/hotline.js', './js/badges.js', './js/voice.js', './js/tools.js', './js/app.js',
  './fonts/Orbitron-Variable.ttf', './fonts/Rajdhani-Medium.ttf', './fonts/Rajdhani-SemiBold.ttf', './fonts/ShareTechMono-Regular.ttf',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(ASSETS.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('nickverse-scanner-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data === 'version' && e.source) e.source.postMessage({ version: VERSION, cache: CACHE }); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copy)); } return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || caches.match(req, { ignoreSearch: true })).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
