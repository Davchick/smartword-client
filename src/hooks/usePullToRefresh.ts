/**
 * usePullToRefresh — reusable pull-to-refresh logic.
 *
 * Addresses:
 * - Stale closure (uses useRef for state)
 * - No timeout (configurable, default 10s)
 * - Error handling (toast on failure)
 * - Race conditions (ref-based locking)
 * - Duplication (single implementation)
 * - Rate limiting (8 requests per minute, silent drop)
 *
 * Usage:
 *   const { refreshing, handleRefresh, lastUpdated } = usePullToRefresh({
 *     onRefresh: () => queryClient.refetchQueries({ queryKey }),
 *     timeout: 10000,
 *   });
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { useApiError } from './useApiError';

const DEFAULT_TIMEOUT = 10000;
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 8;

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<unknown>;
  timeout?: number;
}

interface UsePullToRefreshResult {
  refreshing: boolean;
  handleRefresh: () => Promise<void>;
  lastUpdated: Date | null;
}

export function usePullToRefresh({ onRefresh, timeout = DEFAULT_TIMEOUT }: UsePullToRefreshOptions): UsePullToRefreshResult {
  const { handleApiError } = useApiError();

  const refreshingRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rateLimitTimestampsRef = useRef<number[]>([]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;

    rateLimitTimestampsRef.current = rateLimitTimestampsRef.current.filter(ts => ts > windowStart);

    if (rateLimitTimestampsRef.current.length >= RATE_LIMIT_MAX) {
      return;
    }

    if (refreshingRef.current) {
      return;
    }

    rateLimitTimestampsRef.current.push(now);

    refreshingRef.current = true;
    setRefreshing(true);

    const timeoutId = setTimeout(() => {
      if (mountedRef.current) {
        refreshingRef.current = false;
        setRefreshing(false);
        handleApiError(new Error('Время ожидания истекло'), 'Не удалось обновить');
      }
    }, timeout);

    timeoutRef.current = timeoutId;

    try {
      await onRefresh();
    } catch (error) {
      handleApiError(error, 'Не удалось обновить');
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (mountedRef.current) {
        refreshingRef.current = false;
        setRefreshing(false);
        setLastUpdated(new Date());
      }
    }
  }, [onRefresh, handleApiError, timeout]);

  return { refreshing, handleRefresh, lastUpdated };
}