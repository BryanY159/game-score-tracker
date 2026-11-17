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
test('accepts truncated user text (a long player name)', async ({ page }) => {
  expect(await run(page, '<div style="width:50px"><span data-nowrap data-user-text style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Christopher Alexander</span></div>')).toBe('');
});
test('flags a truncated fixed label', async ({ page }) => {
  expect(await run(page, '<div style="width:50px"><span data-nowrap style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Confirm round</span></div>')).toContain('truncated label');
});
test('flags a label that spills out of its button', async ({ page }) => {
  expect(await run(page, '<button style="width:60px;height:44px;display:flex;justify-content:center"><span data-nowrap style="white-space:nowrap">Confirm round</span></button>')).toContain('spills out');
});
test('flags a horizontal page scroll', async ({ page }) => {
  expect(await run(page, '<div style="width:2000px;height:10px"></div>')).toContain('horizontal scroll');
});
test('flags a small tap target', async ({ page }) => {
  expect(await run(page, '<button style="width:30px;height:30px">+</button>')).toContain('tap target 30×30');
});
test('accepts a two-line row button (name over subtitle)', async ({ page }) => {
  expect(
    await run(page, '<button style="display:flex;flex-direction:column;height:68px;width:200px"><span>Alex</span><span>4 games</span></button>'),
  ).toBe('');
});
