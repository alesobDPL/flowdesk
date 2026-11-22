import type { ErrorCode } from '@flowdesk/shared';

export function errorMessageKey(code: ErrorCode): string {
  return `errors.${code}`;
}

export function fieldErrorKey(zodCode: string): string {
  const code = ['too_short', 'too_long', 'required', 'date_in_past'].includes(
    zodCode,
  )
    ? zodCode
    : 'required';
  return `validation.${code}`;
}
