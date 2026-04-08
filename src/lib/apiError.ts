/**
 * Утилита для форматирования и обработки ошибок API.
 *
 * Все ошибки API проходятят через эту функцию — единообразные сообщения
 * и логирование в одном месте.
 */

type ApiError = Error & {
  status?: number;
  body?: unknown;
};

/**
 * Форматирует ошибку API в человекочитаемое сообщение на русском.
 * Если ошибка не от API — возвращает общее сообщение.
 */
export function formatApiError(error: unknown, fallback = 'Произошла ошибка. Попробуйте ещё раз.'): string {
  const err = error as ApiError;

  // AbortError — отмена запроса (нормальная ситуация, не ошибка)
  if (err?.name === 'AbortError' || error instanceof Error && error.message.includes('отменён')) {
    return 'Запрос был отменён';
  }

  // Timeout
  if (error instanceof Error && error.message.includes('Превышено время ожидания')) {
    return 'Сервер не отвечает. Проверьте подключение к интернету и попробуйте снова.';
  }

  // AbortError через name
  if (error instanceof Error && error.name === 'AbortError') {
    return 'Запрос отменён';
  }

  // Network error (TypeError: Network request failed)
  if (error instanceof Error && (
    error.message.includes('Network request failed') ||
    error.message.includes('Failed to fetch') ||
    error.message.includes('NetworkError')
  )) {
    return 'Нет подключения к интернету. Проверьте сеть и попробуйте снова.';
  }

  // API ошибки со статусом
  if (err?.status) {
    const status = err.status;
    const body = err.body;

    // Пробуем достать сообщение из тела ответа
    const serverMessage = extractServerMessage(body);
    if (serverMessage) return serverMessage;

    switch (status) {
      case 400:
        return 'Неверные данные. Проверьте введённую информацию.';
      case 401:
        return 'Сессия истекла. Войдите в аккаунт заново.';
      case 403:
        return 'Доступ запрещён. Возможно, требуется подписка.';
      case 404:
        return 'Данные не найдены. Возможно, они были удалены.';
      case 409:
        return 'Конфликт данных. Возможно, такое слово уже есть.';
      case 429:
        return 'Слишком много запросов. Подождите немного.';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'Сервер временно недоступен. Попробуйте позже.';
      default:
        return `Ошибка сервера (${status}). Попробуйте позже.`;
    }
  }

  // Ошибка с body.error
  if (err?.body) {
    const serverMessage = extractServerMessage(err.body);
    if (serverMessage) return serverMessage;
  }

  // Обычная Error
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

/**
 * Извлекает сообщение об ошибке из тела ответа сервера.
 * Поддерживает форматы: { error: '...' }, { message: '...' },
 * { detail: '...' }, { errors: ['...'] }
 */
function extractServerMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;

  const obj = body as Record<string, unknown>;

  // { error: 'message' }
  if (typeof obj.error === 'string') return obj.error;

  // { message: 'message' }
  if (typeof obj.message === 'string') return obj.message;

  // { detail: 'message' }
  if (typeof obj.detail === 'string') return obj.detail;

  // { errors: ['message1', 'message2'] }
  if (Array.isArray(obj.errors) && obj.errors.length > 0) {
    return obj.errors
      .filter((e): e is string => typeof e === 'string')
      .join('\n') || null;
  }

  return null;
}

/**
 * Проверяет, является ли ошибка ошибкой сети.
 */
export function isNetworkError(error: unknown): boolean {
  const err = error as ApiError;

  if (err?.name === 'AbortError') return false; // отмена — не ошибка сети
  if (error instanceof Error && error.message.includes('отменён')) return false;
  if (error instanceof Error && (
    error.message.includes('Network request failed') ||
    error.message.includes('Failed to fetch') ||
    error.message.includes('NetworkError') ||
    error.message.includes('Превышено время ожидания')
  )) {
    return true;
  }

  // Status 5xx — серверная ошибка, но не network error
  // Status 0 или отсутствие статуса при Error — network error
  if (err?.status) return false;

  return error instanceof Error;
}
