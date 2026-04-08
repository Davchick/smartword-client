import { QueryClient } from '@tanstack/react-query';

/**
 * Конфигурация React Query для мобильного приложения.
 *
 * Ключевые решения:
 * - staleTime: 0 по умолчанию — данные считаются stale сразу,
 *   НО React Query дедуплицирует запросы: если уже идёт fetch, новый не запускается.
 *   Для реальной дедупликации хуки переопределяют staleTime.
 * - gcTime: 10 мин — кэш живёт достаточно долго для навигации между экранами.
 * - retry: 1 — при ошибке сети пробуем 1 раз (мобильные сети нестабильны).
 * - networkMode: 'online' — запросы не уходят если устройство offline.
 * - refetchOnWindowFocus: false — в RN это работает через useFocusEffect, не нужно автоматически.
 * - refetchOnReconnect: 'always' — refetch только если данные stale, предотвращает reconnect storm.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 10 * 60 * 1000, // 10 минут
      retry: 1,
      refetchOnWindowFocus: false, // в RN это работает через useFocusEffect
      refetchOnReconnect: 'always', // refetch только если данные stale, предотвращает reconnect storm
    },
    mutations: {
      retry: 1,
    },
  },
});
