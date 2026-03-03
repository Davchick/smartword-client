import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPost, getBaseUrl } from './api';

type GuestGroup = {
  id: string;
  name: string;
  language: string;
  created_at?: string;
  word_count?: number;
};

type GuestWord = {
  id: string;
  group_id: string | null;
  original: string;
  translation: string;
  correct_count?: number;
  last_reviewed?: string | null;
  created_at?: string;
};

export const importGuestDataIfNeeded = async (userId: string): Promise<void> => {
  if (!getBaseUrl()) return;

  const migratedKey = `smartword_guest_migrated_user_${userId}`;

  try {
    const [migrated, groupsRaw, wordsRaw] = await Promise.all([
      AsyncStorage.getItem(migratedKey),
      AsyncStorage.getItem('smartword_guest_groups'),
      AsyncStorage.getItem('smartword_guest_words'),
    ]);

    if (migrated === '1') return;

    const guestGroups: GuestGroup[] = groupsRaw ? JSON.parse(groupsRaw) : [];
    const guestWords: GuestWord[] = wordsRaw ? JSON.parse(wordsRaw) : [];

    if (guestGroups.length === 0 && guestWords.length === 0) {
      await AsyncStorage.setItem(migratedKey, '1');
      return;
    }

    await apiPost('/profile/import-guest', {
      groups: guestGroups,
      words: guestWords,
    });

    await Promise.all([
      AsyncStorage.setItem(migratedKey, '1'),
      AsyncStorage.removeItem('smartword_guest_groups'),
      AsyncStorage.removeItem('smartword_guest_words'),
      AsyncStorage.removeItem('smartword_guest_mode'),
    ]);
  } catch (err: unknown) {
    const e = err as { body?: { error?: string } };
    if (e?.body?.error === 'already_initialized') {
      await AsyncStorage.setItem(migratedKey, '1');
    }
    // остальные ошибки игнорируем — не ломаем вход
  }
};

