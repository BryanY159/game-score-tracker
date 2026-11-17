import { expect, test } from '@playwright/test';
import { expectLayoutClean } from './helpers/noWrap';

// The layout checker must catch what it claims to catch, or green screenshots mean nothing.
const run = async (page: import('@playwright/test').Page, html: string) => {
  await page.setContent(`<body style="margin:0;font:16px sans-serif">${html}</body>`);
  try {
    await expectLayoutClean(page);
    return '';
  } catch (e) {
    return String(e);
  }
};

test('flags a wrapped button label', async ({ page }) => {
  expect(await run(page, '<button style="width:60px;height:60px">Confirm round</button>')).toContain('wrapped');
});
test('flags a nowrap label that overflows without truncating', async ({ page }) => {
  expect(await run(page, '<div style="width:50px"><span data-nowrap style="display:block;white-space:nowrap;overflow:hidden">Very long label</span></div>')).toContain('overflow');
});
test('accepts a truncated label', async ({ page }) => {
  expect(await run(page, '<div style="width:50px"><span data-nowrap style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Very long label</span></div>')).toBe('');
});
test('flags a horizontal page scroll', async ({ page }) => {
  expect(await run(page, '<div style="width:2000px;height:10px"></div>')).toContain('horizontal scroll');
});
test('flags a small tap target', async ({ page }) => {
  expect(await run(page, '<button style="width:30px;height:30px">+</button>')).toContain('tap target 30×30');
});
