import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export interface DayActivity {
  date: string;       // 'YYYY-MM-DD'
  dayLabel: string;   // 'Пн', 'Вт' ...
  hasActivity: boolean;
  isFuture: boolean;
  isToday: boolean;
}

export interface Stats {
  totalWords: number;
  learnedWords: number; // correct_count >= 5
  currentStreak: number;
  weekActivity: DayActivity[];
}

const DAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0] as string;
}

export const useStats = () => {
  const [stats, setStats] = useState<Stats>({
    totalWords: 0,
    learnedWords: 0,
    currentStreak: 0,
    weekActivity: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let allWords: { correct_count: number; last_reviewed: string | null }[] = [];

    if (user) {
      const { data: words } = await supabase
        .from('words')
        .select('correct_count, last_reviewed')
        .eq('user_id', user.id);
      allWords = words ?? [];
    } else {
      const wordsRaw = await AsyncStorage.getItem('smartword_guest_words');
      allWords = wordsRaw ? JSON.parse(wordsRaw) : [];
    }

    const totalWords = allWords.length;
    const learnedWords = allWords.filter(w => w.correct_count >= 5).length;

    // --- Активность за текущую неделю (Пн–Вс) ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Начало недели — понедельник
    const dayOfWeek = today.getDay(); // 0=Вс, 1=Пн...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    // Собираем Set дней когда было повторение
    const activeDays = new Set<string>();
    for (const w of allWords) {
      if (w.last_reviewed) {
        const d = new Date(w.last_reviewed);
        d.setHours(0, 0, 0, 0);
        activeDays.add(toDateStr(d));
      }
    }

    // Строим 7 дней недели
    const weekActivity: DayActivity[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      const dateStr = toDateStr(day);
      const todayStr = toDateStr(today);
      weekActivity.push({
        date: dateStr,
        dayLabel: DAY_LABELS[day.getDay()] as string,
        hasActivity: activeDays.has(dateStr),
        isFuture: day > today,
        isToday: dateStr === todayStr,
      });
    }

    // --- Стрик: считаем подряд идущие дни назад от сегодня ---
    let streak = 0;
    const cursor = new Date(today);
    while (true) {
      const dateStr = toDateStr(cursor);
      if (activeDays.has(dateStr)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    setStats({ totalWords, learnedWords, currentStreak: streak, weekActivity });
    setLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
};
