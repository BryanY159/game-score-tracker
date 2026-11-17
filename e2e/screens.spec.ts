import { test } from '@playwright/test';
import { expectLayoutClean } from './helpers/noWrap';
import { openApp } from './helpers/app';
import { CASEY, EIGHT, FOUR, MORGAN } from './fixtures/players';
import { NOW } from './fixtures/matches';
import { merge, PARCHEESI_DONE, PARCHEESI_MID, PARCHEESI_PAUSED, RECENT } from './fixtures/parcheesi';

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
  { name: 'home-empty', hash: '#/', ready: 'Game Night' },
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
  { name: 'home-in-progress', hash: '#/', ready: 'Game Night', seed: PARCHEESI_MID },
  { name: 'home-full', hash: '#/', ready: 'Game Night', seed: merge(PARCHEESI_PAUSED, ...RECENT) },
  { name: 'home-recent-only', hash: '#/', ready: 'Game Night', seed: merge(...RECENT) },
  {
    name: 'parcheesi-paused',
    hash: `#/play/${PARCHEESI_PAUSED.matches[0]!.id}`,
    ready: 'Parcheesi',
    seed: PARCHEESI_PAUSED,
  },
  {
    name: 'parcheesi-notes',
    hash: `#/play/${PARCHEESI_MID.matches[0]!.id}`,
    ready: 'Parcheesi',
    seed: PARCHEESI_MID,
    act: async (page) => {
      await page.getByRole('button', { name: 'Notes' }).click();
      await page.getByRole('dialog', { name: 'Notes' }).waitFor();
    },
  },
  {
    name: 'parcheesi-more',
    hash: `#/play/${PARCHEESI_MID.matches[0]!.id}`,
    ready: 'Parcheesi',
    seed: PARCHEESI_MID,
    act: async (page) => {
      await page.getByRole('button', { name: 'More' }).click();
      await page.getByRole('dialog', { name: 'Game options' }).waitFor();
    },
  },
  { name: 'game-picker', hash: '#/new', ready: 'Choose a game' },
  { name: 'settings-new', hash: '#/settings', ready: 'Settings' },
  {
    name: 'settings-backed-up',
    hash: '#/settings',
    ready: 'Settings',
    seed: {
      ...merge(...RECENT),
      settings: [
        {
          id: 'settings', createdAt: NOW, updatedAt: NOW, deletedAt: null, statsMinGames: 5,
          backupReminder: { enabled: true, mode: 'games', everyGames: 10 }, lastBackupAt: NOW - 10 * 24 * 3600_000,
        },
      ],
    },
  },
  {
    name: 'home-backup-banner',
    hash: '#/',
    ready: 'Game Night',
    seed: {
      ...merge(...RECENT),
      settings: [
        {
          id: 'settings', createdAt: NOW, updatedAt: NOW, deletedAt: null, statsMinGames: 5,
          backupReminder: { enabled: true, mode: 'games', everyGames: 2 }, lastBackupAt: null,
        },
      ],
    },
  },
  {
    name: 'setup-parcheesi',
    hash: '#/new/parcheesi',
    ready: 'Parcheesi setup',
    seed: { players: [...FOUR, CASEY, MORGAN] },
    act: async (page) => {
      // Riley's profile is gold, so after three others take pawn colors she keeps gold;
      // Casey (purple) gets the next free pawn color, which shows "Color changed".
      for (const name of ['Alex', 'Sam', 'Casey', 'Riley']) {
        await page.getByRole('button', { name, exact: true }).click();
      }
    },
  },
  {
    name: 'setup-guest',
    hash: '#/new/parcheesi',
    ready: 'Parcheesi setup',
    seed: { players: FOUR },
    act: async (page) => {
      await page.getByRole('button', { name: 'Guest' }).click();
    },
  },
  {
    name: 'setup-player-options',
    hash: '#/new/parcheesi',
    ready: 'Parcheesi setup',
    seed: { players: FOUR },
    act: async (page) => {
      await page.getByRole('button', { name: 'Alex', exact: true }).click();
      await page.getByRole('button', { name: 'Sam', exact: true }).click();
      await page.getByRole('button', { name: 'Sam options' }).click();
    },
  },
  { name: 'parcheesi-mid', hash: `#/play/${PARCHEESI_MID.matches[0]!.id}`, ready: 'Parcheesi', seed: PARCHEESI_MID },
  {
    name: 'parcheesi-results',
    hash: `#/play/${PARCHEESI_DONE.matches[0]!.id}/results`,
    ready: 'Riley wins',
    seed: PARCHEESI_DONE,
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
