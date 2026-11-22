import { expect, it } from 'vitest';
import { todayIn } from '../src/dates.js';

it('uses Santiago date near midnight', () => {
  expect(todayIn('America/Santiago', new Date('2026-11-23T02:30:00Z'))).toBe(
    '2026-11-22',
  );
});

it('uses the requested time zone and pads the calendar date', () => {
  const now = new Date('2026-01-02T01:00:00Z');
  expect(todayIn('UTC', now)).toBe('2026-01-02');
  expect(todayIn('America/Santiago', now)).toBe('2026-01-01');
});
