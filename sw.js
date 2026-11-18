/* يخلي مدار يشتغل بدون نت: يحفظ ملفات التطبيق في الجهاز */
const CACHE = 'saeed-v2';
const FILES = [
  './', 'index.html', 'css/style.css', 'css/layout.css', 'css/sky.css', 'css/calendar.css', 'css/theme.css', 'js/sky.js', 'js/parser.js', 'js/prayer.js', 'js/store.js', 'js/sync.js', 'js/app.js', 'js/fonts.js', 'js/theme.js', 'js/custom.js', 'manifest.webmanifest',
  'assets/img/icon-180.png', 'assets/img/icon-192.png', 'assets/img/icon-512.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k.startsWith('saeed-')).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // شعارات الفرق: تنحفظ أول مرة وبعدها تطلع بدون نت
  if (url.hostname === 'a.espncdn.com' || url.hostname === 'cdnjs.cloudflare.com') {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res;
    })));
    return;
  }
  if (url.origin !== location.origin) return;
  // النت أولاً (عشان التحديثات توصلك)، وإذا ما فيه نت → النسخة المحفوظة
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow('./')));
});
