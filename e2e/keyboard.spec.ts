import { expect, test, type Page } from '@playwright/test';
import { openApp } from './helpers/app';
import { FLIP7_MID } from './fixtures/flip7';
import { BLITZ_MID } from './fixtures/dutchBlitz';
import { TTR_END, TTR_MID } from './fixtures/ticketToRide';

/** FR-20 on the iPad in landscape with a keyboard (the `*-keyboard` projects, 1180×820). */

const sum = (page: Page) => page.getByLabel('Round sum');
const overlay = (page: Page) => page.getByRole('dialog', { name: 'Keyboard shortcuts' });

test('Flip 7 by keyboard: cards, Shift digits, a modifier, ×2, Enter confirms, keypad, F, B, ⌘Z, Space, ? (AC-1, AC-2)', async ({ page }) => {
  await openApp(page, `#/play/${FLIP7_MID.matches[0]!.id}`, FLIP7_MID);
  await expect(page.locator('[data-layout="two-pane"]')).toBeVisible(); // NFR-3 landscape
  await expect(page.getByRole('group', { name: "Alex's cards" })).toBeVisible();

  // C clears Alex's typed 31; digits, Shift+2 (11), + then 4, and X.
  await page.keyboard.press('c');
  await expect(page.getByRole('button', { name: 'Confirm round' })).toBeDisabled();
  await page.keyboard.press('3');
  await page.keyboard.press('7');
  await page.keyboard.press('Shift+Digit2');
  await page.keyboard.press('+');
  await page.keyboard.press('4');
  await page.keyboard.press('x');
  await expect(sum(page)).toHaveText('2×(3+7+11) + 4 =46');
  // Keys toggle like taps: 7 again removes it, and again puts it back (FR-20 AC-2).
  await page.keyboard.press('7');
  await expect(sum(page)).toHaveText('2×(3+11) + 4 =32');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await page.keyboard.press('7');
  await expect(sum(page)).toHaveText('2×(3+11+7) + 4 =46');
  await page.keyboard.press('Shift+Digit2'); // 11 off
  await expect(sum(page)).toHaveText('2×(3+7) + 4 =24');
  await page.keyboard.press('Shift+Digit2');
  await page.keyboard.press('+');
  await page.keyboard.press('4'); // +4 off
  await expect(sum(page)).toHaveText('2×(3+7+11) =42');
  await page.keyboard.press('+');
  await page.keyboard.press('4');
  await page.keyboard.press('x'); // ×2 off: back to 21 + 4
  await expect(sum(page)).toHaveText('(3+7+11) + 4 =25');

  // Everyone has a score now, so Enter is Confirm round: 212 + 25.
  await page.keyboard.press('Enter');
  await expect(page.getByText('Round 7 · Dealer: Jordan')).toBeVisible();
  await expect(page.getByLabel('Alex total')).toHaveText('237');

  // ⌘Z reopens the round (the new one is blank).
  await page.keyboard.press('Meta+z');
  await expect(page.getByText('Round 6 · Dealer: Sam')).toBeVisible();
  await page.keyboard.press('Enter'); // confirm again
  await expect(page.getByText('Round 7 · Dealer: Jordan')).toBeVisible();

  // K opens the keypad: digits type, F marks a Flip 7, Enter goes to the next player.
  await page.keyboard.press('k');
  await expect(page.getByRole('group', { name: "Alex's score keypad" })).toBeVisible();
  await page.keyboard.press('1');
  await page.keyboard.press('2');
  await page.keyboard.press('f');
  await expect(page.getByLabel("Alex's round score", { exact: true })).toHaveValue('12');
  await expect(page.getByRole('button', { name: 'Flip 7!' })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('group', { name: "Sam's score keypad" })).toBeVisible();
  // B busts Sam and moves on to Jordan.
  await page.keyboard.press('b');
  await expect(page.getByRole('group', { name: "Jordan's score keypad" })).toBeVisible();
  await expect(page.getByRole('button', { name: "Type Sam's round score" })).toHaveText('Bust');

  // While typing in the score field, letters don't fire (AC-5); Enter still does.
  await page.getByLabel("Jordan's round score", { exact: true }).focus();
  await page.keyboard.type('b9');
  await expect(page.getByLabel("Jordan's round score", { exact: true })).toHaveValue('9');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('group', { name: "Riley's score keypad" })).toBeVisible();
  await page.locator('body').click({ position: { x: 5, y: 400 } }); // leave the field

  // Space pauses and resumes; ? lists the shortcuts for this screen.
  await page.keyboard.press(' ');
  await expect(page.getByRole('button', { name: 'Resume' }).first()).toBeVisible();
  await page.keyboard.press(' ');
  await expect(page.getByText('Paused', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('group', { name: "Riley's score keypad" })).toBeVisible();
  await page.keyboard.press('?');
  await expect(overlay(page)).toBeVisible();
  await expect(overlay(page).getByText('Flip 7!')).toBeVisible();
  await expect(overlay(page).getByText('Undo')).toBeVisible();
  // Game keys wait under the overlay.
  await page.keyboard.press('b');
  await expect(page.getByRole('button', { name: "Type Riley's round score" })).not.toHaveText('Bust');
  await page.keyboard.press('Escape');
  await expect(overlay(page)).toHaveCount(0);
  // Esc on the game screen goes back Home and pauses.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Game Night' })).toBeVisible();
});

test('Ticket to Ride by keyboard: 1–6, T, D, L, ⌘Z, then end scoring with digits, C, X, P, Enter (AC-3)', async ({ page }) => {
  await openApp(page, `#/play/${TTR_MID.matches[0]!.id}`, TTR_MID);
  await expect(page.locator('[data-layout="two-pane"]')).toBeVisible();
  await expect(page.getByText('Turn 23')).toBeVisible();
  await page.keyboard.press("3"); // Jordan claims a 3-route
  await expect(page.getByText('Turn 24')).toBeVisible();
  await expect(page.getByLabel('Jordan route points')).toHaveText(/\d+/);
  await page.keyboard.press('t');
  await expect(page.getByText('Turn 25')).toBeVisible();
  await page.keyboard.press('d');
  await expect(page.getByText('Turn 26')).toBeVisible();
  await page.keyboard.press('Meta+z');
  await expect(page.getByText('Turn 25')).toBeVisible();
  await page.keyboard.press('7'); // not a route length: nothing happens
  await expect(page.getByText('Turn 25')).toBeVisible();
  await page.keyboard.press('l');
  await expect(page.getByRole('dialog', { name: 'Turn log' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Turn log' })).toHaveCount(0);
  await page.keyboard.press('?');
  await expect(overlay(page).getByText('Claim a route of that length')).toBeVisible();
  await page.keyboard.press('?');
  await expect(overlay(page)).toHaveCount(0);

  // End-of-game scoring.
  await openApp(page, `#/play/${TTR_END.matches[0]!.id}/final`, TTR_END);
  const tickets = page.getByRole('list', { name: 'Tickets' }).getByRole('listitem');
  await expect(tickets).toHaveCount(3);
  // FR-20 AC-3: a digit opens Add ticket; C, X and Enter each add a ticket and keep it open.
  const dialog = page.getByRole('dialog', { name: 'Add ticket' });
  const added = dialog.getByRole('region', { name: "Sam's tickets" }).getByRole('listitem');
  await page.keyboard.press('9');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('c'); // +9 completed
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Ticket value value')).toHaveValue(''); // cleared for the next one
  await page.keyboard.press('1');
  await page.keyboard.press('2');
  await page.keyboard.press('x'); // −12 failed
  await page.keyboard.press('5');
  await page.keyboard.press('Enter'); // +5, completed by default
  await expect(dialog).toBeVisible();
  await expect(added).toHaveCount(6);
  await expect(added.nth(3)).toHaveText(/\+9\s*Completed/);
  await expect(added.nth(4)).toHaveText(/−12\s*Failed/);
  await expect(added.nth(5)).toHaveText(/\+5\s*Completed/);
  await expect(dialog.getByLabel('Tickets total')).toHaveText('+27'); // 13 + 20 − 8 + 9 − 12 + 5
  await page.keyboard.press('Enter'); // nothing typed: closes
  await expect(dialog).toHaveCount(0);
  await expect(tickets).toHaveCount(6);
  await expect(page.getByRole('radiogroup', { name: 'Ticket 12' }).getByRole('radio', { name: 'Failed −12' })).toHaveAttribute('aria-checked', 'true');
  // Esc also closes it.
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  // P toggles the longest path for Sam (on in the fixture).
  const lp = page.getByRole('button', { name: 'Longest path: Sam' });
  await expect(lp).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('p');
  await expect(lp).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Alex' })).toHaveAttribute('aria-selected', 'true');
});

test('Dutch Blitz by keyboard: arrows and Tab between fields, digits, + and −, Enter confirms (AC-4)', async ({ page }) => {
  await openApp(page, `#/play/${BLITZ_MID.matches[0]!.id}`, BLITZ_MID);
  await expect(page.locator('[data-layout="two-pane"]')).toBeVisible();
  await expect(page.getByText(/^Round 4/)).toBeVisible();
  // Standings order: Alex 46, Jordan 26, Sam 20, Riley 16. The arrow keys start at the first field.
  await page.keyboard.press('ArrowDown');
  const alexDutch = page.getByRole('textbox', { name: 'Dutch cards for Alex' });
  await expect(alexDutch).toBeFocused();
  await page.keyboard.type('20');
  await page.keyboard.press('+');
  await page.keyboard.press('-');
  await page.keyboard.press('-');
  await expect(alexDutch).toHaveValue('19');
  // Letters do nothing in a field (AC-5).
  await page.keyboard.press('l');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('textbox', { name: 'Blitz cards for Alex' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'Dutch cards for Jordan' })).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('textbox', { name: 'Blitz cards for Alex' })).toBeFocused();
  // Enter confirms the round: Alex 46 + 19 − 2×2.
  await page.keyboard.press('Enter');
  await expect(page.getByText(/^Round 5/)).toBeVisible();
  await expect(page.getByLabel('Alex standing total')).toHaveText('61');
  // ⌘Z (outside a field) reopens it.
  await page.keyboard.press('Meta+z');
  await expect(page.getByText(/^Round 4/)).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Dutch cards for Alex' })).toHaveValue('19');
});

test('Space presses a focused button instead of pausing, and focus rings show (AC-1, AC-5)', async ({ page }) => {
  await openApp(page, `#/play/${TTR_MID.matches[0]!.id}`, TTR_MID);
  await page.getByRole('button', { name: 'Claim a 2-route' }).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  const focused = page.getByRole('button', { name: 'Claim a 2-route' });
  await expect(focused).toBeFocused();
  const outline = await focused.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).toBe('solid');
  await page.keyboard.press(' ');
  await expect(page.getByText('Turn 24')).toBeVisible(); // claimed, not paused
  await expect(page.getByText('Paused', { exact: true })).toHaveCount(0);
});
