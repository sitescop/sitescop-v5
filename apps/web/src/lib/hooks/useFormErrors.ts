import { useCallback, useState } from 'react';
import { ApiError } from '@/lib/api-client';

export function useFormErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearErrors = useCallback(() => setErrors({}), []);

  const handleError = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.details) {
      const mapped: Record<string, string> = {};
      for (const [key, messages] of Object.entries(error.details)) {
        mapped[key] = messages[0] ?? 'Invalid value';
      }
      setErrors(mapped);
      return error.message;
    }
    if (error instanceof ApiError) return error.message;
    return 'Something went wrong. Please try again.';
  }, []);

  const fieldError = useCallback((name: string) => errors[name], [errors]);

  return { errors, setErrors, clearErrors, handleError, fieldError };
}
