/**
 * useApiError — хук для показа ошибок API через Toast.
 *
 * Использование:
 * - В catch блока: const { handleApiError } = useApiError();
 *   catch (err) { handleApiError(err, 'Не удалось сохранить'); }
 * - Или просто: handleApiError(err) — покажет авто-сообщение
 */

import { useCallback } from 'react';
import { useToast } from '../components/Toast';
import { formatApiError } from '../lib/apiError';

export function useApiError() {
  const { showToast } = useToast();

  const handleApiError = useCallback(
    (error: unknown, prefix?: string) => {
      const message = formatApiError(error, prefix ?? 'Произошла ошибка. Попробуйте ещё раз.');
      const fullMessage = prefix && !message.startsWith(prefix) ? `${prefix}: ${message}` : message;
      showToast(fullMessage, 'error', 4000);
      console.error('[useApiError]', error);
    },
    [showToast]
  );

  const handleApiWarning = useCallback(
    (message: string) => {
      showToast(message, 'info', 3500);
    },
    [showToast]
  );

  return { handleApiError, handleApiWarning };
}
