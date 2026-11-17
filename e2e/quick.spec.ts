import { expect, test, type Locator, type Page } from '@playwright/test';
import { openApp } from './helpers/app';
import { PARCHEESI_MID } from './fixtures/parcheesi';
import { BLITZ_HANDICAP } from './fixtures/dutchBlitz';

const parcheesiId = PARCHEESI_MID.matches[0]!.id;

test('triple doublets: count, undo, save, and show in History (FR-6 AC-6)', async ({ page }) => {
  await openApp(page, `#/play/${parcheesiId}`, PARCHEESI_MID);
  const sam = page.getByLabel('triple doublets for Sam', { exact: true });
  await expect(sam).toHaveValue('1');
  await page.getByRole('button', { name: 'More triple doublets for Sam' }).click();
  await expect(sam).toHaveValue('2');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(sam).toHaveValue('1');
  // Riley is placed but can still get one.
  await page.getByRole('button', { name: 'More triple doublets for Riley' }).click();
  // Typing a count opens the number pad on iOS.
  await page.getByLabel('triple doublets for Jordan', { exact: true }).fill('3');
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'More pawns home for Jordan' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'More pawns home for Sam' }).click();
  await page.getByRole('button', { name: 'Finalize' }).click();
  await page.getByRole('link', { name: 'History' }).click();
  await page.getByRole('main').getByRole('listitem').first().getByRole('button').click();
  const rows = page.getByRole('list', { name: 'Players' }).getByRole('listitem');
  await expect(rows).toHaveText([/Riley.*1 triple doublet/, /Jordan.*3 triple doublets/, /Sam.*1 triple doublet/, /Alex.*0 triple doublets/]);
  // And in the History editor.
  await page.getByRole('button', { name: 'Edit scores' }).click();
  await expect(page.getByLabel('triple doublets for Jordan', { exact: true })).toHaveValue('3');
});

/** Presses and holds a button for `ms`, then lets go. */
async function hold(page: Page, button: Locator, ms: number) {
  const box = (await button.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

test('hold to repeat: a tap moves 1, holding moves more and stops on release (FR-18 AC-1)', async ({ page }) => {
  await openApp(page, `#/play/${BLITZ_HANDICAP.matches[0]!.id}`, BLITZ_HANDICAP);
  const value = page.getByRole('textbox', { name: 'Dutch cards for Sam' });
  const plus = page.getByRole('button', { name: 'More Dutch cards for Sam' });
  await plus.click();
  await expect(value).toHaveValue('1');

  await hold(page, plus, 1200);
  const afterHold = Number(await value.inputValue());
  expect(afterHold).toBeGreaterThan(3);
  await page.waitForTimeout(600);
  expect(Number(await value.inputValue())).toBe(afterHold); // stopped on release

  // A short press (under the 400 ms delay) is still exactly one step.
  await hold(page, plus, 150);
  await expect(value).toHaveValue(String(afterHold + 1));
});

test('hold stops at the limit', async ({ page }) => {
  await openApp(page, `#/play/${BLITZ_HANDICAP.matches[0]!.id}`, BLITZ_HANDICAP);
  const plus = page.getByRole('button', { name: 'More Blitz cards for Sam' });
  await hold(page, plus, 3000);
  await expect(page.getByRole('textbox', { name: 'Blitz cards for Sam' })).toHaveValue('10');
  await expect(plus).toBeDisabled();
});

test('steppers turn off iOS text selection and the long-press menu', async ({ page }) => {
  await openApp(page, `#/play/${parcheesiId}`, PARCHEESI_MID);
  const btn = page.getByRole('button', { name: 'More pawns home for Sam' });
  const css = await btn.evaluate((el) => {
    const s = getComputedStyle(el);
    return { select: s.userSelect || s.webkitUserSelect, callout: s.getPropertyValue('-webkit-touch-callout') };
  });
  expect(css.select).toBe('none');
  const prevented = await btn.evaluate((el) => !el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })));
  expect(prevented).toBe(true);
});
