import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, expect, it } from 'vitest';
import es from '../messages/es.json';
import en from '../messages/en.json';
import { FlowPanel } from '../src/components/flow-panel';

afterEach(cleanup);

it.each([
  { locale: 'es', messages: es },
  { locale: 'en', messages: en },
])(
  'keeps an ordered list with the three current step titles in $locale',
  ({ locale, messages }) => {
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <FlowPanel />
      </NextIntlClientProvider>,
    );
    const list = screen.getByRole('list');
    expect(list.tagName).toBe('OL');
    const steps = within(list).getAllByRole('listitem');
    expect(steps).toHaveLength(3);
    const titles = ['requestTitle', 'approveTitle', 'completeTitle'] as const;
    const descriptions = [
      'requestDescription',
      'approveDescription',
      'completeDescription',
    ] as const;
    steps.forEach((step, index) => {
      expect(
        within(step).getByRole('heading', {
          name: messages.welcome[titles[index]!],
        }),
      ).toBeDefined();
      expect(
        within(step).getByText(messages.welcome[descriptions[index]!]),
      ).toBeDefined();
    });
  },
);

it('sample request is decorative', () => {
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <FlowPanel />
    </NextIntlClientProvider>,
  );
  const sample = screen.getByText('FD-0005 · Notion · Edición');
  expect(sample.closest('[aria-hidden="true"]')).not.toBeNull();
});

it('replay restarts the sequence with Enter and Space without moving focus', async () => {
  const user = userEvent.setup();
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <FlowPanel />
    </NextIntlClientProvider>,
  );
  const replay = screen.getByRole('button', {
    name: 'Ver de nuevo',
  });
  await user.tab();
  expect(document.activeElement).toBe(replay);
  let sequence = screen.getByRole('list').closest('.flow-sequence')!;
  for (const key of ['{Enter}', ' ']) {
    await user.keyboard(key);
    const nextSequence = screen.getByRole('list').closest('.flow-sequence')!;
    expect(nextSequence).not.toBe(sequence);
    expect(sequence.isConnected).toBe(false);
    expect(document.activeElement).toBe(replay);
    expect(screen.getAllByRole('list')).toHaveLength(1);
    sequence = nextSequence;
  }
});
