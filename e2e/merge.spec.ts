import { expect, test, type Page } from '@playwright/test';
import { openApp } from './helpers/app';
import { merge, RECENT } from './fixtures/parcheesi';
import { IPAD_FILE } from './fixtures/merge';

/** Everything in the database except backups and settings, sorted, for before/after comparisons. */
const snapshot = (page: Page) =>
  page.evaluate(async () => {
    const req = indexedDB.open('game-score-tracker');
    const dbh: IDBDatabase = await new Promise((r) => (req.onsuccess = () => r(req.result)));
    const out: Record<string, unknown[]> = {};
    for (const store of ['players', 'matches', 'matchPlayers', 'rounds', 'turnLogs']) {
      out[store] = await new Promise((r) => {
        const q = dbh.transaction(store).objectStore(store).getAll();
        q.onsuccess = () => r((q.result as { id: string }[]).sort((a, b) => a.id.localeCompare(b.id)));
      });
    }
    out.backups = await new Promise((r) => {
      const q = dbh.transaction('backups').objectStore('backups').getAll();
      q.onsuccess = () => r((q.result as { reason: string }[]).map((b) => b.reason));
    });
    return out;
  });

const upload = (page: Page) =>
  page.getByLabel('File to merge').setInputFiles({ name: 'ipad.backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(IPAD_FILE)) });

test('merge: preview, automatic backup, Merge these?, and a second run changes nothing (FR-16)', async ({ page }) => {
  await openApp(page, '#/settings', merge(...RECENT));
  const before = await snapshot(page);

  await upload(page);
  const preview = page.getByRole('dialog', { name: 'Merge preview' });
  await expect(preview.getByRole('list', { name: 'Merge preview' })).toContainText('New games2');
  await expect(preview.getByRole('list', { name: 'Merge preview' })).toContainText('New players2');
  expect(await snapshot(page)).toEqual(before); // the preview changes nothing (AC-2)

  await preview.getByRole('button', { name: 'Merge' }).click();
  // A backup was saved before applying (AC-3).
  await expect.poll(async () => (await snapshot(page)).backups).toEqual(['Before merging a file']);

  // Same-name players are flagged (AC-4).
  const these = page.getByRole('dialog', { name: 'Merge these?' });
  await expect(these).toContainText('Two players are called Alex.');
  await these.getByRole('button', { name: 'Merge into one' }).click();
  await expect(these).toBeHidden();
  await expect(page.getByText('Merged: 2 new games, 2 new players.')).toBeVisible();

  await page.goto('./#/players');
  await expect(page.getByRole('button', { name: /^Alex/ })).toHaveCount(1);
  await expect(page.getByRole('button', { name: /^Alex/ })).toContainText('5 games');
  await expect(page.getByRole('button', { name: /^Pat/ })).toBeVisible();

  // Run the same merge again: the preview says there's nothing to do, and nothing changes.
  await page.goto('./#/settings');
  const afterFirst = await snapshot(page);
  await upload(page);
  await expect(preview.getByRole('button', { name: 'Nothing to merge' })).toBeDisabled();
  await preview.getByRole('button', { name: 'Cancel' }).click();
  const afterSecond = await snapshot(page);
  expect(afterSecond).toEqual(afterFirst);
});

test('undo last merge restores the automatic backup', async ({ page }) => {
  await openApp(page, '#/settings', merge(...RECENT));
  const before = await snapshot(page);
  await upload(page);
  await page.getByRole('dialog', { name: 'Merge preview' }).getByRole('button', { name: 'Merge' }).click();
  await page.getByRole('dialog', { name: 'Merge these?' }).getByRole('button', { name: 'Keep both' }).click();
  await page.getByRole('button', { name: /Undo last merge/ }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Undo merge' }).click();
  await expect(page.getByText('Merge undone.')).toBeVisible();
  const after = await snapshot(page);
  expect({ ...after, backups: [] }).toEqual({ ...before, backups: [] });
});

test('the Merge players tool refuses two players from the same game (R-9)', async ({ page }) => {
  await openApp(page, '#/settings', merge(...RECENT));
  await page.getByRole('button', { name: 'Merge players' }).click();
  const tool = page.getByRole('dialog', { name: 'Merge players' });
  await tool.getByRole('radiogroup', { name: 'Keep' }).getByRole('radio', { name: 'Alex' }).click();
  await tool.getByRole('radiogroup', { name: 'Merge in and remove' }).getByRole('radio', { name: 'Sam' }).click();
  await tool.getByRole('button', { name: 'Merge', exact: true }).click();
  await expect(tool.getByRole('alert')).toHaveText('They played in the same game, so they must be different people.');
});
