/**
 * Guest storage — хранение данных гостя в AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_WORDS_KEY = 'smartword_guest_words';
const GUEST_GROUPS_KEY = 'smartword_guest_groups';

// ─── Words ─────────────────────────────────────────────────────────────

export async function getGuestWords<T = unknown>(): Promise<T | null> {
  const raw = await AsyncStorage.getItem(GUEST_WORDS_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function setGuestWords<T>(value: T): Promise<void> {
  await AsyncStorage.setItem(GUEST_WORDS_KEY, JSON.stringify(value));
}

// ─── Groups ────────────────────────────────────────────────────────────

export async function getGuestGroups<T = unknown>(): Promise<T | null> {
  const raw = await AsyncStorage.getItem(GUEST_GROUPS_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function setGuestGroups<T>(value: T): Promise<void> {
  await AsyncStorage.setItem(GUEST_GROUPS_KEY, JSON.stringify(value));
}

// ─── Migration check ──────────────────────────────────────────────────
// Всегда false — миграция с encrypted storage больше не нужна

export async function needsGuestDataMigration(): Promise<boolean> {
  return false;
}
