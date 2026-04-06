import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, getBaseUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Achievement, AchievementsSummary } from '../types/achievements';

export const useAchievements = () => {
  const { user: authUser } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [summary, setSummary] = useState<AchievementsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAchievements = useCallback(async () => {
    if (!authUser || !getBaseUrl()) {
      setAchievements([]);
      setSummary(null);
      setLoading(false);
      return;
    }

    try {
      const [achievementsData, summaryData] = await Promise.all([
        apiGet<Achievement[]>('/achievements'),
        apiGet<AchievementsSummary>('/achievements/summary'),
      ]);
      setAchievements(achievementsData);
      setSummary(summaryData);
    } catch (error) {
      console.error('[useAchievements] Fetch error:', error);
      setAchievements([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  const checkAchievements = useCallback(async (action: string, value: number) => {
    if (!authUser || !getBaseUrl()) return [];

    try {
      const result = await apiPost<{ unlocked: Achievement[] }>('/achievements/check', {
        action,
        value,
      });
      
      if (result.unlocked && result.unlocked.length > 0) {
        // Обновляем локальное состояние
        setAchievements(prev => 
          prev.map(a => {
            const unlocked = result.unlocked.find(u => u.id === a.id);
            if (unlocked) {
              return { ...a, unlocked: true, unlockedAt: new Date().toISOString() };
            }
            return a;
          })
        );
      }
      
      return result.unlocked || [];
    } catch (error) {
      console.error('[useAchievements] Check error:', error);
      return [];
    }
  }, [authUser]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authUser || !getBaseUrl()) {
        if (!cancelled) { setAchievements([]); setSummary(null); setLoading(false); }
        return;
      }
      setLoading(true);
      try {
        const [achievementsData, summaryData] = await Promise.all([
          apiGet<Achievement[]>('/achievements'),
          apiGet<AchievementsSummary>('/achievements/summary'),
        ]);
        if (!cancelled) {
          setAchievements(achievementsData);
          setSummary(summaryData);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('[useAchievements] Fetch error:', error);
          setAchievements([]);
          setSummary(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchAchievements]);

  return {
    achievements,
    summary,
    loading,
    refetch: fetchAchievements,
    checkAchievements,
  };
};
