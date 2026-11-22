import { createHash } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import pg from 'pg';
import type { DemoIdentity, Locale } from '@flowdesk/shared';
import es from '../messages/es.json' with { type: 'json' };
import en from '../messages/en.json' with { type: 'json' };

export { expect, test } from '@playwright/test';

export const messages = { es, en };
export const paths = {
  es: {
    list: '/es/app/solicitudes',
    form: '/es/app/solicitudes/nueva',
    approvals: '/es/app/aprobaciones',
    queue: '/es/app/cola',
  },
  en: {
    list: '/en/app/requests',
    form: '/en/app/requests/new',
    approvals: '/en/app/approvals',
    queue: '/en/app/queue',
  },
} as const;

// Playwright supplies a fresh browser context (and cookie jar) for every test.
export async function startDemo(page: Page, locale: Locale = 'es') {
  await page.goto(`/${locale}`);
  await page
    .getByRole('button', {
      name: messages[locale].welcome.tryDemo,
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(new RegExp(`${paths[locale].list}$`));
  await expect(
    page.getByRole('heading', {
      name: messages[locale].app.nav.requests,
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(6);
}

export async function fillNewRequest(
  page: Page,
  software: string,
  locale: Locale = 'es',
) {
  const t = messages[locale];
  await page.getByRole('link', { name: t.requests.new, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${paths[locale].form}$`));
  await page
    .getByLabel(t.requestForm.softwareName, { exact: true })
    .fill(software);
  await page
    .getByLabel(t.requestForm.justification, { exact: true })
    .fill('Access required to prepare the weekly team report.');
}

export async function createRequest(
  page: Page,
  software: string,
  locale: Locale = 'es',
) {
  await fillNewRequest(page, software, locale);
  await page
    .getByRole('button', {
      name: messages[locale].requestForm.submit,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('heading', { name: `FD-0006 · ${software}`, exact: true }),
  ).toBeVisible();
  return page.url();
}

export async function switchIdentity(
  page: Page,
  identity: DemoIdentity,
  locale: Locale = 'es',
) {
  const t = messages[locale];
  await page
    .getByRole('combobox', { name: t.app.viewingAs, exact: true })
    .click();
  await page
    .getByRole('option', {
      name: new RegExp(` · ${t.app.identities[identity]}$`),
    })
    .click();
  const destination = {
    employee: paths[locale].list,
    approver: paths[locale].approvals,
    it_agent: paths[locale].queue,
  };
  await expect(page).toHaveURL(new RegExp(`${destination[identity]}$`));
  await expect(
    page.getByRole('combobox', { name: t.app.viewingAs, exact: true }),
  ).toContainText(t.app.identities[identity]);
}

export async function openRequest(
  page: Page,
  code: string,
  locale: Locale = 'es',
) {
  await page
    .getByRole('link', {
      name: messages[locale].requests.open.replace('{code}', code),
      exact: true,
    })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(code);
}

export async function expireCurrentSpace(page: Page): Promise<void> {
  const cookie = (await page.context().cookies(page.url())).find(
    ({ name }) => name === 'fd_session',
  );
  if (!cookie) throw new Error('The current page has no fd_session cookie.');

  const client = new pg.Client({
    connectionString:
      process.env.DATABASE_URL ??
      'postgresql://flowdesk:flowdesk_dev_only@127.0.0.1:5432/flowdesk',
    connectionTimeoutMillis: 10_000,
  });
  try {
    await client.connect();
    const result = await client.query(
      `UPDATE demo_spaces
       SET hard_expires_at = now() - interval '1 minute'
       WHERE id = (SELECT demo_space_id FROM sessions WHERE token_hash = $1)`,
      [createHash('sha256').update(cookie.value).digest()],
    );
    expect(
      result.rowCount,
      'Exactly the current session space must expire',
    ).toBe(1);
  } finally {
    await client.end();
  }
}
