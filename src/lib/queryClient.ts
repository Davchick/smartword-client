import { QueryClient } from '@tanstack/react-query';

/**
 * Конфигурация React Query для мобильного приложения.
 *
 * Ключевые решения:
 * - staleTime: 0 по умолчанию — данные всегда считаются устаревшими,
 *   но refetch происходит только при монтировании/фокусе, не фоном.
 * - gcTime: 10 мин — кэш живёт достаточно долго для навигации между экранами.
 * - retry: 1 — при ошибке сети пробуем 1 раз (мобильные сети нестабильны).
 * - networkMode: 'online' — запросы не уходят если устройство offline.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 10 * 60 * 1000, // 10 минут
      retry: 1,
      refetchOnWindowFocus: false, // в RN это работает через useFocusEffect
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});
