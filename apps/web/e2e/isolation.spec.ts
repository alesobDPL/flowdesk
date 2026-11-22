import { devices } from '@playwright/test';
import { createRequest, expect, paths, startDemo, test } from './fixtures';

test("two browser contexts never see each other's requests", async ({
  page,
  browser,
  baseURL,
  isMobile,
}) => {
  // Copy the project's context options (including the mobile device), not cookies.
  const otherContext = await browser.newContext({
    ...devices[isMobile ? 'Pixel 7' : 'Desktop Chrome'],
    baseURL,
  });
  try {
    const otherPage = await otherContext.newPage();
    await startDemo(page);
    await startDemo(otherPage);
    const detailA = await createRequest(page, 'Isolation-A');
    const detailB = await createRequest(otherPage, 'Isolation-B');

    await otherPage.goto(paths.es.list);
    await otherPage
      .getByRole('textbox', { name: 'Buscar solicitudes', exact: true })
      .fill('Isolation-A');
    await expect(
      otherPage.getByText(
        'No hay solicitudes con estos filtros. Prueba otro estado o búsqueda.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(otherPage.getByRole('table')).toHaveCount(0);

    await otherPage.goto(detailA);
    await expect(otherPage).toHaveURL(new RegExp(`${paths.es.list}$`));
    await expect(
      otherPage
        .getByRole('table')
        .getByRole('cell', { name: 'Isolation-B', exact: true }),
    ).toBeVisible();
    await expect(
      otherPage.getByRole('main').getByText('Isolation-A', { exact: true }),
    ).toHaveCount(0);

    await page.goto(paths.es.list);
    await page
      .getByRole('textbox', { name: 'Buscar solicitudes', exact: true })
      .fill('Isolation-B');
    await expect(
      page.getByText(
        'No hay solicitudes con estos filtros. Prueba otro estado o búsqueda.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.getByRole('table')).toHaveCount(0);
    await page.goto(detailB);
    await expect(page).toHaveURL(new RegExp(`${paths.es.list}$`));
    await expect(
      page
        .getByRole('table')
        .getByRole('cell', { name: 'Isolation-A', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('main').getByText('Isolation-B', { exact: true }),
    ).toHaveCount(0);
  } finally {
    await otherContext.close();
  }
});
