import { expect, test } from '@playwright/test';
import { openApp } from './helpers/app';
import { PARCHEESI_MID } from './fixtures/parcheesi';
import { NOW } from './fixtures/matches';

const id = PARCHEESI_MID.matches[0]!.id;

// FR-5 lifecycle flows (M3). The clock is controlled so paused time is exact.
test('pause stops the clock and paused time is left out (FR-5 AC-1)', async ({ page }) => {
  await openApp(page, `#/play/${id}`, PARCHEESI_MID);
  const clock = page.getByLabel('Game time');
  await expect(clock).toHaveText('41:37');
  await page.clock.setFixedTime(NOW + 60_000);
  await expect(clock).toHaveText('42:37');

  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByText('Paused', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Add a pawn home/ }).first()).toBeVisible(); // covered by the overlay
  await page.clock.setFixedTime(NOW + 10 * 60_000);
  await expect(clock).toHaveText('42:37');

  await page.getByRole('button', { name: 'Resume' }).last().click();
  await page.clock.setFixedTime(NOW + 11 * 60_000);
  await expect(clock).toHaveText('43:37');
});

test('save and exit keeps the game paused under In progress (FR-5 AC-2)', async ({ page }) => {
  await openApp(page, `#/play/${id}`, PARCHEESI_MID);
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('button', { name: 'Save and exit' }).click();
  await expect(page.getByRole('heading', { name: 'Game night' })).toBeVisible();
  await expect(page.getByText('1 placed · 42 min · paused')).toBeVisible();

  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByText('Paused', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).last().click();
  await expect(page.getByText('Paused', { exact: true })).toBeHidden();
  await page.getByRole('button', { name: 'Add a pawn home for Sam' }).click();
  await expect(page.getByLabel('2 of 4 pawns home')).toHaveCount(2);
});

test('back also saves and exits', async ({ page }) => {
  await openApp(page, `#/play/${id}`, PARCHEESI_MID);
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByText(/paused/)).toBeVisible();
});

test('notes are kept (FR-5 AC-6)', async ({ page }) => {
  await openApp(page, `#/play/${id}`, PARCHEESI_MID);
  await page.getByRole('button', { name: 'Notes' }).click();
  await page.getByRole('textbox').fill('Doubles roll again.');
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.reload();
  await page.getByRole('button', { name: 'Notes' }).click();
  await expect(page.getByRole('textbox')).toHaveValue('Doubles roll again.');
});

test('a finalized game shows under Recent games', async ({ page }) => {
  await openApp(page, `#/play/${id}`, PARCHEESI_MID);
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Add a pawn home for Jordan' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Add a pawn home for Sam' }).click();
  await page.getByRole('button', { name: 'Finalize' }).click();
  await expect(page.getByText('Recent games')).toBeVisible();
  await expect(page.getByText('Riley won · 4 players')).toBeVisible();
  await expect(page.getByText('Today')).toBeVisible();
});
