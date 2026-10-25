const CACHE = 'bible-cards-v11';
const FILES = ['./','./index.html','./manifest.json','./icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Firebase 등 바깥 통신과 GET 아닌 요청은 건드리지 않는다.
  // (예전엔 이것까지 가로채서, 통신이 끊기면 index.html을 응답으로 돌려줬다)
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  const isPage = e.request.mode === 'navigate' || url.pathname.endsWith('.html');

  if (isPage) {
    // 페이지는 네트워크 우선 — 고친 내용이 바로 반영되게.
    // 캐시 우선으로 두면 앱을 고쳐도 옛 버전이 계속 떴다.
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // 나머지(아이콘 등)는 캐시 우선
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
