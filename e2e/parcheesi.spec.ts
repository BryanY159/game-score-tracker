import { expect, test } from '@playwright/test';
import { openApp } from './helpers/app';
import { FOUR } from './fixtures/players';

// A full Parcheesi game through the UI: setup, scoring, results, finalize (M2).
test('play a full Parcheesi game', async ({ page }) => {
  await openApp(page, '#/', { players: FOUR });
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByRole('button', { name: /Parcheesi/ }).click();

  const start = page.getByRole('button', { name: 'Start game' });
  await page.getByRole('button', { name: 'Alex', exact: true }).click();
  await expect(start).toBeDisabled(); // 1 player, below the range (FR-3 AC-1)
  await page.getByRole('button', { name: 'Sam', exact: true }).click();
  await page.getByRole('button', { name: 'Guest' }).click();
  await page.getByRole('dialog').getByRole('textbox').fill('Pat');
  await page.getByRole('button', { name: 'Add guest' }).click();
  // Pat goes first (rotates the order).
  await page.getByRole('button', { name: 'Pat options' }).click();
  await page.getByRole('button', { name: 'Goes first' }).click();
  await expect(page.getByRole('button', { name: /options$/ })).toHaveText([/Pat/, /Alex/, /Sam/]);
  await start.click();

  await expect(page.getByRole('heading', { name: 'Parcheesi' })).toBeVisible();
  const add = (name: string) => page.getByRole('button', { name: `More pawns home for ${name}` });
  for (let i = 0; i < 4; i++) await add('Sam').click();
  await expect(page.getByText('1st')).toBeVisible();
  await add('Alex').click();
  // Undo the last entry (FR-5 AC-4).
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByLabel('pawns home for Alex', { exact: true })).toHaveText('0');
  await add('Pat').click();
  for (let i = 0; i < 4; i++) await add('Alex').click();

  // Alex 2nd, Pat placed last automatically, straight to Results (FR-6 AC-3).
  await expect(page.getByRole('heading', { name: 'Sam wins' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit scores' }).click();
  await expect(page.getByRole('heading', { name: 'Parcheesi' })).toBeVisible();
  await page.getByRole('button', { name: 'See results' }).click();
  await page.getByRole('button', { name: 'Finalize' }).click();

  await expect(page.getByRole('heading', { name: 'Game Night' })).toBeVisible();
  await expect(page.getByText('In progress')).toHaveCount(0);
  // The saved result (FR-6 AC-4).
  const saved = await page.evaluate(async () => {
    const req = indexedDB.open('game-score-tracker');
    const dbh: IDBDatabase = await new Promise((r) => (req.onsuccess = () => r(req.result)));
    const all = <T,>(store: string) =>
      new Promise<T[]>((r) => {
        const q = dbh.transaction(store).objectStore(store).getAll();
        q.onsuccess = () => r(q.result);
      });
    const [m] = await all<{ status: string; endedAt: number }>('matches');
    const mps = await all<{ placement: number; isWinner: boolean; details: { pawnsHome: number } }>('matchPlayers');
    return { status: m!.status, ended: !!m!.endedAt, seats: mps.map((x) => [x.placement, x.isWinner, x.details.pawnsHome]).sort() };
  });
  expect(saved).toEqual({ status: 'finished', ended: true, seats: [[1, true, 4], [2, false, 4], [3, false, 1]] });
});

test('save happens on every tap: a reload mid-game keeps the state (R-7)', async ({ page }) => {
  await openApp(page, '#/', { players: FOUR });
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByRole('button', { name: /Parcheesi/ }).click();
  await page.getByRole('button', { name: 'Alex', exact: true }).click();
  await page.getByRole('button', { name: 'Sam', exact: true }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.getByRole('button', { name: 'More pawns home for Sam' }).click();
  await page.getByRole('button', { name: 'More pawns home for Sam' }).click();
  // The screen reads from the database, so seeing 2 means it's stored.
  await expect(page.getByLabel('2 of 4 pawns home')).toBeVisible();
  await page.goto('./#/');
  await page.reload();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByLabel('2 of 4 pawns home')).toBeVisible();
});

test('cancel asks first, then discards the game (FR-5 AC-3)', async ({ page }) => {
  await openApp(page, '#/', { players: FOUR });
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByRole('button', { name: /Parcheesi/ }).click();
  await page.getByRole('button', { name: 'Alex', exact: true }).click();
  await page.getByRole('button', { name: 'Sam', exact: true }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Keep' }).click();
  await expect(page.getByRole('heading', { name: 'Parcheesi' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Discard' }).click();
  await expect(page.getByRole('heading', { name: 'Game Night' })).toBeVisible();
  await expect(page.getByText('In progress')).toHaveCount(0);
});
