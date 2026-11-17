import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { openApp } from './helpers/app';
import { FOUR } from './fixtures/players';
import { merge, RECENT } from './fixtures/parcheesi';

// FR-15 / FR-17 flows (M4). Headless Chromium has no share sheet, so export falls back to a download.
test('export a backup, then restore it after the data changes', async ({ page }, info) => {
  await openApp(page, '#/settings', merge(...RECENT));
  await expect(page.getByText('Not backed up yet')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup file' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^game-scores-\d{4}-\d{2}-\d{2}\.backup\.json$/);
  const path = info.outputPath('backup.json');
  await file.saveAs(path);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  expect(data).toMatchObject({ app: 'game-score-tracker', schemaVersion: 1 });
  expect(data.tables.matches).toHaveLength(3);
  await expect(page.getByText('Last backup Today')).toBeVisible();
  await expect(page.getByText('0 games since then · 3 games saved')).toBeVisible();

  // Change the data: delete everything but one player.
  await page.evaluate(async () => {
    await window.__test!.reset();
  });
  await page.goto('./#/players');
  await expect(page.getByText('No players yet')).toBeVisible();

  await page.goto('./#/settings');
  await page.getByLabel('Backup file').setInputFiles(path);
  const confirm = page.getByRole('alertdialog', { name: 'Replace all data?' });
  await expect(confirm).toContainText('3 games and 4 players');
  await confirm.getByRole('button', { name: 'Replace' }).click();
  await expect(page.getByText('Backup restored.')).toBeVisible();
  await page.goto('./#/');
  await expect(page.getByText('Recent games')).toBeVisible();
});

test('restore refuses a file that is not a backup', async ({ page }) => {
  await openApp(page, '#/settings', { players: FOUR });
  await page.getByLabel('Backup file').setInputFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
  await expect(page.getByRole('alert')).toHaveText("This file isn't a backup from this app.");
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test('backup reminder appears on Home after 10 games, and clears after a backup (FR-17)', async ({ page }) => {
  // 12 synthetic finished games: four fresh copies of the 3 recent ones, each with new ids.
  const all = merge(...RECENT);
  all.matches = [];
  all.matchPlayers = [];
  for (let copy = 0; copy < 4; copy++) {
    const g = structuredClone(merge(...RECENT));
    for (const m of g.matches) {
      const id = crypto.randomUUID();
      for (const mp of g.matchPlayers.filter((x) => x.matchId === m.id)) {
        mp.matchId = id;
        mp.id = crypto.randomUUID();
      }
      m.id = id;
    }
    all.matches.push(...g.matches);
    all.matchPlayers.push(...g.matchPlayers);
  }
  await openApp(page, '#/', all);
  await expect(page.getByText('12 games not backed up yet')).toBeVisible();
  await page.getByRole('button', { name: 'Back up' }).click();
  await page.getByRole('button', { name: 'Export backup file' }).click();
  await expect(page.getByText('Last backup Today')).toBeVisible();
  await page.goto('./#/');
  await expect(page.getByText(/not backed up yet|since your last backup/)).toHaveCount(0);
});

test('settings persist: reminder mode and minimum games', async ({ page }) => {
  await openApp(page, '#/settings');
  await page.getByRole('radio', { name: 'Month' }).click();
  await page.getByRole('button', { name: 'More games', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Month' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByLabel('6 games')).toBeVisible();
});
