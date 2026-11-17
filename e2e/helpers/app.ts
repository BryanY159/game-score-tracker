import type { Page } from '@playwright/test';
import { TEST_FONT_CSS } from './font';

type Seed = Parameters<NonNullable<Window['__test']>['seed']>[0];

/** Opens the app with an empty database, optionally seeded with synthetic fixtures. */
export async function openApp(page: Page, hash = '#/', seed?: Seed) {
  await page.goto('./');
  await page.waitForFunction(() => window.__test?.ready === true);
  await page.evaluate(async (data) => {
    await window.__test!.reset();
    if (data) await window.__test!.seed(data);
  }, seed);
  await page.goto(`./${hash}`);
  await page.reload();
  await page.waitForFunction(() => window.__test?.ready === true);
  await page.addStyleTag({ content: TEST_FONT_CSS });
  await page.evaluate(() => document.fonts.ready);
}
