import { expect, test, type Page } from '@playwright/test';
import { openApp } from './helpers/app';
import { FOUR } from './fixtures/players';
import { FLIP7_CARDS, FLIP7_MID, FLIP7_TIE } from './fixtures/flip7';
import { FLIP7 } from '../src/games/flip7/tokens';

const total = (page: Page, name: string) => page.getByLabel(`${name} total`);
const keypad = (page: Page) => page.getByRole('group', { name: /score keypad$/ });
const digits = async (page: Page, v: string) => {
  for (const d of v) await keypad(page).getByRole('button', { name: d, exact: true }).click();
};
const chip = (page: Page, name: string) => page.getByRole('button', { name: `Type ${name}'s round score` });

test('a full game: card selector, keypad from a score chip, bust, not a bust, Flip 7 (FR-8)', async ({ page }) => {
  await openApp(page, '#/', { players: FOUR });
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByRole('button', { name: /Flip 7/ }).click();
  for (const n of ['Alex', 'Sam']) await page.getByRole('button', { name: n, exact: true }).click();
  await expect(page.getByText('Score entry')).toHaveCount(0); // no entry-mode choice (FR-3 AC-3)
  for (const n of ['Alex', 'Sam']) await page.getByRole('textbox', { name: `${n} target` }).fill('60');
  await page.getByRole('button', { name: 'Start game' }).click();

  // Round 1: the card selector is showing; Alex's score is typed from the chip (FR-8 AC-7).
  await expect(page.getByText('Round 1 · Dealer: Alex')).toBeVisible();
  await expect(page.getByRole('group', { name: "Alex's cards" })).toBeVisible();
  await chip(page, 'Alex').click();
  await expect(keypad(page)).toBeVisible();
  await digits(page, '25');
  const confirm = page.getByRole('button', { name: 'Confirm round' });
  await expect(confirm).toBeDisabled();
  await keypad(page).getByRole('button', { name: 'Next player' }).click();
  await keypad(page).getByRole('button', { name: 'Bust' }).click(); // Sam busts
  await confirm.click();
  await expect(total(page, 'Alex')).toHaveText('25');
  await expect(total(page, 'Sam')).toHaveText('0');

  // Round 2 on the cards: back from the keypad.
  await expect(page.getByText('Round 2 · Dealer: Sam')).toBeVisible();
  await page.getByRole('button', { name: 'Back to cards' }).click();
  for (const n of [0, 1, 2, 3, 4, 5, 6]) await page.getByRole('button', { name: `Card ${n}`, exact: true }).click();
  // 7 different numbers: a Flip 7, detected automatically: 21 + 15 (AC-2).
  await expect(chip(page, 'Alex')).toHaveText('+36');
  await page.getByRole('group', { name: "Alex's cards" }).getByRole('button', { name: 'Next player' }).click();

  await page.getByRole('button', { name: 'Card 5', exact: true }).click();
  await page.getByRole('button', { name: 'Card 9', exact: true }).click();
  await page.getByRole('button', { name: 'Card 5', exact: true }).click();
  await page.getByRole('alertdialog', { name: 'Bust?' }).getByRole('button', { name: 'Not a bust, remove card' }).click();
  await page.getByRole('button', { name: '+10' }).click();
  await page.getByRole('button', { name: '×2' }).click();
  // ×2 doubles number cards only: (5 + 9) × 2 + 10.
  await expect(page.getByLabel('Round sum')).toHaveText('2×(5+9) + 10 =38');
  await expect(chip(page, 'Sam')).toHaveText('+38');
  await confirm.click();

  await expect(page.getByRole('heading', { name: 'Alex wins' })).toBeVisible();
  await page.getByRole('button', { name: 'Finalize' }).click();
  const saved = await page.evaluate(async () => {
    const req = indexedDB.open('game-score-tracker');
    const dbh: IDBDatabase = await new Promise((r) => (req.onsuccess = () => r(req.result)));
    const q = dbh.transaction('matchPlayers').objectStore('matchPlayers').getAll();
    const mps: { finalScore: number; details: Record<string, unknown> }[] = await new Promise((r) => (q.onsuccess = () => r(q.result)));
    return mps.map((m) => [m.finalScore, m.details]).sort((a, b) => (b[0] as number) - (a[0] as number));
  });
  expect(saved).toEqual([
    [61, { flip7Count: 1, busts: 0, roundsTo200: null }],
    [38, { flip7Count: 0, busts: 1, roundsTo200: null }],
  ]);
});

test('the keypad opens from a score chip, and Back to cards returns (FR-8 AC-7)', async ({ page }) => {
  await openApp(page, `#/play/${FLIP7_MID.matches[0]!.id}`, FLIP7_MID);
  await chip(page, 'Riley').click();
  await expect(page.getByRole('group', { name: "Riley's score keypad" })).toBeVisible();
  await expect(page.getByLabel("Riley's round score", { exact: true })).toHaveValue('23');
  await page.getByRole('button', { name: 'Back to cards' }).click();
  await expect(page.getByRole('group', { name: "Riley's cards" })).toBeVisible();
});

test('a bust on the card selector', async ({ page }) => {
  await openApp(page, '#/', { players: FOUR });
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByRole('button', { name: /Flip 7/ }).click();
  for (const n of ['Alex', 'Sam']) await page.getByRole('button', { name: n, exact: true }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.getByRole('button', { name: 'Card 8', exact: true }).click();
  await page.getByRole('button', { name: 'Card 8', exact: true }).click();
  await page.getByRole('alertdialog', { name: 'Bust?' }).getByRole('button', { name: 'Bust', exact: true }).click();
  await expect(chip(page, 'Alex')).toHaveText('Bust');
  await expect(page.getByRole('group', { name: "Sam's cards" })).toBeVisible(); // moved on
});

test('the card colors match the Flip 7 tokens (spec §6)', async ({ page }) => {
  await openApp(page, `#/play/${FLIP7_MID.matches[0]!.id}`, FLIP7_MID);
  const hex = (rgb: string) => '#' + rgb.match(/\d+/g)!.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase();
  for (let n = 0; n <= 12; n++) {
    const css = await page.getByRole('button', { name: `Card ${n}`, exact: true }).evaluate((el) => {
      const s = getComputedStyle(el);
      return [s.color, s.backgroundColor, s.borderTopColor];
    });
    expect(css.map(hex)).toEqual([FLIP7.numerals[n], FLIP7.numberCard, FLIP7.numberCardBorder]);
  }
  const mod = await page.getByRole('button', { name: '+4' }).evaluate((el) => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]);
  expect(mod.map(hex)).toEqual([FLIP7.modifierNumeral, FLIP7.modifierCard]);
  const bust = await page.getByRole('group', { name: /cards$/ }).getByRole('button', { name: 'Bust' }).evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(hex(bust)).toBe(FLIP7.bust);
});

test('games saved before the change still load and play (FR-8 AC-9)', async ({ page }) => {
  // Old games carry entryMode settings and number-mode or cards-mode rounds.
  await openApp(page, `#/play/${FLIP7_MID.matches[0]!.id}`, FLIP7_MID);
  await expect(total(page, 'Jordan')).toHaveText('127');
  await expect(chip(page, 'Riley')).toHaveText('+23');
  await page.getByRole('button', { name: 'Confirm round' }).click();
  await expect(page.getByText('Round 7 · Dealer: Jordan')).toBeVisible();
  await openApp(page, `#/play/${FLIP7_CARDS.matches[0]!.id}`, FLIP7_CARDS);
  await expect(chip(page, 'Alex')).toHaveText('+26'); // a cards-mode draft: 3+7+12+4
});

test('tie: play another round, everyone plays, running totals, Alex wins (FR-11 AC-4)', async ({ page }) => {
  await openApp(page, `#/play/${FLIP7_TIE.matches[0]!.id}/results`, FLIP7_TIE);
  const tie = page.getByRole('dialog', { name: "It's a tie" });
  await expect(tie.getByRole('button').nth(1)).toHaveText('Play another round');
  await tie.getByRole('button', { name: 'Play another round' }).click();
  await expect(page.getByText('Tie-break round: everyone plays one more round.')).toBeVisible();
  await expect(page.getByText('Round 3 · Dealer: Jordan')).toBeVisible();
  await chip(page, 'Alex').click();
  await digits(page, '20');
  await keypad(page).getByRole('button', { name: 'Next player' }).click();
  await keypad(page).getByRole('button', { name: 'Bust' }).click();
  await digits(page, '30');
  await page.getByRole('button', { name: 'Confirm round' }).click();
  await expect(page.getByRole('heading', { name: 'Alex wins' })).toBeVisible();
  await expect(page.getByText('+32 past target · 232 points')).toBeVisible();
});

test('editing a past round opens the keypad (FR-5 AC-4, FR-8 AC-8)', async ({ page }) => {
  await openApp(page, `#/play/${FLIP7_MID.matches[0]!.id}`, FLIP7_MID);
  await expect(total(page, 'Jordan')).toHaveText('127');
  await page.getByRole('button', { name: 'Rounds', exact: true }).click();
  await page.getByRole('button', { name: 'Round 1' }).click();
  const sheet = page.getByRole('dialog', { name: 'Edit round 1' });
  await sheet.getByRole('button', { name: /Jordan/ }).click();
  await expect(sheet.getByRole('group', { name: "Jordan's score keypad" })).toBeVisible();
  await sheet.getByLabel("Jordan's round score", { exact: true }).fill('12');
  await sheet.getByRole('button', { name: 'Save round' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(total(page, 'Jordan')).toHaveText('139');
});
