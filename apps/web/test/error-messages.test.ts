import { ERROR_CODES } from '@flowdesk/shared';
import { expect, it } from 'vitest';
import { errorMessageKey, fieldErrorKey } from '../src/lib/error-messages';

it('maps codes to keys', () => {
  for (const code of ERROR_CODES)
    expect(errorMessageKey(code)).toBe(`errors.${code}`);
  for (const code of ['too_short', 'too_long', 'required', 'date_in_past']) {
    expect(fieldErrorKey(code)).toBe(`validation.${code}`);
  }
});

it('uses a translated fallback for unknown validation codes', () => {
  expect(fieldErrorKey('invalid_type')).toBe('validation.required');
});
