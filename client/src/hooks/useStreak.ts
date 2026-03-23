import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, getBaseUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { UserStreak, StreakHistory } from '../types/achievements';

export const useStreak = () => {
  const { user: authUser } = useAuth();
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [history, setHistory] = useState<StreakHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStreak = useCallback(async () => {
    if (!authUser || !getBaseUrl()) {
      setStreak(null);
      setHistory([]);
      setLoading(false);
      return;
    }

    try {
      const data = await apiGet<UserStreak>('/streaks');
      setStreak(data);
    } catch (error) {
      console.error('[useStreak] Fetch error:', error);
      setStreak(null);
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  const fetchHistory = useCallback(async () => {
    if (!authUser || !getBaseUrl()) {
      setHistory([]);
      return;
    }

    try {
      const data = await apiGet<StreakHistory[]>('/streaks/history');
      setHistory(data);
    } catch (error) {
      console.error('[useStreak] History fetch error:', error);
      setHistory([]);
    }
  }, [authUser]);

  const checkIn = useCallback(async () => {
    if (!authUser || !getBaseUrl()) return null;

    try {
      const result = await apiPost<UserStreak>('/streaks/check-in', {});
      setStreak(result);
      return result;
    } catch (error) {
      console.error('[useStreak] Check-in error:', error);
      return null;
    }
  }, [authUser]);

  useEffect(() => {
    fetchStreak();
    fetchHistory();
  }, [fetchStreak, fetchHistory]);

  return {
    streak,
    history,
    loading,
    refetch: fetchStreak,
    checkIn,
  };
};
