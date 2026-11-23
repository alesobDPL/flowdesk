import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import {
  expect,
  openRequest,
  paths,
  startDemo,
  switchIdentity,
  test,
} from './fixtures';

test.use({ reducedMotion: 'reduce' });

async function checkAccessibility(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter(
      ({ impact }) => impact === 'serious' || impact === 'critical',
    ),
  ).toEqual([]);
}

test('has no serious or critical axe violations on the main screens in Spanish', async ({
  page,
}) => {
  await test.step('welcome', async () => {
    await page.goto('/es');
    await expect(
      page.getByRole('button', { name: 'Probar demo', exact: true }),
    ).toBeEnabled();
    await checkAccessibility(page);
  });
  await startDemo(page);
  await test.step('list', async () => {
    await checkAccessibility(page);
  });
  await test.step('form', async () => {
    await page
      .getByRole('link', { name: 'Nueva solicitud', exact: true })
      .click();
    await expect(
      page.getByRole('textbox', {
        name: 'Software o herramienta',
        exact: true,
      }),
    ).toBeVisible();
    await checkAccessibility(page);
  });
  await test.step('detail', async () => {
    await page.goto(paths.es.list);
    await openRequest(page, 'FD-0001');
    await expect(
      page.getByRole('list', { name: 'Historial', exact: true }),
    ).toBeVisible();
    await checkAccessibility(page);
  });
  await test.step('inbox', async () => {
    await switchIdentity(page, 'approver');
    await expect(
      page.getByRole('link', { name: 'Abrir solicitud FD-0005', exact: true }),
    ).toBeVisible();
    await checkAccessibility(page);
  });
  await test.step('queue', async () => {
    await switchIdentity(page, 'it_agent');
    await expect(
      page.getByRole('link', { name: 'Abrir solicitud FD-0004', exact: true }),
    ).toBeVisible();
    await checkAccessibility(page);
  });
});
