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

const GUEST_GROUPS_KEY = 'smartword_guest_groups';
const GUEST_WORDS_KEY = 'smartword_guest_words';
const GUEST_MODE_KEY = 'smartword_guest_mode';

export const importGuestDataIfNeeded = async (userId: string): Promise<void> => {
  if (!getBaseUrl()) return;

  const migratedKey = `smartword_guest_migrated_user_${userId}`;

  try {
    const groupsRaw = await AsyncStorage.getItem(GUEST_GROUPS_KEY);
    const wordsRaw = await AsyncStorage.getItem(GUEST_WORDS_KEY);
    const migrated = await AsyncStorage.getItem(migratedKey);

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
      AsyncStorage.removeItem(GUEST_GROUPS_KEY),
      AsyncStorage.removeItem(GUEST_WORDS_KEY),
      AsyncStorage.removeItem(GUEST_MODE_KEY),
    ]);
  } catch (err: unknown) {
    const e = err as { body?: { error?: string } };
    if (e?.body?.error === 'already_initialized') {
      await AsyncStorage.setItem(migratedKey, '1');
    }
    // остальные ошибки игнорируем — не ломаем вход
  }
};

export const saveGuestGroups = async (groups: GuestGroup[]): Promise<void> => {
  await AsyncStorage.setItem(GUEST_GROUPS_KEY, JSON.stringify(groups));
};

export const saveGuestWords = async (words: GuestWord[]): Promise<void> => {
  await AsyncStorage.setItem(GUEST_WORDS_KEY, JSON.stringify(words));
};

export const clearGuestData = async (): Promise<void> => {
  await Promise.all([
    AsyncStorage.removeItem(GUEST_GROUPS_KEY),
    AsyncStorage.removeItem(GUEST_WORDS_KEY),
    AsyncStorage.removeItem(GUEST_MODE_KEY),
  ]);
};
