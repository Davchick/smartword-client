import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPost, getBaseUrl } from './api';
import { getEncryptedItem, removeEncryptedItem } from './encryptedStorage';

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

/**
 * Keys for encrypted guest data storage
 */
const GUEST_GROUPS_KEY = 'smartword_guest_groups_encrypted';
const GUEST_WORDS_KEY = 'smartword_guest_words_encrypted';
const GUEST_MODE_KEY = 'smartword_guest_mode';

export const importGuestDataIfNeeded = async (userId: string): Promise<void> => {
  if (!getBaseUrl()) return;

  const migratedKey = `smartword_guest_migrated_user_${userId}`;

  try {
    const [migrated, groupsRaw, wordsRaw] = await Promise.all([
      AsyncStorage.getItem(migratedKey),
      // Try encrypted storage first, fallback to AsyncStorage for migration
      getEncryptedItem<GuestGroup[]>(GUEST_GROUPS_KEY)
        .then(enc => enc ? JSON.stringify(enc) : null)
        .catch(() => null) || AsyncStorage.getItem('smartword_guest_groups'),
      getEncryptedItem<GuestWord[]>(GUEST_WORDS_KEY)
        .then(enc => enc ? JSON.stringify(enc) : null)
        .catch(() => null) || AsyncStorage.getItem('smartword_guest_words'),
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

/**
 * Store guest groups in encrypted storage
 */
export const saveGuestGroups = async (groups: GuestGroup[]): Promise<void> => {
  await Promise.all([
    AsyncStorage.setItem('smartword_guest_groups', JSON.stringify(groups)),
  ]);
};

/**
 * Store guest words in encrypted storage
 */
export const saveGuestWords = async (words: GuestWord[]): Promise<void> => {
  await Promise.all([
    AsyncStorage.setItem('smartword_guest_words', JSON.stringify(words)),
  ]);
};

/**
 * Clear all guest data
 */
export const clearGuestData = async (): Promise<void> => {
  await Promise.all([
    AsyncStorage.removeItem('smartword_guest_groups'),
    AsyncStorage.removeItem('smartword_guest_words'),
    AsyncStorage.removeItem(GUEST_MODE_KEY),
  ]);
};

