/**
 * useNetworkStatus — хук для определения состояния сети.
 * Использует React Query onlineManager + Reachability API.
 * НЕ требует @react-native-community/netinfo.
 */

import { useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { onlineManager } from '@tanstack/react-query';

interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
}

/**
 * Проверяет доступность сети через fetch к надёжному endpoint.
 * Fallback: если onlineManager говорит что онлайн — считаем что онлайн.
 */
async function checkNetwork(): Promise<boolean> {
  // Если React Query говорит что офлайн — сразу возвращаем
  if (!onlineManager.isOnline()) return false;

  // Быстрая проверка через fetch
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    // Пытаемся достучаться до надёжного endpoint
    const response = await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok || response.status === 204;
  } catch {
    return false;
  }
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(onlineManager.isOnline());

  useEffect(() => {
    // Подписываемся на изменения onlineManager
    const unsubscribe = onlineManager.subscribe(() => {
      setIsOnline(onlineManager.isOnline());
    });

    // Периодическая проверка каждые 30 сек
    const interval = setInterval(async () => {
      const online = await checkNetwork();
      setIsOnline(online);
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Перепроверка при возврате приложения из background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        (async () => {
          const online = await checkNetwork();
          setIsOnline(online);
        })();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  return { isOnline, isOffline: !isOnline };
}
