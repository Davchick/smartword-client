import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProfile } from './useProfile';

// ─── Keys ────────────────────────────────────────────────────────────────
const WEEKLY_LIMIT_KEY = '@SmartWord:weeklyLimitReached';
const WEEKLY_LEARNED_KEY = '@SmartWord:wordsLearnedThisWeek';
const LAST_MONDAY_KEY = '@SmartWord:lastMonday';

export const WEEKLY_LIMIT = 50;

/**
 * Единый источник правды для недельного лимита тренировок.
 * Используется в TrainingScreen и WritingTrainingScreen.
 *
 * - Загружает состояние из AsyncStorage при монтировании
 * - Сбрасывает в начале новой недели (понедельник)
 * - Предоставляет атомарные методы checkIncrementLimit и reset
 */
export const useWeeklyLimit = () => {
  const { profile } = useProfile();
  const [weeklyLimitReached, setWeeklyLimitReached] = useState(false);
  const [localWordsLearnedThisWeek, setLocalWordsLearnedThisWeek] = useState(0);

  const weeklyLimitReachedRef = useRef(weeklyLimitReached);
  const localWordsLearnedThisWeekRef = useRef(localWordsLearnedThisWeek);
  const serverWordsLearnedThisWeek = profile?.words_learned_this_week ?? 0;
  const totalWordsLearnedThisWeek = serverWordsLearnedThisWeek + localWordsLearnedThisWeek;

  useEffect(() => {
    weeklyLimitReachedRef.current = weeklyLimitReached;
    localWordsLearnedThisWeekRef.current = localWordsLearnedThisWeek;
  });

  // ── Загрузка и сброс недели ──

  useEffect(() => {
    let mounted = true;

    const loadAndCheckWeek = async () => {
      try {
        const now = new Date();
        const currentMonday = new Date(now);
        const day = currentMonday.getDay();
        const diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1);
        currentMonday.setDate(diff);
        currentMonday.setHours(0, 0, 0, 0);

        const savedMonday = await AsyncStorage.getItem(LAST_MONDAY_KEY);
        if (savedMonday === null || new Date(savedMonday) < currentMonday) {
          // Новая неделя — сбрасываем
          await AsyncStorage.multiSet([
            [LAST_MONDAY_KEY, currentMonday.toISOString()],
            [WEEKLY_LIMIT_KEY, 'false'],
            [WEEKLY_LEARNED_KEY, '0'],
          ]);
          if (mounted) {
            setWeeklyLimitReached(false);
            setLocalWordsLearnedThisWeek(0);
          }
        } else {
          // Текущая неделя — загружаем сохранённые значения
          const results = await AsyncStorage.multiGet([
            WEEKLY_LIMIT_KEY,
            WEEKLY_LEARNED_KEY,
          ]);
          if (mounted) {
            const lr = results[0]?.[1];
            const ln = results[1]?.[1];
            if (lr !== null && lr !== undefined) {
              setWeeklyLimitReached(JSON.parse(lr));
            }
            if (ln !== null && ln !== undefined) {
              setLocalWordsLearnedThisWeek(JSON.parse(ln));
            }
          }
        }
      } catch (e) {
        console.warn('[useWeeklyLimit] Failed to load/reset week state:', e);
      }
    };

    loadAndCheckWeek();
    return () => { mounted = false; };
  }, []);

  // ── Batched save в AsyncStorage ──

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback((limitReached: boolean, learned: number) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await Promise.all([
          AsyncStorage.setItem(WEEKLY_LIMIT_KEY, JSON.stringify(limitReached)),
          AsyncStorage.setItem(WEEKLY_LEARNED_KEY, JSON.stringify(learned)),
        ]);
      } catch (e) {
        console.warn('[useWeeklyLimit] Failed to save state:', e);
      }
    }, 100);
  }, []);

  // ── Публичные методы ──

  /**
   * Увеличить счётчик выученных слов и проверить лимит.
   * Возвращает true если лимит был достигнут (и пользователь не premium).
   */
  const incrementAndCheck = useCallback(
    (count = 1): { limitReached: boolean } => {
      const newLocalLearned = localWordsLearnedThisWeekRef.current + count;
      const totalLearned = serverWordsLearnedThisWeek + newLocalLearned;
      const isPremium = !!profile?.is_premium;
      const reached = !isPremium && totalLearned >= WEEKLY_LIMIT;

      setLocalWordsLearnedThisWeek(newLocalLearned);
      if (reached) setWeeklyLimitReached(true);

      scheduleSave(reached, newLocalLearned);
      return { limitReached: reached };
    },
    [profile?.is_premium, scheduleSave, serverWordsLearnedThisWeek]
  );

  /**
   * Проверить лимит без увеличения (например при рестарте).
   */
  const checkLimit = useCallback((): boolean => {
    const localLearned = localWordsLearnedThisWeekRef.current;
    const total = serverWordsLearnedThisWeek + localLearned;
    const isPremium = !!profile?.is_premium;

    if (!isPremium && total >= WEEKLY_LIMIT) {
      setWeeklyLimitReached(true);
      // Локально храним только дельту текущей сессии, чтобы не дублировать серверный счётчик.
      scheduleSave(true, localLearned);
      return true;
    }
    return false;
  }, [serverWordsLearnedThisWeek, profile?.is_premium, scheduleSave]);

  /**
   * Сбросить локальный счётчик (например при restart тренировки).
   */
  const resetLocal = useCallback(() => {
    setLocalWordsLearnedThisWeek(0);
    setWeeklyLimitReached(false);
    scheduleSave(false, 0);
  }, [scheduleSave]);

  // Cleanup pending timeout
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    weeklyLimitReached,
    wordsLearnedThisWeek: totalWordsLearnedThisWeek,
    weeklyLimit: WEEKLY_LIMIT,
    incrementAndCheck,
    checkLimit,
    resetLocal,
  };
};
