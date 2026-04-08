/**
 * Guest storage — прозрачная обёртка над encryptedStorage.
 * Все guest данные шифруются AES-256, ключ в SecureStore (Keychain/Keystore).
 * Автоматическая миграция: если данные ещё в AsyncStorage — мигрируем.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  setEncryptedItem,
  getEncryptedItem,
  needsMigration,
  markMigrationComplete,
} from '../lib/encryptedStorage';

const GUEST_WORDS_KEY = 'smartword_guest_words';
const GUEST_GROUPS_KEY = 'smartword_guest_groups';
const MIGRATION_WORDS_FLAG = 'smartword_guest_words_migrated_to_encrypted';
const MIGRATION_GROUPS_FLAG = 'smartword_guest_groups_migrated_to_encrypted';

// ─── Words ─────────────────────────────────────────────────────────────

export async function getGuestWords<T = unknown>(): Promise<T | null> {
  // Пробуем encrypted
  const encrypted = await getEncryptedItem<T>(GUEST_WORDS_KEY);
  if (encrypted !== null) return encrypted;

  // Fallback: plain AsyncStorage (до миграции)
  const raw = await AsyncStorage.getItem(GUEST_WORDS_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function setGuestWords<T>(value: T): Promise<void> {
  // Пишем в encrypted
  await setEncryptedItem(GUEST_WORDS_KEY, value);

  // Удаляем старый plain ключ если ещё есть
  const hasPlain = await AsyncStorage.getItem(GUEST_WORDS_KEY);
  if (hasPlain) {
    await AsyncStorage.removeItem(GUEST_WORDS_KEY);
    await AsyncStorage.setItem(MIGRATION_WORDS_FLAG, 'true');
  }
}

// ─── Groups ────────────────────────────────────────────────────────────

export async function getGuestGroups<T = unknown>(): Promise<T | null> {
  const encrypted = await getEncryptedItem<T>(GUEST_GROUPS_KEY);
  if (encrypted !== null) return encrypted;

  const raw = await AsyncStorage.getItem(GUEST_GROUPS_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function setGuestGroups<T>(value: T): Promise<void> {
  await setEncryptedItem(GUEST_GROUPS_KEY, value);

  const hasPlain = await AsyncStorage.getItem(GUEST_GROUPS_KEY);
  if (hasPlain) {
    await AsyncStorage.removeItem(GUEST_GROUPS_KEY);
    await AsyncStorage.setItem(MIGRATION_GROUPS_FLAG, 'true');
  }
}

// ─── Migration check ──────────────────────────────────────────────────

export async function needsGuestDataMigration(): Promise<boolean> {
  const [wordsNeeds, groupsNeeds] = await Promise.all([
    needsMigration(),
    (async () => {
      const migrated = await AsyncStorage.getItem(MIGRATION_GROUPS_FLAG);
      return migrated !== 'true';
    })(),
  ]);
  return wordsNeeds || groupsNeeds;
}
