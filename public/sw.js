// 서비스 워커 설정
const CACHE_NAME = 'survey-app-v4';
const urlsToCache = [
  '/',
  '/survey',
  '/offline.html',
];

// 설치 이벤트
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('✅ Service Worker 캐시 생성');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting(); // 즉시 활성화
});

// 활성화 이벤트
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ 오래된 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch 이벤트 - Cache First Strategy (API 제외)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API 요청은 네트워크 우선
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 성공한 응답만 캐싱
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // 네트워크 실패 시 캐시에서 가져오기
          return caches.match(request).then((response) => {
            return response || new Response('오프라인 상태입니다', { status: 503 });
          });
        })
    );
  } else {
    // HTML 페이지는 네트워크 우선 (항상 최신 버전)
    if (request.headers.get('accept').includes('text/html')) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
            return response;
          })
          .catch(() => {
            return caches.match(request).then((response) => {
              return response || caches.match('/offline.html');
            });
          })
      );
    } else {
      // 정적 리소스는 캐시 우선
      event.respondWith(
        caches.match(request).then((response) => {
          return response || fetch(request).then((response) => {
            // 성공한 응답만 캐싱
            if (!response || response.status !== 200) {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });

            return response;
          });
        })
      );
    }
  }
});

// 백그라운드 동기화 (오프라인에서 설문 저장 후 온라인 복귀 시 자동 전송)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-survey') {
    event.waitUntil(syncSurveyData());
  }
});

async function syncSurveyData() {
  try {
    // IndexedDB에서 저장된 설문 데이터 가져오기
    const db = await openDatabase();
    const surveys = await getAllFromIndexedDB(db, 'pending-surveys');

    for (const survey of surveys) {
      try {
        const response = await fetch('/api/survey', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(survey),
        });

        if (response.ok) {
          // 성공하면 IndexedDB에서 삭제
          await deleteFromIndexedDB(db, 'pending-surveys', survey.id);
        }
      } catch (error) {
        console.error('설문 동기화 실패:', error);
      }
    }
  } catch (error) {
    console.error('백그라운드 동기화 오류:', error);
  }
}

// IndexedDB 헬퍼 함수
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('survey-db', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-surveys')) {
        db.createObjectStore('pending-surveys', { keyPath: 'id' });
      }
    };
  });
}

function getAllFromIndexedDB(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deleteFromIndexedDB(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
