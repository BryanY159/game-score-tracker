import { expect, test, type Page } from '@playwright/test';
import { openApp } from './helpers/app';
import { FLIP7_DONE, FLIP7_LEAD } from './fixtures/flip7';
import { TTR_BEFORE_FINAL } from './fixtures/ticketToRide';
import { MONOPOLY_MID } from './fixtures/monopoly';
import { PARCHEESI_MID } from './fixtures/parcheesi';

const running = (page: Page) => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
const celebration = (page: Page) => page.locator('[data-celebration]');
const digits = async (page: Page, v: string) => {
  for (const d of v) await page.getByRole('group', { name: 'Number pad' }).getByRole('button', { name: d, exact: true }).click();
};

/** Each FR-19 moment, run with motion on and with Reduce Motion on. */
for (const motion of ['no-preference', 'reduce'] as const) {
  test.describe(`motion: ${motion}`, () => {
    test.use({ reducedMotion: motion });
    const animated = motion === 'no-preference';
    const expectMotion = async (page: Page) => {
      if (animated) expect(await running(page)).toBeGreaterThan(0);
      else expect(await running(page)).toBe(0); // AC-3: nothing moves
    };

    test('Flip 7, the lead change crown, count-up totals and sliding rows (AC-1, AC-2)', async ({ page }) => {
      await openApp(page, `#/play/${FLIP7_LEAD.matches[0]!.id}`, FLIP7_LEAD);
      const rows = page.locator('[data-flip-key]');
      await expect(rows.first()).toContainText('Alex'); // Alex leads after round 1
      await expect(page.getByRole('img', { name: 'Leader' })).toHaveCount(1);

      // Alex busts; Sam ticks Flip 7!
      await page.getByRole('button', { name: 'Bust' }).click();
      await digits(page, '35');
      await page.getByRole('button', { name: 'Flip 7!' }).click();
      await expect(celebration(page)).toHaveAttribute('data-celebration', 'flip7');
      await expect(celebration(page)).toContainText('Flip 7! Sam +15');
      await expectMotion(page);

      await page.getByRole('button', { name: 'Confirm round' }).click();
      // Sam 90 + 50 = 140 passes Alex's 100: new leader, crown, rows slide.
      await expect(celebration(page)).toHaveAttribute('data-celebration', 'leadChange');
      await expect(celebration(page)).toContainText('Sam takes the lead');
      await expectMotion(page);
      await expect(page.getByLabel('Sam total')).toHaveText('140');
      await expect(rows.first()).toContainText('Sam');
      await expect(rows.first().getByRole('img', { name: 'Leader' })).toBeVisible();
    });

    test('the Ticket to Ride final round (AC-2)', async ({ page }) => {
      await openApp(page, `#/play/${TTR_BEFORE_FINAL.matches[0]!.id}`, TTR_BEFORE_FINAL);
      await page.getByRole('button', { name: 'Claim a 1-route' }).click();
      await expect(celebration(page)).toHaveAttribute('data-celebration', 'finalRound');
      await expectMotion(page);
    });

    test('a Monopoly bankruptcy (AC-2)', async ({ page }) => {
      await openApp(page, `#/play/${MONOPOLY_MID.matches[0]!.id}`, MONOPOLY_MID);
      await page.getByRole('listitem').filter({ hasText: 'Riley' }).getByRole('button', { name: 'Bankrupt' }).click();
      await expect(celebration(page)).toContainText('Riley is bankrupt');
      await expectMotion(page);
    });

    test('all four Parcheesi pawns home (AC-2)', async ({ page }) => {
      await openApp(page, `#/play/${PARCHEESI_MID.matches[0]!.id}`, PARCHEESI_MID);
      await page.getByRole('button', { name: 'More pawns home for Alex' }).click(); // 3 → 4
      await expect(celebration(page)).toContainText('Alex: all 4 pawns home!');
      await expectMotion(page);
    });

    test('the animated podium (FR-12 AC-1)', async ({ page }) => {
      await openApp(page, `#/play/${FLIP7_DONE.matches[0]!.id}/results`, FLIP7_DONE);
      await expect(page.getByRole('heading', { name: 'Jordan wins' })).toBeVisible();
      await expectMotion(page);
    });
  });
}
