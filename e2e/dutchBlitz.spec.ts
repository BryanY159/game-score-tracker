import { expect, test, type Page } from '@playwright/test';
import { openApp } from './helpers/app';
import { FOUR } from './fixtures/players';
import { BLITZ_MID, BLITZ_TIE } from './fixtures/dutchBlitz';

async function startBlitz(page: Page, targets: Record<string, string> = {}) {
  await openApp(page, '#/', { players: FOUR });
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByRole('button', { name: /Dutch Blitz/ }).click();
  for (const n of ['Alex', 'Sam']) await page.getByRole('button', { name: n, exact: true }).click();
  for (const [n, t] of Object.entries(targets)) await page.getByRole('textbox', { name: `${n} target` }).fill(t);
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.getByRole('heading', { name: 'Dutch Blitz' })).toBeVisible();
}

/** Types a count into the stepper's number field (the iOS number pad path, FR-18 AC-3). */
async function enter(page: Page, name: string, dutch: number, blitz: number) {
  await page.getByRole('textbox', { name: `Dutch cards for ${name}` }).fill(String(dutch));
  await page.getByRole('textbox', { name: `Blitz cards for ${name}` }).fill(String(blitz));
}

const total = (page: Page, name: string) => page.getByLabel(`${name} total`);

test('a full game with a handicap target, editing a past round (FR-9, FR-5 AC-4, FR-11 AC-1)', async ({ page }) => {
  await startBlitz(page, { Alex: '90' });
  await expect(page.getByText('Round 1 · handicaps')).toBeVisible();
  await expect(page.getByText('to 90')).toBeVisible();

  // Round 1: steppers and the live round score (AC-1, AC-2).
  await page.getByRole('button', { name: 'More Dutch cards for Alex' }).click();
  await page.getByRole('button', { name: 'More Dutch cards for Alex' }).click();
  await page.getByRole('button', { name: 'More Blitz cards for Alex' }).click();
  await expect(page.getByLabel('Alex this round')).toHaveText('+0');
  await enter(page, 'Alex', 30, 0);
  await enter(page, 'Sam', 20, 2);
  await expect(page.getByLabel('Sam this round')).toHaveText('+16');
  await expect(page.getByText('Blitz!')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm round' }).click();
  await expect(total(page, 'Alex')).toHaveText('30');
  await expect(total(page, 'Sam')).toHaveText('16');

  // Rounds 2 and 3.
  await enter(page, 'Alex', 25, 0);
  await enter(page, 'Sam', 26, 0);
  await page.getByRole('button', { name: 'Confirm round' }).click();
  await enter(page, 'Alex', 20, 1);
  await enter(page, 'Sam', 22, 0);
  await page.getByRole('button', { name: 'Confirm round' }).click();
  await expect(total(page, 'Alex')).toHaveText('73');
  await expect(total(page, 'Sam')).toHaveText('64');

  // Edit round 1: Sam actually had 30 Dutch cards and blitzed (+30, not +16).
  await page.getByRole('button', { name: 'Rounds', exact: true }).click();
  await page.getByRole('button', { name: 'Round 1' }).click();
  const sheet = page.getByRole('dialog', { name: 'Edit round 1' });
  await sheet.getByRole('textbox', { name: 'Dutch cards for Sam' }).fill('30');
  await sheet.getByRole('textbox', { name: 'Blitz cards for Sam' }).fill('0');
  await sheet.getByRole('button', { name: 'Save round' }).click();
  // Sam 78 ≥ 75: the game is over after that round (AC-3).
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText('Game over')).toBeVisible();
  await page.getByRole('button', { name: 'See results' }).click();

  // Sam +3 past 75 beats Alex 73 (−17 to 90) (FR-11 AC-1).
  await expect(page.getByRole('heading', { name: 'Sam wins' })).toBeVisible();
  await expect(page.getByText('+3 past target · 78 points')).toBeVisible();
  await expect(page.getByText('Alex played to 90.')).toBeVisible();
  await page.getByRole('button', { name: 'Finalize' }).click();

  await page.getByRole('link', { name: 'History' }).click();
  await page.getByRole('main').getByRole('listitem').first().getByRole('button').click();
  await expect(page.getByRole('list', { name: 'Players' }).getByRole('listitem')).toHaveText([
    /Sam1st · Winner · \+3 · to 7578/,
    /Alex2nd · −17 · to 9073/,
  ]);
});

test('confirming the round that reaches a target goes to Results', async ({ page }) => {
  await startBlitz(page);
  await enter(page, 'Alex', 40, 0);
  await enter(page, 'Sam', 38, 0);
  await page.getByRole('button', { name: 'Confirm round' }).click();
  await enter(page, 'Alex', 36, 0);
  await page.getByRole('button', { name: 'Confirm round' }).click();
  await expect(page.getByRole('heading', { name: 'Alex wins' })).toBeVisible();
  // Edit scores, then Undo reopens the last round and the game goes on.
  await page.getByRole('button', { name: 'Edit scores' }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('textbox', { name: 'Dutch cards for Alex' })).toHaveValue('36');
  await expect(page.getByRole('button', { name: 'Confirm round' })).toBeEnabled();
});

test('a remaining tie opens the tie screen; shared win (FR-11 AC-3)', async ({ page }) => {
  await openApp(page, `#/play/${BLITZ_TIE.matches[0]!.id}/results`, BLITZ_TIE);
  const tie = page.getByRole('dialog', { name: "It's a tie" });
  await expect(tie).toContainText('Alex and Sam are tied on margin past target and on total.');
  await expect(page.getByRole('button', { name: 'Finalize' })).toBeDisabled();
  await tie.getByRole('button', { name: 'Shared win' }).click();
  await expect(page.getByRole('heading', { name: 'Shared win' })).toBeVisible();
  await page.getByRole('button', { name: 'Finalize' }).click();
  await expect(page.getByText('Shared win · Alex and Sam')).toBeVisible();
});

test('undo reopens the last round only when the new round is blank', async ({ page }) => {
  await openApp(page, `#/play/${BLITZ_MID.matches[0]!.id}`, BLITZ_MID);
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled(); // round 4 has entries
  await expect(page.getByText('Round 4 · to 75')).toBeVisible();
});

test('the Blitz label keeps the true minus sign (−, not a hyphen)', async ({ page }) => {
  await openApp(page, `#/play/${BLITZ_MID.matches[0]!.id}`, BLITZ_MID);
  await expect(page.getByText('Blitz −2').first()).toBeVisible();
  await expect(page.getByText('Blitz -2')).toHaveCount(0);
});
