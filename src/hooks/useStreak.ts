import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, getBaseUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { UserStreak, StreakHistory } from '../types/achievements';

export const useStreak = () => {
  const { user } = useAuth();
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [history, setHistory] = useState<StreakHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStreak = useCallback(async () => {
    if (!user || !getBaseUrl()) {
      setStreak(null);
      setHistory([]);
      setLoading(false);
      return;
    }

    try {
      const data = await apiGet<UserStreak>('/streaks');
      setStreak(data);
    } catch (error) {
      if ((error as any)?.status !== 401) {
        console.error('[useStreak] Fetch error:', error);
      }
      setStreak(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchHistory = useCallback(async () => {
    if (!user || !getBaseUrl()) {
      setHistory([]);
      return;
    }

    try {
      const data = await apiGet<StreakHistory[]>('/streaks/history');
      setHistory(data);
    } catch (error) {
      if ((error as any)?.status !== 401) {
        console.error('[useStreak] History fetch error:', error);
      }
      setHistory([]);
    }
  }, [user]);

  const checkIn = useCallback(async () => {
    if (!user || !getBaseUrl()) return null;

    try {
      const result = await apiPost<UserStreak>('/streaks/check-in', {});
      setStreak(result);
      return result;
    } catch (error) {
      console.error('[useStreak] Check-in error:', error);
      return null;
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // fetchStreak
      if (!user || !getBaseUrl()) {
        if (!cancelled) { setStreak(null); setHistory([]); setLoading(false); }
        return;
      }
      try {
        const data = await apiGet<UserStreak>('/streaks');
        if (!cancelled) setStreak(data);
      } catch (error) {
        if (!cancelled && (error as any)?.status !== 401) {
          console.error('[useStreak] Fetch error:', error);
        }
        if (!cancelled) setStreak(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
      // fetchHistory
      try {
        const data = await apiGet<StreakHistory[]>('/streaks/history');
        if (!cancelled) setHistory(data);
      } catch (error) {
        if (!cancelled && (error as any)?.status !== 401) {
          console.error('[useStreak] History fetch error:', error);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [fetchStreak, fetchHistory]);

  return {
    streak,
    history,
    loading,
    refetch: fetchStreak,
    checkIn,
  };
};
