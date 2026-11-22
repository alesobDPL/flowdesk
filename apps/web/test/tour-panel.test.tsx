import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, expect, it, vi } from 'vitest';
import en from '../messages/en.json';
import { TourPanel } from '../src/components/tour-panel';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('shows nine steps and only four checkboxes driven by server progress', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      Response.json({
        created: true,
        decided: false,
        assigned: true,
        completed: false,
      }),
    ),
  );
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <QueryClientProvider client={new QueryClient()}>
        <TourPanel />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
  await userEvent.click(screen.getByText('Guided tour'));
  expect(screen.getAllByRole('listitem')).toHaveLength(9);
  await waitFor(() =>
    expect(
      screen.getByRole<HTMLInputElement>('checkbox', {
        name: en.tour.steps['2'],
      }).checked,
    ).toBe(true),
  );
  const boxes = screen.getAllByRole<HTMLInputElement>('checkbox');
  expect(boxes.map((box) => box.checked)).toEqual([true, false, true, false]);
  expect(boxes.every((box) => box.disabled)).toBe(true);
  expect(
    screen.getByRole('checkbox', { name: en.tour.steps['5'] }),
  ).toBeDefined();
  expect(
    screen.getByRole('checkbox', { name: en.tour.steps['7'] }),
  ).toBeDefined();
  expect(
    screen.getByRole('checkbox', { name: en.tour.steps['8'] }),
  ).toBeDefined();
});
