const API_BASE = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, method = 'GET', ...rest } = options;
  const mutating = method !== 'GET' && method !== 'HEAD';
  const payload = body !== undefined ? JSON.stringify(body) : mutating ? '{}' : undefined;

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    method,
    credentials: 'include',
    headers: {
      ...(mutating ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: payload,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data.error ?? 'Request failed',
      response.status,
      data.code,
      data.details,
    );
  }

  return data as T;
}
