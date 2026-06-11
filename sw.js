const CACHE_NAME = 'pccs-toolbox-v1.0.0';
const LOCAL_ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

let sharedFile = null;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(LOCAL_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  let url;
  try { url = new URL(e.request.url); } catch(_) { return; }

  // Share target
  if (e.request.method === 'POST' && url.searchParams.get('share-target') === '1') {
    e.respondWith(
      e.request.formData().then(fd => {
        const file = fd.get('pdf') || fd.get('file');
        if (file) sharedFile = file;
        return Response.redirect('/index.html?share-target=1', 303);
      }).catch(() => Response.redirect('/index.html', 303))
    );
    return;
  }

  // GET_SHARED_FILE message
  if (e.data && e.data.type === 'GET_SHARED_FILE') {
    if (sharedFile) {
      e.source.postMessage({ type: 'SHARED_FILE', file: sharedFile });
      sharedFile = null;
    }
    return;
  }

  // Cache strategy
  if (url.origin !== location.origin) {
    e.respondWith(
      fetch(e.request).then(r => {
        if (r && r.ok) caches.open(CACHE_NAME).then(c => c.put(e.request, r.clone()));
        return r;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(c => c || fetch(e.request)).catch(() => fetch(e.request))
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'GET_SHARED_FILE') {
    if (sharedFile) {
      e.source.postMessage({ type: 'SHARED_FILE', file: sharedFile });
      sharedFile = null;
    }
  }
});
