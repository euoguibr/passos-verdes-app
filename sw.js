// Service worker: deixa o app instalável, abre com internet ruim e mostra os avisos.
const CACHE = 'pv-v12';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/logo.png', '/icons/icon-192.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  // Sempre tenta a versão mais nova; usa a guardada só se estiver sem internet.
  e.respondWith(
    fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('/')))
  );
});

// Avisos
self.addEventListener('push', e => {
  let p = {};
  try { const j = e.data ? e.data.json() : {}; p = j.data || j.notification || j; } catch (err) { p = { body: e.data ? e.data.text() : '' }; }
  const title = p.title || 'Passos Verdes';
  e.waitUntil(self.registration.showNotification(title, {
    body: p.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: p.tag || undefined,
    data: { url: p.url || '/' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || '/', self.location.origin).href;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (new URL(c.url).origin === self.location.origin) {
        try { await c.navigate(target); } catch (err) {}
        return c.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
