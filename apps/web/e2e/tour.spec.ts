import type { Page } from '@playwright/test';
import type { Locale } from '@flowdesk/shared';
import {
  createRequest,
  expect,
  fillNewRequest,
  messages,
  openRequest,
  paths,
  startDemo,
  switchIdentity,
  test,
} from './fixtures';

async function completeTour(page: Page, locale: Locale, mobile: boolean) {
  const t = messages[locale];
  await startDemo(page, locale);
  await createRequest(page, 'Tour software', locale);
  await expect(
    page
      .getByRole('main')
      .getByText(t.statuses.pending_approval, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('list', { name: t.timeline.title }).getByRole('listitem'),
  ).toHaveCount(1);

  await switchIdentity(page, 'approver', locale);
  await openRequest(page, 'FD-0006', locale);
  await page
    .getByRole('button', { name: t.actions.approve, exact: true })
    .click();
  const approval = page.getByRole('dialog', {
    name: t.actions.approve,
    exact: true,
  });
  await approval
    .getByLabel(t.actionDialog.labels.approve, { exact: true })
    .fill('Approved for the team.');
  await approval
    .getByRole('button', { name: t.actions.approve, exact: true })
    .click();
  await expect(approval).toBeHidden();
  await expect(
    page.getByRole('main').getByText(t.statuses.approved, { exact: true }),
  ).toBeVisible();

  await switchIdentity(page, 'it_agent', locale);
  await openRequest(page, 'FD-0006', locale);
  await page
    .getByRole('button', { name: t.actions.assign, exact: true })
    .click();
  await expect(
    page.getByRole('main').getByText(t.statuses.in_progress, { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: t.actions.complete, exact: true })
    .click();
  const completion = page.getByRole('dialog', {
    name: t.actions.complete,
    exact: true,
  });
  await completion
    .getByLabel(t.actionDialog.labels.complete, { exact: true })
    .fill('Access granted manually.');
  await completion
    .getByRole('button', { name: t.actions.complete, exact: true })
    .click();
  await expect(completion).toBeHidden();
  await expect(
    page.getByRole('main').getByText(t.statuses.completed, { exact: true }),
  ).toBeVisible();

  await switchIdentity(page, 'employee', locale);
  await openRequest(page, 'FD-0006', locale);
  await expect(
    page.getByRole('main').getByText(t.statuses.completed, { exact: true }),
  ).toBeVisible();
  const history = page.getByRole('list', { name: t.timeline.title });
  await expect(history.getByRole('listitem')).toHaveCount(4);
  await expect(history.getByRole('heading')).toHaveText([
    t.events.created,
    t.events.approved,
    t.events.assigned,
    t.events.completed,
  ]);
  await expect(
    history.getByText('Access granted manually.', { exact: true }),
  ).toBeVisible();

  if (mobile) {
    await page
      .getByRole('button', { name: t.app.openMenu, exact: true })
      .click();
  }
  const navigation = mobile
    ? page.getByRole('dialog', { name: t.app.navigation, exact: true })
    : page.getByRole('complementary', { name: t.app.navigation, exact: true });
  // Native <summary> has no consistent button role across accessibility engines.
  await navigation.getByText(t.tour.title, { exact: true }).click();
  await expect(navigation.getByRole('checkbox')).toHaveCount(4);
  await expect(navigation.getByRole('checkbox', { checked: true })).toHaveCount(
    4,
  );
}

test('completes the 9-step tour in Spanish', async ({ page, isMobile }) => {
  await completeTour(page, 'es', isMobile);
});

test('completes the tour in English', { tag: '@desktop' }, async ({ page }) => {
  await completeTour(page, 'en', false);
});

test('no horizontal page scroll at 375 px with long values', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'mobile',
    'Mobile layout regression in Spanish.',
  );
  await page.setViewportSize({ width: 375, height: 812 });
  await startDemo(page, 'es');
  const software = 'S'.repeat(100);
  await createRequest(page, software, 'es');
  await page.goto(paths.es.list);
  const row = page.getByRole('row').filter({ hasText: software });
  await expect(row).toHaveCount(1);
  await expect(
    row.getByRole('cell', { name: software, exact: true }),
  ).toHaveAttribute('title', software);
  for (const width of [375, 768]) {
    await page.setViewportSize({ width, height: 812 });
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      )
      .toBe(true);
    for (const text of [
      messages.es.statuses.pending_approval,
      messages.es.statuses.approved,
    ]) {
      const status = page
        .getByRole('table')
        .getByText(text, { exact: true })
        .first();
      await expect(status).toBeVisible();
      await expect
        .poll(() =>
          status.evaluate((element) => {
            const style = getComputedStyle(element);
            return Math.abs(
              element.getBoundingClientRect().height -
                Number.parseFloat(style.lineHeight),
            );
          }),
        )
        .toBeLessThanOrEqual(1);
    }
  }
});

test(
  'keeps one identity control when crossing md',
  { tag: '@desktop' },
  async ({ page }) => {
    await startDemo(page, 'es');
    const identity = page.getByRole('combobox', {
      name: messages.es.app.viewingAs,
      exact: true,
    });
    const original = await identity.elementHandle();
    const timer = await page
      .getByRole('timer', { name: messages.es.countdown.label })
      .elementHandle();
    for (const width of [1024, 375, 768, 1024]) {
      await page.setViewportSize({ width, height: 812 });
      await expect(identity).toHaveCount(1);
      await expect(identity).toBeVisible();
      expect(
        await identity.evaluate(
          (element, initial) => element === initial,
          original,
        ),
      ).toBe(true);
      await expect(
        page.getByRole('timer', { name: messages.es.countdown.label }),
      ).toHaveCount(1);
      expect(
        await page
          .getByRole('timer')
          .evaluate((element, initial) => element === initial, timer),
      ).toBe(true);
      await expect(
        page.getByRole('button', { name: messages.es.app.reset, exact: true }),
      ).toBeVisible();
      expect(
        await page.locator('[id]').evaluateAll((elements) => {
          const ids = elements.map((element) => element.id);
          return ids.length === new Set(ids).size;
        }),
      ).toBe(true);
    }
  },
);

test('double click on submit creates one request', async ({ page }) => {
  await startDemo(page);
  await fillNewRequest(page, 'Double click software');

  // Hold the real API response until both clicks have been sent, so neither
  // navigation nor a fast response can hide the pending-submit behaviour.
  let releaseResponse = () => {};
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  let submissions = 0;
  await page.route('**/api/v1/requests', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    submissions += 1;
    const response = await route.fetch();
    await responseGate;
    await route.fulfill({ response });
  });
  try {
    await page
      .getByRole('button', { name: 'Enviar solicitud', exact: true })
      .dblclick();
    await expect(
      page.getByRole('button', { name: 'Enviando…', exact: true }),
    ).toBeDisabled();
  } finally {
    releaseResponse();
  }
  await expect(
    page.getByRole('heading', {
      name: 'FD-0006 · Double click software',
      exact: true,
    }),
  ).toBeVisible();
  await page.goto(paths.es.list);
  const table = page.getByRole('table');
  await expect(table.getByRole('row')).toHaveCount(7);
  await expect(
    table.getByRole('link', { name: 'Abrir solicitud FD-0006', exact: true }),
  ).toHaveCount(1);
  await expect(
    table.getByRole('link', { name: 'Abrir solicitud FD-0007', exact: true }),
  ).toHaveCount(0);
  await expect(
    table.getByRole('cell', { name: 'Double click software', exact: true }),
  ).toHaveCount(1);
  expect(submissions).toBe(1);
});
