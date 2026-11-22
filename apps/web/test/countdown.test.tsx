import { act, cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, expect, it, vi } from 'vitest';
import en from '../messages/en.json';
import { Countdown } from '../src/components/countdown';
import { formatRemaining } from '../src/lib/format';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it('formats hours and minutes in Spanish', () => {
  expect(formatRemaining(6_720_000, 'es')).toBe('1 h 52 min');
});

it('formats less than a minute in English', () => {
  expect(formatRemaining(30_000, 'en')).toBe('<1 min');
});

it('updates every 30 seconds and uses a refreshed expiresAt', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-22T15:00:00Z'));
  const view = (expiresAt: string) => (
    <NextIntlClientProvider locale="en" messages={en}>
      <Countdown expiresAt={expiresAt} />
    </NextIntlClientProvider>
  );
  const { rerender } = render(view('2026-11-22T15:02:00Z'));
  expect(screen.getByRole('timer').textContent).toContain('2 min');
  act(() => {
    vi.advanceTimersByTime(30_000);
  });
  expect(screen.getByRole('timer').textContent).toContain('1 min');
  rerender(view('2026-11-22T15:30:30Z'));
  expect(screen.getByRole('timer').textContent).toContain('30 min');
});
