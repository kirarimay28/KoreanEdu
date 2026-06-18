self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // 페이지 탐색 요청 → 항상 네트워크에서 fresh로 가져옴
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // 해시 포함 assets → 캐시 우선 (변경되면 파일명 바뀌므로 안전)
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.open('static-v1').then(cache =>
        cache.match(e.request).then(cached =>
          cached || fetch(e.request).then(res => {
            cache.put(e.request, res.clone());
            return res;
          })
        )
      )
    );
    return;
  }
});
