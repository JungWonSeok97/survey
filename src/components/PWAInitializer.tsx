'use client';

import { useEffect } from 'react';

export default function PWAInitializer() {
  useEffect(() => {
    // Service Worker 등록
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker 등록 성공:', registration);

          // 업데이트 확인
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // 새 버전이 있음을 사용자에게 알림
                  console.log('🔄 앱 업데이트 가능');
                  // 여기서 사용자에게 알림 (선택사항)
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('❌ Service Worker 등록 실패:', error);
        });
    }

    // 설치 프롬프트 처리
    let deferredPrompt: any;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      console.log('📱 PWA 설치 가능');
      // 설치 버튼을 표시할 수 있음
    });

    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA 설치됨');
      deferredPrompt = null;
    });

    // 온라인/오프라인 상태 감지
    const handleOnline = () => {
      console.log('🟢 온라인 상태');
      // 오프라인 상태에서 저장된 설문 데이터 동기화
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SYNC_DATA',
        });
      }
    };

    const handleOffline = () => {
      console.log('🔴 오프라인 상태');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return null;
}
