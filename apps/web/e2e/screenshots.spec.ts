import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import {
  expect,
  fillNewRequest,
  openRequest,
  paths,
  startDemo,
  switchIdentity,
  test,
} from './fixtures';

test.use({ reducedMotion: 'reduce' });

const assets = new URL('../../../docs/assets/', import.meta.url);

async function capture(page: Page, filename: string) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.screenshot({
    path: fileURLToPath(new URL(filename, assets)),
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
  });
}

test(
  'captures the English documentation screens',
  { tag: '@screenshots' },
  async ({ page, isMobile }) => {
    await mkdir(assets, { recursive: true });
    if (isMobile) {
      await startDemo(page, 'en');
      await fillNewRequest(page, 'Figma', 'en');
      await capture(page, 'mobile-new-request-en.png');
      return;
    }

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/en');
    await expect(
      page.getByRole('button', { name: 'Try the demo', exact: true }),
    ).toBeEnabled();
    await capture(page, 'welcome-en.png');

    await startDemo(page, 'en');
    await capture(page, 'requester-list-en.png');
    await fillNewRequest(page, 'Figma', 'en');
    await capture(page, 'new-request-en.png');

    await page.goto(paths.en.list);
    await openRequest(page, 'FD-0001', 'en');
    await expect(
      page
        .getByRole('list', { name: 'History', exact: true })
        .getByRole('listitem'),
    ).toHaveCount(4);
    await capture(page, 'request-detail-en.png');

    await switchIdentity(page, 'approver', 'en');
    await expect(
      page.getByRole('link', { name: 'Open request FD-0005', exact: true }),
    ).toBeVisible();
    await capture(page, 'approvals-inbox-en.png');

    await switchIdentity(page, 'it_agent', 'en');
    await expect(
      page.getByRole('link', { name: 'Open request FD-0004', exact: true }),
    ).toBeVisible();
    await capture(page, 'it-queue-en.png');
  },
);
