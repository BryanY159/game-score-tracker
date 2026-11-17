import { expect, test, type Page } from '@playwright/test';
import { openApp } from './helpers/app';
import { FOUR } from './fixtures/players';
import { FLIP7_MID, FLIP7_TIE } from './fixtures/flip7';

const total = (page: Page, name: string) => page.getByLabel(`${name} total`);
const digits = async (page: Page, v: string) => {
  for (const d of v) await page.getByRole('group', { name: 'Number pad' }).getByRole('button', { name: d, exact: true }).click();
};

test('a full game in both entry modes: bust, not a bust, Flip 7 (FR-8)', async ({ page }) => {
  await openApp(page, '#/', { players: FOUR });
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByRole('button', { name: /Flip 7/ }).click();
  for (const n of ['Alex', 'Sam']) await page.getByRole('button', { name: n, exact: true }).click();
  await expect(page.getByText('Deals first')).toBeVisible();
  for (const n of ['Alex', 'Sam']) await page.getByRole('textbox', { name: `${n} target` }).fill('60');
  await page.getByRole('radio', { name: 'Type the score' }).click();
  await page.getByRole('button', { name: 'Start game' }).click();

  // Round 1, Number mode (AC-1). Alex deals.
  await expect(page.getByText('Round 1 · Dealer: Alex')).toBeVisible();
  const confirm = page.getByRole('button', { name: 'Confirm round' });
  await digits(page, '25');
  await expect(confirm).toBeDisabled(); // every player needs an entry (NFR-2: one per player + confirm)
  await page.getByRole('button', { name: 'Next player' }).click();
  await page.getByRole('button', { name: 'Bust' }).click();
  await confirm.click();
  await expect(total(page, 'Alex')).toHaveText('25');
  await expect(total(page, 'Sam')).toHaveText('0');

  // Round 2: Sam deals (AC-3); switch to Cards mode mid-game (FR-3 AC-3).
  await expect(page.getByText('Round 2 · Dealer: Sam')).toBeVisible();
  await page.getByRole('radio', { name: 'Cards' }).click();
  for (const n of [0, 1, 2, 3, 4, 5, 6]) await page.getByRole('button', { name: `Card ${n}`, exact: true }).click();
  // 7 different numbers: a Flip 7, detected automatically: 21 + 15 (AC-2).
  await expect(page.getByRole('button', { name: /^Alex, this round \+36/ })).toBeVisible();
  await page.getByRole('button', { name: 'Next player' }).click();

  await page.getByRole('button', { name: 'Card 5', exact: true }).click();
  await page.getByRole('button', { name: 'Card 9', exact: true }).click();
  await page.getByRole('button', { name: 'Card 5', exact: true }).click();
  const bust = page.getByRole('alertdialog', { name: 'Bust?' });
  await bust.getByRole('button', { name: 'Not a bust, remove card' }).click(); // a Second Chance save
  await page.getByRole('button', { name: '+10' }).click();
  await page.getByRole('button', { name: '×2' }).click();
  // ×2 doubles number cards only: (5 + 9) × 2 + 10.
  await expect(page.getByRole('button', { name: /^Sam, this round \+38/ })).toBeVisible();
  await confirm.click();

  // Alex reached 60: game over after the round (AC-4).
  await expect(page.getByRole('heading', { name: 'Alex wins' })).toBeVisible();
  await expect(page.getByText('+1 past target · 61 points')).toBeVisible();
  await page.getByRole('button', { name: 'Finalize' }).click();

  const saved = await page.evaluate(async () => {
    const req = indexedDB.open('game-score-tracker');
    const dbh: IDBDatabase = await new Promise((r) => (req.onsuccess = () => r(req.result)));
    const q = dbh.transaction('matchPlayers').objectStore('matchPlayers').getAll();
    const mps: { finalScore: number; details: Record<string, unknown> }[] = await new Promise((r) => (q.onsuccess = () => r(q.result)));
    return mps.map((m) => [m.finalScore, m.details]).sort((a, b) => (b[0] as number) - (a[0] as number));
  });
  // AC-5: scores, Flip 7 count, busts; not 200 targets, so no "rounds to 200".
  expect(saved).toEqual([
    [61, { flip7Count: 1, busts: 0, roundsTo200: null }],
    [38, { flip7Count: 0, busts: 1, roundsTo200: null }],
  ]);
});

test('a bust in Cards mode', async ({ page }) => {
  await openApp(page, '#/', { players: FOUR });
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByRole('button', { name: /Flip 7/ }).click();
  for (const n of ['Alex', 'Sam']) await page.getByRole('button', { name: n, exact: true }).click();
  await page.getByRole('radio', { name: 'Tap the cards' }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.getByRole('button', { name: 'Card 8', exact: true }).click();
  await page.getByRole('button', { name: 'Card 8', exact: true }).click();
  await page.getByRole('alertdialog', { name: 'Bust?' }).getByRole('button', { name: 'Bust', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Alex, this round Bust/ })).toBeVisible();
  // The keypad moved on to Sam.
  await expect(page.getByRole('button', { name: /^Sam, this round entering/ })).toBeVisible();
});

test('tie: play another round, everyone plays, running totals, Alex wins (FR-11 AC-4)', async ({ page }) => {
  await openApp(page, `#/play/${FLIP7_TIE.matches[0]!.id}/results`, FLIP7_TIE);
  const tie = page.getByRole('dialog', { name: "It's a tie" });
  await expect(tie.getByRole('button').nth(1)).toHaveText('Play another round'); // the default, listed first
  await tie.getByRole('button', { name: 'Play another round' }).click();

  await expect(page.getByText('Tie-break round: everyone plays one more round.')).toBeVisible();
  await expect(page.getByText('Round 3 · Dealer: Jordan')).toBeVisible(); // the dealer keeps rotating
  await digits(page, '20');
  await page.getByRole('button', { name: 'Next player' }).click();
  await page.getByRole('button', { name: 'Bust' }).click();
  await digits(page, '30');
  await page.getByRole('button', { name: 'Confirm round' }).click();

  await expect(page.getByRole('heading', { name: 'Alex wins' })).toBeVisible();
  await expect(page.getByText('+32 past target · 232 points')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Podium' })).toContainText('Jordan');
});

test('edit a past round (FR-5 AC-4)', async ({ page }) => {
  await openApp(page, `#/play/${FLIP7_MID.matches[0]!.id}`, FLIP7_MID);
  await expect(total(page, 'Jordan')).toHaveText('127');
  await page.getByRole('button', { name: 'Rounds', exact: true }).click();
  await page.getByRole('button', { name: 'Round 1' }).click();
  const sheet = page.getByRole('dialog', { name: 'Edit round 1' });
  await sheet.getByRole('button', { name: 'Bust' }).nth(2).click(); // Jordan's bust off
  await sheet.getByRole('textbox', { name: 'Jordan score' }).fill('12');
  await sheet.getByRole('button', { name: 'Save round' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(total(page, 'Jordan')).toHaveText('139');
});
