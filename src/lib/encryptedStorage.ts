import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';

/**
 * Encrypted storage utility for sensitive guest data.
 * Uses AES encryption with a device-specific key stored in SecureStore.
 */

const ENCRYPTION_KEY_KEY = 'smartword_encryption_key';
const HAS_MIGRATED_KEY = 'smartword_encrypted_storage_migrated';

/**
 * Get or create encryption key (stored securely in Keychain/Keystore)
 */
async function getEncryptionKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_KEY);
  
  if (!key) {
    // Generate new 256-bit key
    key = CryptoJS.lib.WordArray.random(32).toString();
    await SecureStore.setItemAsync(ENCRYPTION_KEY_KEY, key);
  }
  
  return key;
}

/**
 * Encrypt and store data securely
 */
export async function setEncryptedItem<T>(key: string, value: T): Promise<void> {
  try {
    const encryptionKey = await getEncryptionKey();
    const serialized = JSON.stringify(value);
    const encrypted = CryptoJS.AES.encrypt(serialized, encryptionKey).toString();
    await SecureStore.setItemAsync(key, encrypted);
  } catch (error) {
    console.error('[EncryptedStorage] Failed to set encrypted item:', error);
    throw error;
  }
}

/**
 * Retrieve and decrypt data
 */
export async function getEncryptedItem<T>(key: string): Promise<T | null> {
  try {
    const encrypted = await SecureStore.getItemAsync(key);
    if (!encrypted) return null;
    
    const encryptionKey = await getEncryptionKey();
    const bytes = CryptoJS.AES.decrypt(encrypted, encryptionKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) return null;
    return JSON.parse(decrypted) as T;
  } catch (error) {
    console.error('[EncryptedStorage] Failed to get encrypted item:', error);
    return null;
  }
}

/**
 * Delete encrypted data
 */
export async function removeEncryptedItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error('[EncryptedStorage] Failed to remove encrypted item:', error);
  }
}

/**
 * Check if migration to encrypted storage is needed
 */
export async function needsMigration(): Promise<boolean> {
  const hasMigrated = await SecureStore.getItemAsync(HAS_MIGRATED_KEY);
  return hasMigrated !== 'true';
}

/**
 * Mark migration as complete
 */
export async function markMigrationComplete(): Promise<void> {
  await SecureStore.setItemAsync(HAS_MIGRATED_KEY, 'true');
}

/**
 * Migrate data from AsyncStorage to encrypted storage
 */
export async function migrateFromAsyncStorage(
  oldKey: string,
  newKey: string,
  transform?: (data: unknown) => unknown
): Promise<boolean> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const oldData = await AsyncStorage.getItem(oldKey);
    
    if (!oldData) return false;
    
    let parsed = JSON.parse(oldData);
    if (transform) {
      parsed = transform(parsed);
    }
    
    await setEncryptedItem(newKey, parsed);
    await AsyncStorage.removeItem(oldKey);
    
    return true;
  } catch (error) {
    console.error('[EncryptedStorage] Migration failed:', error);
    return false;
  }
}
