import {
  createRequest,
  expect,
  expireCurrentSpace,
  openRequest,
  paths,
  startDemo,
  switchIdentity,
  test,
} from './fixtures';

test('welcome shows continue after reload', async ({ page }) => {
  await startDemo(page);
  await createRequest(page, 'Persisted software');
  await page.goto('/es');
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Continuar demo', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Probar demo', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Continuar demo', exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`${paths.es.list}$`));
  await expect(
    page
      .getByRole('table')
      .getByRole('cell', { name: 'Persisted software', exact: true }),
  ).toBeVisible();
});

test('reset recreates samples', async ({ page }) => {
  await startDemo(page);
  await createRequest(page, 'Discarded software');
  await switchIdentity(page, 'approver');
  await openRequest(page, 'FD-0005');
  await page.getByRole('button', { name: 'Aprobar', exact: true }).click();
  const approval = page.getByRole('dialog', { name: 'Aprobar', exact: true });
  await approval.getByRole('button', { name: 'Aprobar', exact: true }).click();
  await expect(approval).toBeHidden();
  await expect(
    page
      .getByRole('main')
      .getByText('Aprobada · en cola de TI', { exact: true }),
  ).toBeVisible();

  await page
    .getByRole('button', { name: 'Reiniciar demo', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Empezar una nueva demo', exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`${paths.es.list}$`));
  await expect(
    page.getByRole('combobox', { name: 'Viendo como', exact: true }),
  ).toContainText('Empleado');
  const table = page.getByRole('table');
  await expect(table.getByRole('row')).toHaveCount(6);
  for (const [code, software, status] of [
    ['FD-0001', 'Salesforce', 'Completada'],
    ['FD-0002', 'Adobe Acrobat Pro', 'Rechazada'],
    ['FD-0003', 'Jira', 'En ejecución'],
    ['FD-0004', 'Tableau', 'Aprobada · en cola de TI'],
    ['FD-0005', 'Notion', 'Pendiente de aprobación'],
  ] as const) {
    const row = table.getByRole('row').filter({
      has: page.getByRole('link', {
        name: `Abrir solicitud ${code}`,
        exact: true,
      }),
    });
    await expect(row).toContainText(software);
    await expect(row).toContainText(status);
  }
  await expect(
    table.getByText('Discarded software', { exact: true }),
  ).toHaveCount(0);
  await expect(
    table.getByRole('link', { name: 'Abrir solicitud FD-0006', exact: true }),
  ).toHaveCount(0);
  // The new space starts its own sequence after the five regenerated samples.
  await createRequest(page, 'After reset software');
});

test('expired space redirects to demo-caducada on next action', async ({
  page,
}) => {
  await startDemo(page);
  await createRequest(page, 'Expiring software');
  await switchIdentity(page, 'approver');
  await openRequest(page, 'FD-0006');
  await page.getByRole('button', { name: 'Aprobar', exact: true }).click();
  const approval = page.getByRole('dialog', { name: 'Aprobar', exact: true });
  await expect(approval).toBeVisible();
  await expireCurrentSpace(page);
  await approval.getByRole('button', { name: 'Aprobar', exact: true }).click();
  await expect(page).toHaveURL(/\/es\/demo-caducada$/);
  await expect(
    page.getByRole('heading', { name: 'Esta demo ha caducado', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Empezar una nueva demo', exact: true }),
  ).toBeVisible();
});
