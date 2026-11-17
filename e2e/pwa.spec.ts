import { expect, test } from '@playwright/test';

test('manifest is installable from the Pages sub-path (FR-1, R-8)', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const manifest = await (await request.get(href!)).json();
  expect(manifest).toMatchObject({
    display: 'standalone',
    start_url: '/game-score-tracker/',
    scope: '/game-score-tracker/',
  });
  for (const icon of manifest.icons) {
    expect((await request.get(icon.src)).ok()).toBe(true);
  }
  const touchIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  expect((await request.get(touchIcon!)).ok()).toBe(true);
});

test('works offline after the first load (FR-1 AC-1, NFR-1)', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Make sure this page is controlled by the service worker before going offline.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Game Night' })).toBeVisible();
  await page.getByRole('link', { name: 'History' }).click();
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  await page.goto('./#/players');
  await expect(page.getByRole('heading', { name: 'Players' })).toBeVisible();
});

test('asks for persistent storage on launch (FR-1 AC-3)', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __persistCalls: number }).__persistCalls = 0;
    const storage = navigator.storage;
    storage.persisted = async () => false;
    storage.persist = async () => {
      (window as unknown as { __persistCalls: number }).__persistCalls++;
      return true;
    };
  });
  await page.goto('./');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __persistCalls: number }).__persistCalls)).toBe(1);
});
