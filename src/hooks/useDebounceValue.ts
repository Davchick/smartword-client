import { useEffect, useState } from 'react';

/**
 * Debounce значение с задержкой.
 * Возвращает отложенную копию — полезно для search input.
 */
export function useDebounceValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
