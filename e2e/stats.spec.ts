import { expect, test } from '@playwright/test';
import { openApp } from './helpers/app';
import { STATS_HISTORY } from './fixtures/stats';

// FR-14 (M10).
test('per-game win rates, the minimum-games rule, and hidden players (AC-1 to AC-3, FR-2 AC-2)', async ({ page }) => {
  await openApp(page, '#/stats', STATS_HISTORY);
  await page.getByRole('tab', { name: 'Parcheesi' }).click();
  const board = page.getByRole('list', { name: 'Win rate' });
  // Alex 3 of 6 wins, Sam 2 of 6, Jordan 1 of 6.
  await expect(board.getByRole('listitem')).toHaveText([/Alex50%/, /Sam33%/, /Jordan17%/]);
  await page.getByRole('tab', { name: 'Flip 7' }).click();
  await expect(board).toContainText('Casey1 of 5 games played');
  await expect(board).not.toContainText('Morgan'); // hidden from stats
  // Raise the minimum to 6: nobody qualifies for Flip 7 (5 games each).
  await page.goto('./#/settings');
  for (let i = 0; i < 1; i++) await page.getByRole('button', { name: 'More games', exact: true }).click();
  await expect(page.getByLabel('6 games')).toBeVisible();
  await page.goto('./#/stats');
  await page.getByRole('tab', { name: 'Flip 7' }).click();
  await expect(board).toContainText('Alex5 of 6 games played');
});

test('the overall figure averages per-game win rates (A-5)', async ({ page }) => {
  await openApp(page, '#/stats', STATS_HISTORY);
  const rows = page.getByRole('list', { name: 'Win rate' }).getByRole('listitem');
  // Alex qualifies in all five games; Riley only in two (Dutch Blitz, Monopoly).
  await expect(rows.filter({ hasText: 'Alex' })).toContainText('across 5 games');
  await expect(rows.filter({ hasText: 'Riley' })).toContainText('across 2 games');
});

test('head to head: only games both played (AC-4)', async ({ page }) => {
  await openApp(page, '#/stats', STATS_HISTORY);
  await page.getByRole('tab', { name: 'Parcheesi' }).click();
  // Opens on the busiest pair: Alex and Jordan played all 6 Parcheesi games together.
  await expect(page.getByRole('button', { name: /^Change / })).toHaveText([/Alex/, /Jordan/]);
  await page.getByRole('button', { name: 'Change Jordan' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Casey' }).click();
  await expect(page.getByText('No games together yet.')).toBeVisible();
  await page.getByRole('button', { name: 'Change Casey' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Sam' }).click();
  await expect(page.getByLabel('Alex wins')).toHaveText('4');
  await expect(page.getByLabel('Sam wins')).toHaveText('2');
});

test('game records and the trend chart (AC-5)', async ({ page }) => {
  await openApp(page, '#/stats', STATS_HISTORY);
  await page.getByRole('tab', { name: 'Parcheesi' }).click();
  const recs = page.getByRole('list', { name: 'Records' });
  await expect(recs).toContainText('Most triple doublets in one game');
  await expect(recs).toContainText('Triple doublets per player per game');
  await page.getByRole('tab', { name: 'Flip 7' }).click();
  await expect(recs).toContainText('Fewest rounds to 200 · 3 players');
  await expect(recs).toContainText('Lowest bust rate');
  await page.getByRole('tab', { name: 'Dutch Blitz' }).click();
  await expect(recs).toContainText('Rounds to finish, on average6');
  await page.getByRole('tab', { name: 'Monopoly' }).click();
  await expect(recs).toContainText('Average game length2 h 10 min');
  await page.getByRole('tab', { name: 'Ticket to Ride' }).click();
  await expect(recs).toContainText('Best ticket completion rate');
  await expect(page.getByRole('img', { name: 'Win percentage over time' }).locator('svg path.recharts-curve').first()).toBeVisible();
});

test('the Players screen shows overall win %', async ({ page }) => {
  await openApp(page, '#/players', STATS_HISTORY);
  await expect(page.getByRole('button', { name: /Alex/ })).toContainText(/26 games · \d+% wins/);
  await expect(page.getByRole('button', { name: /Casey/ })).toContainText('1 game · stats after 5');
  await expect(page.getByRole('button', { name: /Morgan/ })).not.toContainText('wins');
});
