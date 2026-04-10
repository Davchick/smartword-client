import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Простое хранилище на базе AsyncStorage.
 * Без шифрования — guest-данные не являются чувствительными.
 */

export async function setStorageItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('[Storage] Failed to set item:', error);
    throw error;
  }
}

export async function getStorageItem<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (error) {
    console.error('[Storage] Failed to get item:', error);
    return null;
  }
}

export async function removeStorageItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('[Storage] Failed to remove item:', error);
  }
}
