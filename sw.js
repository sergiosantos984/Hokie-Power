/* RepIQ — offline cache and phone notifications (Release 4).
   • The page, scripts, fonts and icons open instantly from the saved copy and are refreshed in the background,
     so a new upload shows the next time the app is opened (and everything works offline).
   • Account data (supabase.co) is never cached.
   • Push: shows the reminder; tapping it opens or focuses the app on the right screen. */
const V = 'hp-20261028-2114';
const CORE = ['./', './index.html', './config.js', './manifest.webmanifest', './icon-192.png', './icon-180.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => null)))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('hp-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const isPage = (req, u) => req.mode === 'navigate' || (u.origin === location.origin && (/\/$|\.html$|config\.js$/.test(u.pathname)));
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (/supabase\.(co|in)$/.test(u.hostname) || u.pathname.includes('/functions/v1/')) return;
  // the page opens instantly from the saved copy, and the latest version is fetched in the background for next time
  // (offline it keeps working); fonts, scripts and icons the same way
  if (isPage(req, u) || u.origin === location.origin || /(^|\.)unpkg\.com$|(^|\.)jsdelivr\.net$|^fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    const page = isPage(req, u);
    e.respondWith(caches.open(V).then(c => c.match(req, { ignoreSearch: page }).then(hit => {
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; })
        .catch(() => hit || (page ? c.match('./index.html').then(m => m || c.match('./')) : undefined));
      if (hit) { e.waitUntil(net.catch(() => null)); return hit; }
      return net;
    })));
  }
});
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'RepIQ', { body: d.body || '', tag: d.tag || undefined, renotify: !!d.tag, icon: 'icon-192.png', badge: 'icon-192.png', data: { url: d.url || './' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope);
  const go = url.searchParams.get('go') || '';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    const w = ws.find(x => x.url.startsWith(self.registration.scope));
    if (w) { w.postMessage({ go }); return w.focus(); }
    return self.clients.openWindow(url.href);
  }));
});
