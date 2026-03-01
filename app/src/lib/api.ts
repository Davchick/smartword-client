import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';
const ACCESS_TOKEN_KEY = 'smartword_access_token';
const REFRESH_TOKEN_KEY = 'smartword_refresh_token';

export function getBaseUrl(): string {
  return API_URL.replace(/\/$/, '');
}

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY, accessToken],
    [REFRESH_TOKEN_KEY, refreshToken],
  ]);
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken || !getBaseUrl()) return null;
  const res = await fetch(`${getBaseUrl()}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.access_token) {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
    if (data.refresh_token) await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
    return data.access_token;
  }
  return null;
}

export type ApiRequestInit = RequestInit & { skipAuth?: boolean };

export async function apiFetch(path: string, init: ApiRequestInit = {}): Promise<Response> {
  const base = getBaseUrl();
  if (!base) {
    throw new Error('EXPO_PUBLIC_API_URL is not set');
  }
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const { skipAuth, ...fetchInit } = init;
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
  }

  let res = await fetch(url, { ...fetchInit, headers });
  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(url, { ...fetchInit, headers });
    }
  }
  return res;
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const res = await apiFetch(path, { method: 'GET' });
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
