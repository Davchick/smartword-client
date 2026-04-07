import { useState, useCallback, useRef, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPost, getBaseUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

// ─── Keys ────────────────────────────────────────────────────────────────
const PENDING_SESSION_KEY = '@SmartWord:pendingTrainingSession';

// ─── Types ───────────────────────────────────────────────────────────────
interface WordUpdate {
  wordId: string;
  knew: boolean;
  correctDelta: number;
  incorrectDelta: number;
  points: number;
}

interface TrainingSessionData {
  groupId?: string;
  groupName?: string;
  updates: WordUpdate[];
  totalPoints: number;
  startedAt: string;
}

interface FlushResult {
  success: boolean;
  sent: number;
  failed: number;
  willRetry: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────
/**
 * Экспоненциальный backoff: 2^attempt * baseDelay
 */
function backoffMs(attempt: number, baseDelay = 1000): number {
  return Math.min(2 ** attempt * baseDelay, 8000);
}

/**
 * POST с retry при 429 (Too Many Requests)
 */
async function postWithRetry<T = unknown>(
  path: string,
  body: unknown,
  maxRetries = 3
): Promise<{ data: T | null; error: string | null }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await apiPost<T>(path, body);
      return { data: res, error: null };
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };

      if (e.status === 429 && attempt < maxRetries) {
        // Rate limit — ждём и пробуем снова
        const delay = backoffMs(attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Не 429 или исчерпаны retry
      return {
        data: null,
        error: e.status === 429
          ? 'SERVER_RATE_LIMITED'
          : e.message ?? 'UNKNOWN_ERROR',
      };
    }
  }

  return { data: null, error: 'SERVER_RATE_LIMITED' };
}

// ─── Hook ────────────────────────────────────────────────────────────────
export const useTrainingSession = () => {
  const { user: authUser } = useAuth();
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [sessionWords, setSessionWords] = useState(0);

  // Mutable session — не вызывает ре-рендеры
  const sessionRef = useRef<TrainingSessionData | null>(null);
  const flushingRef = useRef(false);
  const appStateSubRef = useRef<{ remove: () => void } | null>(null);
  const mountedRef = useRef(true);

  // ── Публичные методы ──

  /**
   * Начать тренировку. Вызывать при монтировании экрана тренировки.
   */
  const startSession = useCallback((groupId?: string, groupName?: string) => {
    sessionRef.current = {
      groupId,
      groupName,
      updates: [],
      totalPoints: 0,
      startedAt: new Date().toISOString(),
    };
    setSessionActive(true);
    setSessionPoints(0);
    setSessionWords(0);
  }, []);

  /**
   * Записать результат ответа. НЕ отправляет на сервер — только накапливает.
   * Вызывать на каждый свайп / проверку ответа.
   */
  const recordWord = useCallback(
    (wordId: string, knew: boolean, options?: { correctDelta?: number; incorrectDelta?: number; points?: number }) => {
      const session = sessionRef.current;
      if (!session) return;

      const update: WordUpdate = {
        wordId,
        knew,
        correctDelta: options?.correctDelta ?? 1,
        incorrectDelta: options?.incorrectDelta ?? -1,
        points: options?.points ?? (knew ? 1 : 0),
      };

      session.updates.push(update);
      session.totalPoints += update.points;

      setSessionPoints(session.totalPoints);
      setSessionWords(session.updates.length);
    },
    []
  );

  /**
   * Отправить накопленные данные на сервер.
   * Вызывать при выходе из тренировки (cleanup / AppState background).
   */
  const flushSession = useCallback(async (): Promise<FlushResult> => {
    const session = sessionRef.current;

    if (!session || session.updates.length === 0) {
      // Нечего отправлять
      sessionRef.current = null;
      setSessionActive(false);
      return { success: true, sent: 0, failed: 0, willRetry: false };
    }

    // Защита от параллельных flush
    if (flushingRef.current) {
      return { success: false, sent: 0, failed: 0, willRetry: true };
    }
    flushingRef.current = true;

    const isAuthorized = !!authUser && !!getBaseUrl();
    let sent = 0;
    let failed = 0;

    if (isAuthorized) {
      // Отправляем каждое обновление слова последовательно с retry
      for (let i = 0; i < session.updates.length; i++) {
        const update = session.updates[i]!;
        const { error } = await postWithRetry(
          `/words/${update.wordId}/progress`,
          { knew: update.knew, correctDelta: update.correctDelta, incorrectDelta: update.incorrectDelta },
          3
        );

        if (error) {
          failed++;
          // Если сервер заблокировал — сохраняем оставшиеся и выходим
          if (error === 'SERVER_RATE_LIMITED') {
            session.updates = session.updates.slice(i);
            session.totalPoints = session.updates.reduce((s, u) => s + u.points, 0);
            await _savePendingSession(session);
            flushingRef.current = false;
            return { success: false, sent, failed: failed + (session.updates.length), willRetry: true };
          }
        } else {
          sent++;
        }
      }

      // Отправляем очки (ОДИН запрос, не N)
      if (session.totalPoints > 0) {
        await postWithRetry('/stats/training-progress', { points: session.totalPoints }, 2);
      }
    } else {
      // Гостевой режим — очки не отправляем, обновления только локально.
      // Данные уже сохранены через optimistic update в useWords.
      // Просто помечаем сессию завершённой.
    }

    // Очищаем сессию
    sessionRef.current = null;
    setSessionActive(false);
    setSessionPoints(0);
    setSessionWords(0);
    flushingRef.current = false;

    // Удаляем pending из AsyncStorage
    await AsyncStorage.removeItem(PENDING_SESSION_KEY).catch(() => {});

    return {
      success: failed === 0,
      sent,
      failed,
      willRetry: failed > 0,
    };
  }, [authUser]);

  /**
   * Сохранить pending сессию в AsyncStorage (crash protection).
   * Вызывать при каждом recordWord (debounced).
   */
  const _savePendingSession = useCallback(async (session: TrainingSessionData) => {
    try {
      await AsyncStorage.setItem(PENDING_SESSION_KEY, JSON.stringify(session));
    } catch {
      // Не критично — данные уже в памяти
    }
  }, []);

  // ── Crash protection: debounce-сохранение pending в AsyncStorage ──

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!sessionRef.current || sessionRef.current.updates.length === 0) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (sessionRef.current) {
        _savePendingSession(sessionRef.current);
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [sessionWords, _savePendingSession]);

  // ── AppState: flush при сворачивании приложения ──

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (state) => {
      if ((state === 'background' || state === 'inactive') && sessionRef.current && sessionRef.current.updates.length > 0) {
        // Приложение уходит в фон — срочно сохраняем
        await _savePendingSession(sessionRef.current);
        // Пробуем flush, но не блокируем
        void flushSession();
      }
    });

    appStateSubRef.current = subscription;

    return () => {
      subscription.remove();
      appStateSubRef.current = null;
    };
  }, [flushSession, _savePendingSession]);

  // ── Восстановление pending сессии при монтировании ──

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PENDING_SESSION_KEY);
        if (raw) {
          const pending = JSON.parse(raw) as TrainingSessionData;
          // Восстанавливаем только если сессия не старше 24 часов
          const age = Date.now() - new Date(pending.startedAt).getTime();
          if (age < 24 * 60 * 60 * 1000) {
            sessionRef.current = pending;
            setSessionActive(true);
            setSessionPoints(pending.totalPoints);
            setSessionWords(pending.updates.length);
          } else {
            // Старая сессия — удаляем
            await AsyncStorage.removeItem(PENDING_SESSION_KEY);
          }
        }
      } catch {
        // Игнорируем — corrupted data
      }
    })();
  }, []);

  // ── Cleanup при размонтировании ──

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Если сессия активна и есть несохранённые данные — пробуем flush
      if (sessionRef.current && sessionRef.current.updates.length > 0) {
        // Не await — компонент уже размонтируется
        void flushSession();
      }
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      // Отписываемся от AppState
      if (appStateSubRef.current) {
        appStateSubRef.current.remove();
        appStateSubRef.current = null;
      }
    };
  }, [flushSession]);

  // ── Restore отправленных очков из pending (если app крашнулся до flush) ──

  useEffect(() => {
    if (!sessionActive) return;

    const raw = typeof sessionStorage !== 'undefined' ? null : null; // Placeholder для future offline sync
    // В будущем: при восстановлении pending сессии и успешном reconnect
    // можно отправить только то, что не было отправлено
  }, [sessionActive]);

  return {
    sessionActive,
    sessionPoints,
    sessionWords,
    startSession,
    recordWord,
    flushSession,
  };
};
