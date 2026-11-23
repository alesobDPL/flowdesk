import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  expect,
  fillNewRequest,
  messages,
  openRequest,
  paths,
  switchIdentity,
  test,
} from './fixtures';

const output = new URL('../demo-video/', import.meta.url);

test.use({
  viewport: { width: 1280, height: 720 },
  video: { mode: 'on', size: { width: 1280, height: 720 } },
});

test.afterEach(async ({ page, context }, testInfo) => {
  const video = page.video();
  // Closing the context flushes the recording before copying it to a stable path.
  await context.close();
  if (testInfo.status === 'passed' && video) {
    await mkdir(output, { recursive: true });
    await video.saveAs(fileURLToPath(new URL('flowdesk-tour.webm', output)));
  }
});

test('records the English guided tour', { tag: '@video' }, async ({ page }) => {
  test.setTimeout(45_000);
  const t = messages.en;
  // Deliberate reading time for the recording; assertions handle UI readiness.
  const pause = () => page.waitForTimeout(750);
  const approvalComment = 'Approved for the design team.';
  const completionNote = 'Figma access granted manually.';

  await page.goto('/en');
  const start = page.getByRole('button', {
    name: t.welcome.tryDemo,
    exact: true,
  });
  await expect(start).toBeEnabled();
  await pause();
  await start.click();
  await expect(page).toHaveURL(new RegExp(`${paths.en.list}$`));
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(6);
  await pause();

  await fillNewRequest(page, 'Figma', 'en');
  await pause();
  await page
    .getByRole('button', { name: t.requestForm.submit, exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'FD-0006 · Figma', exact: true }),
  ).toBeVisible();
  const status = (name: string) =>
    page.getByRole('main').getByText(name, { exact: true });
  await expect(status(t.statuses.pending_approval)).toBeVisible();
  await pause();

  await switchIdentity(page, 'approver', 'en');
  await expect(
    page.getByRole('link', { name: 'Open request FD-0006', exact: true }),
  ).toBeVisible();
  await pause();
  await openRequest(page, 'FD-0006', 'en');
  await expect(status(t.statuses.pending_approval)).toBeVisible();
  await pause();
  await page
    .getByRole('button', { name: t.actions.approve, exact: true })
    .click();
  const approval = page.getByRole('dialog', {
    name: t.actions.approve,
    exact: true,
  });
  await approval
    .getByLabel(t.actionDialog.labels.approve, { exact: true })
    .fill(approvalComment);
  await pause();
  await approval
    .getByRole('button', { name: t.actions.approve, exact: true })
    .click();
  await expect(approval).toBeHidden();
  await expect(status(t.statuses.approved)).toBeVisible();
  await pause();

  await switchIdentity(page, 'it_agent', 'en');
  await expect(
    page.getByRole('link', { name: 'Open request FD-0006', exact: true }),
  ).toBeVisible();
  await pause();
  await openRequest(page, 'FD-0006', 'en');
  await expect(status(t.statuses.approved)).toBeVisible();
  await pause();
  await page
    .getByRole('button', { name: t.actions.assign, exact: true })
    .click();
  await expect(status(t.statuses.in_progress)).toBeVisible();
  await pause();
  await page
    .getByRole('button', { name: t.actions.complete, exact: true })
    .click();
  const completion = page.getByRole('dialog', {
    name: t.actions.complete,
    exact: true,
  });
  await completion
    .getByLabel(t.actionDialog.labels.complete, { exact: true })
    .fill(completionNote);
  await pause();
  await completion
    .getByRole('button', { name: t.actions.complete, exact: true })
    .click();
  await expect(completion).toBeHidden();
  await expect(status(t.statuses.completed)).toBeVisible();
  await pause();

  await switchIdentity(page, 'employee', 'en');
  await expect(
    page.getByRole('link', { name: 'Open request FD-0006', exact: true }),
  ).toBeVisible();
  await pause();
  await openRequest(page, 'FD-0006', 'en');
  await expect(status(t.statuses.completed)).toBeVisible();
  await pause();
  const history = page.getByRole('list', { name: t.timeline.title });
  await expect(history.getByRole('heading')).toHaveText([
    t.events.created,
    t.events.approved,
    t.events.assigned,
    t.events.completed,
  ]);
  await history.getByRole('listitem').first().scrollIntoViewIfNeeded();
  await pause();
  await history
    .getByText(approvalComment, { exact: true })
    .scrollIntoViewIfNeeded();
  await pause();
  await history.getByRole('listitem').last().scrollIntoViewIfNeeded();
  await expect(
    history.getByText(completionNote, { exact: true }),
  ).toBeInViewport();
  await pause();
});
