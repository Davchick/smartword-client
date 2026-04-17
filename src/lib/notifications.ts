import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Настройка поведения уведомлений в foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Запрос разрешения на отправку уведомлений
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      // Разрешение не получено — это не ошибка, просто логируем
      return false;
    }

    // Получаем токен для push-уведомлений (для будущих push-рассылок)
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
      if (!projectId) {
        // PROJECT_ID не настроен — уведомления будут работать только локально
        return true;
      }

      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      // Токен получен успешно — можно отправить на сервер (если нужно)
      return true;
    }

    return true;
  } catch (error) {
    // Ошибка при запросе разрешений — не блокируем работу приложения
    console.warn('[Notifications] Permission request failed (app will continue without push):', error);
    return false;
  }
};

// Ключ для хранения ID запланированного напоминания
const DAILY_REMINDER_ID_KEY = 'smartword_daily_reminder_id';

/**
 * Запланировать ежедневное напоминание о тренировке
 * @param hour - час (0-23)
 * @param minute - минута (0-59)
 */
export const scheduleDailyReminder = async (hour = 20, minute = 0): Promise<string | null> => {
  try {
    // Отменяем только предыдущее ежедневное напоминание (не все уведомления!)
    const prevId = await AsyncStorage.getItem(DAILY_REMINDER_ID_KEY);
    if (prevId) {
      await Notifications.cancelScheduledNotificationAsync(prevId);
    }

    const trigger: Notifications.CalendarTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
    };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔥 Время тренироваться!',
        body: 'Не прерывай свою серию! Выучи несколько слов прямо сейчас.',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'daily_reminder' },
      },
      trigger,
    });

    // Сохраняем ID для последующей отмены
    await AsyncStorage.setItem(DAILY_REMINDER_ID_KEY, notificationId);

    console.log('[Notifications] Daily reminder scheduled:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('[Notifications] Error scheduling reminder:', error);
    return null;
  }
};

/**
 * Отменить ежедневное напоминание
 */
export const cancelDailyReminder = async () => {
  try {
    const reminderId = await AsyncStorage.getItem(DAILY_REMINDER_ID_KEY);
    if (reminderId) {
      await Notifications.cancelScheduledNotificationAsync(reminderId);
      await AsyncStorage.removeItem(DAILY_REMINDER_ID_KEY);
    }
    console.log('[Notifications] Daily reminder cancelled');
  } catch (error) {
    console.error('[Notifications] Error cancelling daily reminder:', error);
  }
};

/**
 * Отменить все запланированные уведомления
 */
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[Notifications] All notifications cancelled');
  } catch (error) {
    console.error('[Notifications] Error cancelling notifications:', error);
  }
};

/**
 * Отправить локальное уведомление немедленно
 */
export const sendLocalNotification = async (
  title: string,
  body: string,
  data?: Record<string, any>
) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data,
      },
      trigger: null, // немедленно
    });
  } catch (error) {
    console.error('[Notifications] Error sending notification:', error);
  }
};

/**
 * Отправить уведомление о потере streak
 */
export const sendStreakLostNotification = async (streakDays: number) => {
  await sendLocalNotification(
    '💔 Серия прервана!',
    `Ваша серия из ${streakDays} дней прервана. Начните заново!`,
    { type: 'streak_lost' }
  );
};

/**
 * Проверить запланированные уведомления
 */
export const getScheduledNotifications = async () => {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return notifications;
  } catch (error) {
    console.error('[Notifications] Error getting scheduled notifications:', error);
    return [];
  }
};
