import { ERROR_CODES } from '@flowdesk/shared';
import { describe, expect, it } from 'vitest';
import en from '../messages/en.json';
import es from '../messages/es.json';

function keys(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === 'object' && child !== null
      ? keys(child as Record<string, unknown>, path)
      : [path];
  });
}

describe('messages', () => {
  it('es and en have identical key sets', () => {
    expect(keys(es).sort()).toEqual(keys(en).sort());
  });

  for (const [locale, messages] of Object.entries({ es, en })) {
    it(`every ErrorCode has errors.<code> in ${locale}`, () => {
      for (const code of ERROR_CODES) {
        expect(keys(messages)).toContain(`errors.${code}`);
        expect(messages.errors[code]).not.toBe('');
      }
    });

    it(`every zod code used by shared schemas has validation.<code> in ${locale}`, () => {
      for (const code of [
        'too_short',
        'too_long',
        'required',
        'date_in_past',
      ]) {
        expect(keys(messages)).toContain(`validation.${code}`);
      }
    });
  }
});
