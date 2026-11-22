import { ERROR_CODES, type ErrorCode } from '@flowdesk/shared';

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(code);
    this.name = 'ApiClientError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function apiFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const body =
    init.body ?? (method === 'POST' || method === 'PUT' ? {} : undefined);
  const response = await fetch(
    `/api/v1${path.startsWith('/') ? path : `/${path}`}`,
    {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
  );
  if (!response.ok) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      /* A proxy may return HTML. */
    }
    const error =
      isRecord(payload) && isRecord(payload.error) ? payload.error : undefined;
    const code =
      ERROR_CODES.find((code) => code === error?.code) ?? 'INTERNAL_ERROR';
    throw new ApiClientError(
      response.status,
      code,
      isRecord(error?.details) ? error.details : {},
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
