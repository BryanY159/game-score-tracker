import { expect, test } from '@playwright/test';
import { openApp } from './helpers/app';
import { HISTORY, RECENT } from './fixtures/parcheesi';

// FR-13 and editing finished games (M5).
test('browse and filter history (FR-13 AC-1)', async ({ page }) => {
  await openApp(page, '#/history', HISTORY);
  const rows = page.getByRole('main').getByRole('listitem');
  await expect(rows).toHaveCount(5);
  await expect(page.getByRole('heading', { name: 'This week' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'October 2026' })).toBeVisible();

  await page.getByRole('button', { name: 'All players' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Riley' }).click();
  await expect(rows).toHaveCount(2);
  await page.getByRole('toolbar', { name: 'Filters' }).getByRole('button', { name: 'Riley' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'All players' }).click();
  await expect(rows).toHaveCount(5);

  // A deleted player's games stay in history (FR-2 AC-1) and can be filtered.
  await page.getByRole('button', { name: 'All players' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Drew' }).click();
  await expect(rows).toHaveCount(1);
});

test('game detail shows players, scores, length and notes (FR-13 AC-2)', async ({ page }) => {
  const id = HISTORY.matches[3]!.id;
  await openApp(page, `#/history/${id}`, HISTORY);
  const players = page.getByRole('list', { name: 'Players' }).getByRole('listitem');
  await expect(players).toHaveText([/Drew1st · Winner · deleted profile · 0 triple doublets4 home/, /Sam2nd · 0 triple doublets2 home/]);
  await expect(page.getByText('41 min')).toBeVisible();
  await expect(page.getByText('Played on the porch.')).toBeVisible();
});

test('edit a finished game: changes it in place and it stays finished', async ({ page }) => {
  const id = RECENT[0]!.matches[0]!.id; // Riley 1st, Alex 2nd, Sam 3rd, Jordan last
  await openApp(page, '#/', HISTORY);
  await page.getByRole('button', { name: 'See all' }).click();
  await page.getByRole('main').getByRole('listitem').first().getByRole('button').click();
  await expect(page).toHaveURL(new RegExp(`#/history/${id}$`));
  await page.getByRole('button', { name: 'Edit scores' }).click();

  const save = page.getByRole('button', { name: 'Save' });
  await expect(save).toBeDisabled();
  // Undo the last entries until Sam (3rd) and Jordan are open again, then swap them.
  for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'Undo' }).click();
  await expect(save).toBeDisabled(); // order incomplete
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'More pawns home for Jordan' }).click();
  await save.click();

  const players = page.getByRole('list', { name: 'Players' }).getByRole('listitem');
  await expect(players).toHaveText([/Riley1st/, /Alex2nd/, /Jordan3rd/, /Sam4th/]);
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(5); // still finished, still listed
});

test('leaving the editor without saving changes nothing', async ({ page }) => {
  const id = RECENT[0]!.matches[0]!.id;
  await openApp(page, `#/history/${id}/edit`, HISTORY);
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('list', { name: 'Players' }).getByRole('listitem').first()).toHaveText(/Riley1st/);
});
