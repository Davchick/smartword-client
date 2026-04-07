import { useCallback, useRef, useEffect } from 'react';

/**
 * Возвращает обёртку над refetch с debounce.
 * Предотвращает избыточные запросы при быстром переключении табов/экранов.
 *
 * @param refetchFn — оригинальная функция refetch
 * @param debounceMs — задержка в мс (по умолчанию 500мс)
 */
export function useDebouncedRefetch<T extends () => Promise<void> | void>(
  refetchFn: T,
  debounceMs = 500
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetchingRef = useRef(false);

  // Cleanup timeout при размонтировании
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(((async () => {
    // Если уже идёт запрос — игнорируем
    if (isFetchingRef.current) return;

    // Очищаем предыдущий таймер
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Ставим debounce
    timeoutRef.current = setTimeout(async () => {
      isFetchingRef.current = true;
      try {
        await refetchFn();
      } finally {
        isFetchingRef.current = false;
      }
    }, debounceMs);
  }) as T), [refetchFn, debounceMs]);
}
