import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, getBaseUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export interface TrainingDayProgress {
  date: string;
  dayLabel: string;
  points: number;
  isToday: boolean;
}

export const useTrainingProgress = () => {
  const { user: authUser } = useAuth();
  const [progress, setProgress] = useState<TrainingDayProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!authUser || !getBaseUrl()) {
      setProgress([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const data = await apiGet<TrainingDayProgress[]>('/stats/training-progress');
      setProgress(data);
    } catch (e) {
      console.warn('[useTrainingProgress] fetchProgress error', e);
      setProgress([]);
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  const addPoints = useCallback(async (points: number) => {
    if (!authUser || !getBaseUrl() || points <= 0) return;
    
    try {
      await apiPost('/stats/training-progress', { points });
      await fetchProgress();
    } catch (e) {
      console.warn('[useTrainingProgress] addPoints error', e);
    }
  }, [authUser, fetchProgress]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authUser || !getBaseUrl()) {
        if (!cancelled) { setProgress([]); setLoading(false); }
        return;
      }
      setLoading(true);
      try {
        const data = await apiGet<TrainingDayProgress[]>('/stats/training-progress');
        if (!cancelled) setProgress(data);
      } catch (e) {
        if (!cancelled) {
          console.warn('[useTrainingProgress] fetchProgress error', e);
          setProgress([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchProgress]);

  return { progress, loading, refetch: fetchProgress, addPoints };
};
