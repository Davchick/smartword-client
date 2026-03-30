import * as SecureStore from 'expo-secure-store';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || '';
const ACCESS_TOKEN_KEY = 'smartword_access_token';
const REFRESH_TOKEN_KEY = 'smartword_refresh_token';

/**
 * API request timeout in milliseconds (15 seconds)
 */
export const API_TIMEOUT_MS = 15000;

/**
 * Get base API URL with HTTPS enforcement for production.
 * - Development: Allows HTTP for local testing
 * - Production: Requires HTTPS only
 */
export function getBaseUrl(): string {
  const url = API_URL.replace(/\/$/, '');

  // In production (__DEV__ is false), enforce HTTPS
  if (!__DEV__ && !url.startsWith('https://')) {
    console.error('[SECURITY] Production API must use HTTPS. Current URL:', url);
    throw new Error('Ошибка конфигурации: в production требуется HTTPS');
  }

  return url;
}

/**
 * Get access token from secure storage.
 * SecureStore encrypts data:
 * - iOS: Keychain
 * - Android: Encrypted SharedPreferences
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('[SecureStore] Failed to get access token:', error);
    return null;
  }
}

/**
 * Get refresh token from secure storage.
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('[SecureStore] Failed to get refresh token:', error);
    return null;
  }
}

/**
 * Store both tokens securely.
 */
export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    console.error('[SecureStore] Failed to set tokens:', error);
    throw error;
  }
}

/**
 * Remove tokens from secure storage.
 */
export async function clearTokens(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('[SecureStore] Failed to clear tokens:', error);
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken || !getBaseUrl()) return null;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  
  try {
    const res = await fetch(`${getBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.access_token) {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.access_token);
      if (data.refresh_token) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refresh_token);
      return data.access_token;
    }
    return null;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[refreshAccessToken] Error:', error);
    return null;
  }
}

export type ApiRequestInit = RequestInit & { skipAuth?: boolean; timeoutMs?: number };

export async function apiFetch(path: string, init: ApiRequestInit = {}): Promise<Response> {
  const base = getBaseUrl();
  if (!base) {
    throw new Error('EXPO_PUBLIC_API_URL не настроен');
  }
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
  console.log('[apiFetch] URL:', url, 'Path:', path);
  const { skipAuth, timeoutMs = API_TIMEOUT_MS, ...fetchInit } = init;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((fetchInit.headers as Record<string, string>) || {}),
  };

  if (!skipAuth) {
    let token = await getAccessToken();
    if (!token) {
      token = await refreshAccessToken();
    }
    if (token) headers.Authorization = `Bearer ${token}`;
    console.log('[apiFetch] Token:', token ? 'present' : 'missing');
  }

  console.log('[apiFetch] Fetching...', url);
  
  // Create abort controller with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    let res = await fetch(url, { ...fetchInit, headers, signal: controller.signal });
    clearTimeout(timeoutId);
    console.log('[apiFetch] Response:', res.status, res.url);
    
    if (res.status === 401 && !skipAuth) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        headers.Authorization = `Bearer ${newToken}`;
        // Second request with new token (also with timeout)
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), timeoutMs);
        try {
          res = await fetch(url, { ...fetchInit, headers, signal: controller2.signal });
          clearTimeout(timeoutId2);
        } catch (err) {
          clearTimeout(timeoutId2);
          throw err;
        }
      } else {
        await clearTokens();
      }
    }
    return res;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[apiFetch] Error:', error);
    // Re-throw with more descriptive message for timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Превышено время ожидания ответа от сервера (${timeoutMs}мс). Проверьте подключение к интернету.`);
    }
    throw error;
  }
}

export async function apiGet<T = unknown>(path: string, init?: ApiRequestInit): Promise<T> {
  const res = await apiFetch(path, { method: 'GET', ...init });
  const text = await res.text();
  if (!res.ok) {
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      //
    }
    throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status, body });
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function apiPost<T = unknown>(path: string, body?: unknown, init?: ApiRequestInit): Promise<T> {
  const res = await apiFetch(path, {
    ...init,
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      //
    }
    throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status, body: parsed });
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function apiPatch<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      //
    }
    throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status, body: parsed });
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function apiDelete(path: string): Promise<void> {
  const res = await apiFetch(path, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      //
    }
    throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status, body });
  }
}
