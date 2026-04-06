import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Настройка поведения уведомлений в foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
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
      console.log('[Notifications] Permission not granted');
      return false;
    }

    // Получаем токен для push-уведомлений (для будущих push-рассылок)
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });
      console.log('[Notifications] Push token:', token.data);
    }

    return true;
  } catch (error) {
    console.error('[Notifications] Error requesting permissions:', error);
    return false;
  }
};

/**
 * Запланировать ежедневное напоминание о тренировке
 * @param hour - час (0-23)
 * @param minute - минута (0-59)
 */
export const scheduleDailyReminder = async (hour = 20, minute = 0): Promise<string | null> => {
  try {
    // Отменяем все предыдущие напоминания
    await Notifications.cancelAllScheduledNotificationsAsync();

    const trigger: Notifications.CalendarNotificationTriggerInput = {
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

    console.log('[Notifications] Daily reminder scheduled:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('[Notifications] Error scheduling reminder:', error);
    return null;
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
 * Отправить уведомление о новом достижении
 */
export const sendAchievementNotification = async (achievementTitle: string) => {
  await sendLocalNotification(
    '🏆 Новое достижение!',
    `Вы получили достижение: ${achievementTitle}`,
    { type: 'achievement' }
  );
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
