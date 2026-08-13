/* 서재 — 서비스 워커
   앱 껍데기(HTML·CSS·JS)만 캐시합니다.
   책 파일과 색인은 IndexedDB 가 따로 맡습니다. */

/* 고칠 때마다 이 번호를 올리면 옛 캐시가 버려집니다 */
const V = 'ebl-v15b';
const SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);

  // 구글 API·드라이브·Apps Script 는 절대 캐시하지 않습니다
  if (u.hostname.endsWith('googleapis.com') ||
      u.hostname.endsWith('google.com') ||
      u.hostname.endsWith('googleusercontent.com')) return;

  if (e.request.method !== 'GET') return;

  // 앱 껍데기: 캐시 우선, 없으면 네트워크
  if (u.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(V).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html')))
    );
    return;
  }

  // CDN(epub.js 등): 네트워크 우선, 실패하면 캐시
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(V).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request))
  );
});
