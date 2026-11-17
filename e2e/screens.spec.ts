import { test } from '@playwright/test';
import { expectLayoutClean } from './helpers/noWrap';
import { openApp } from './helpers/app';
import { EIGHT, FOUR } from './fixtures/players';

/**
 * Every screen × every NFR-7 project. Screenshots land in screenshots/<project>/
 * (uploaded as a CI artifact) and are reviewed before each merge.
 */
type Screen = {
  name: string;
  hash: string;
  ready: string;
  seed?: Parameters<typeof openApp>[2];
  /** Optional interaction after load, before the screenshot. */
  act?: (page: import('@playwright/test').Page) => Promise<void>;
};

const SCREENS: Screen[] = [
  { name: 'home-empty', hash: '#/', ready: 'Game night' },
  { name: 'history-empty', hash: '#/history', ready: 'History' },
  { name: 'stats-empty', hash: '#/stats', ready: 'Stats' },
  { name: 'players-empty', hash: '#/players', ready: 'Players' },
  { name: 'players-4', hash: '#/players', ready: 'Players', seed: { players: FOUR } },
  { name: 'players-8', hash: '#/players', ready: 'Players', seed: { players: EIGHT } },
  {
    name: 'player-new',
    hash: '#/players',
    ready: 'Players',
    seed: { players: FOUR },
    act: async (page) => {
      await page.getByRole('button', { name: 'Add player' }).click();
      await page.getByRole('dialog', { name: 'New player' }).waitFor();
    },
  },
  {
    name: 'player-edit',
    hash: '#/players',
    ready: 'Players',
    seed: { players: EIGHT },
    act: async (page) => {
      await page.getByRole('button', { name: /Morgan/ }).click();
      await page.getByRole('dialog', { name: 'Edit player' }).waitFor();
    },
  },
  {
    name: 'player-delete-confirm',
    hash: '#/players',
    ready: 'Players',
    seed: { players: FOUR },
    act: async (page) => {
      await page.getByRole('button', { name: /Riley/ }).click();
      await page.getByRole('button', { name: 'Delete' }).click();
      await page.getByRole('alertdialog').waitFor();
    },
  },
];

for (const s of SCREENS) {
  test(s.name, async ({ page }, info) => {
    await openApp(page, s.hash, s.seed);
    await page.getByRole('heading', { name: s.ready, exact: true }).waitFor();
    await s.act?.(page);
    await page.screenshot({ path: `screenshots/${info.project.name}/${s.name}.png`, fullPage: true });
    await expectLayoutClean(page);
  });
}
