import { test } from '@playwright/test';
import { expectLayoutClean } from './helpers/noWrap';
import { openApp } from './helpers/app';

/**
 * Every screen × every NFR-7 project. Screenshots land in screenshots/<project>/
 * (uploaded as a CI artifact) and are reviewed before each merge.
 */
const SCREENS = [
  { name: 'home-empty', hash: '#/', ready: 'Game night' },
  { name: 'history-empty', hash: '#/history', ready: 'History' },
  { name: 'stats-empty', hash: '#/stats', ready: 'Stats' },
  { name: 'players-empty', hash: '#/players', ready: 'Players' },
];

for (const s of SCREENS) {
  test(s.name, async ({ page }, info) => {
    await openApp(page, s.hash);
    await page.getByRole('heading', { name: s.ready }).waitFor();
    await page.screenshot({ path: `screenshots/${info.project.name}/${s.name}.png`, fullPage: true });
    await expectLayoutClean(page);
  });
}
