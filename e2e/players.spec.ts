import { expect, test } from '@playwright/test';
import { openApp } from './helpers/app';
import { FOUR, RILEY } from './fixtures/players';

// Interaction flows for FR-2, run once (iPhone 390, light).
test('add a player', async ({ page }) => {
  await openApp(page, '#/players');
  await page.getByRole('button', { name: 'Add player' }).click();
  const sheet = page.getByRole('dialog', { name: 'New player' });
  await sheet.getByRole('textbox').fill('Taylor');
  await sheet.getByRole('radio', { name: '🦄' }).click();
  await sheet.getByRole('radio', { name: 'Purple' }).click();
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByRole('button', { name: /Taylor/ })).toBeVisible();
  // Survives a relaunch.
  await page.reload();
  await expect(page.getByRole('button', { name: /Taylor/ })).toBeVisible();
});

test('a duplicate name is refused', async ({ page }) => {
  await openApp(page, '#/players', { players: FOUR });
  await page.getByRole('button', { name: 'Add player' }).click();
  await page.getByRole('textbox').fill('alex');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('alert')).toHaveText('A player already has this name');
});

test('edit, hide from stats, then delete', async ({ page }) => {
  await openApp(page, '#/players', { players: FOUR });
  await page.getByRole('button', { name: /Sam/ }).click();
  await page.getByRole('switch', { name: 'Hide from stats' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: /Sam.*Hidden from stats/ })).toBeVisible();

  await page.getByRole('button', { name: new RegExp(RILEY.name) }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('button', { name: /Riley/ })).toHaveCount(0);
  // Soft delete: the record is still there for history.
  const stored = await page.evaluate(async (id) => {
    const req = indexedDB.open('game-score-tracker');
    const dbh: IDBDatabase = await new Promise((r) => (req.onsuccess = () => r(req.result)));
    const get = dbh.transaction('players').objectStore('players').get(id);
    return new Promise<{ deletedAt: number | null }>((r) => (get.onsuccess = () => r(get.result)));
  }, RILEY.id);
  expect(stored.deletedAt).not.toBeNull();
});
