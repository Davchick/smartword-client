import { useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import {
  requestNotificationPermissions,
  scheduleDailyReminder,
  cancelAllNotifications,
  sendAchievementNotification,
  sendStreakLostNotification,
} from '../lib/notifications';
import { useAchievements } from '../hooks/useAchievements';
import { useStreak } from '../hooks/useStreak';

interface UseNotificationsOptions {
  enableDailyReminder?: boolean;
  reminderHour?: number;
  reminderMinute?: number;
}

/**
 * Хук для управления уведомлениями
 */
export const useNotifications = ({
  enableDailyReminder = true,
  reminderHour = 20,
  reminderMinute = 0,
}: UseNotificationsOptions = {}) => {
  const { achievements } = useAchievements();
  const { streak } = useStreak();

  // Инициализация уведомлений при монтировании
  useEffect(() => {
    const initNotifications = async () => {
      const granted = await requestNotificationPermissions();
      
      if (granted && enableDailyReminder) {
        await scheduleDailyReminder(reminderHour, reminderMinute);
      }
    };

    initNotifications();
  }, [enableDailyReminder, reminderHour, reminderMinute]);

  // Обработка новых достижений
  useEffect(() => {
    if (achievements && achievements.length > 0) {
      const newlyUnlocked = achievements.filter(
        (a) => a.unlocked && a.unlockedAt && new Date(a.unlockedAt).getTime() > Date.now() - 5000
      );

      for (const achievement of newlyUnlocked) {
        sendAchievementNotification(achievement.title);
      }
    }
  }, [achievements]);

  // Обработка потери streak
  useEffect(() => {
    if (streak?.isStreakLost && streak.currentStreak === 0 && streak.totalActivity > 0) {
      sendStreakLostNotification(streak.longestStreak);
    }
  }, [streak]);

  // Функция для ручной настройки напоминания
  const setReminder = useCallback(async (hour: number, minute: number) => {
    const granted = await requestNotificationPermissions();
    if (granted) {
      return await scheduleDailyReminder(hour, minute);
    }
    return null;
  }, []);

  // Функция для отключения напоминания
  const disableReminder = useCallback(async () => {
    await cancelAllNotifications();
  }, []);

  return {
    setReminder,
    disableReminder,
  };
};
