import { test } from '@playwright/test';
import { expectLayoutClean } from './helpers/noWrap';
import { openApp } from './helpers/app';
import { CASEY, EIGHT, FOUR, MORGAN } from './fixtures/players';
import { NOW } from './fixtures/matches';
import { MONOPOLY_EIGHT, MONOPOLY_MID, MONOPOLY_SHARED } from './fixtures/monopoly';
import { BLITZ_DONE, BLITZ_EIGHT, BLITZ_HANDICAP, BLITZ_MID, BLITZ_TIE } from './fixtures/dutchBlitz';
import { FLIP7_CARDS, FLIP7_DONE, FLIP7_EIGHT, FLIP7_MID, FLIP7_TIE } from './fixtures/flip7';
import { TTR_END, TTR_FINAL_ROUND, TTR_FIVE, TTR_MID, TTR_TIE } from './fixtures/ticketToRide';
import { STATS_HISTORY } from './fixtures/stats';
import { IPAD_FILE } from './fixtures/merge';
import { HISTORY, merge, PARCHEESI_DONE, PARCHEESI_MID, PARCHEESI_PAUSED, RECENT } from './fixtures/parcheesi';

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
      await page.getByRole('button', { name: 'More', exact: true }).click();
      await page.getByRole('dialog', { name: 'Game options' }).waitFor();
    },
  },
  { name: 'game-picker', hash: '#/new', ready: 'Choose a game' },
  { name: 'history-all', hash: '#/history', ready: 'History', seed: HISTORY },
  {
    name: 'stats-all',
    hash: '#/stats',
    ready: 'Stats',
    seed: STATS_HISTORY,
    act: async (page) => {
      await page.getByRole('img', { name: 'Win percentage over time' }).waitFor();
    },
  },
  {
    name: 'stats-parcheesi',
    hash: '#/stats',
    ready: 'Stats',
    seed: STATS_HISTORY,
    act: async (page) => {
      await page.getByRole('tab', { name: 'Parcheesi' }).click();
      await page.getByRole('img', { name: 'Win percentage over time' }).waitFor();
    },
  },
  {
    name: 'stats-flip7',
    hash: '#/stats',
    ready: 'Stats',
    seed: STATS_HISTORY,
    act: async (page) => {
      await page.getByRole('tab', { name: 'Flip 7' }).click();
      await page.getByRole('img', { name: 'Win percentage over time' }).waitFor();
    },
  },
  {
    name: 'stats-dutchBlitz',
    hash: '#/stats',
    ready: 'Stats',
    seed: STATS_HISTORY,
    act: async (page) => {
      await page.getByRole('tab', { name: 'Dutch Blitz' }).click();
      await page.getByRole('img', { name: 'Win percentage over time' }).waitFor();
    },
  },
  {
    name: 'stats-ticketToRide',
    hash: '#/stats',
    ready: 'Stats',
    seed: STATS_HISTORY,
    act: async (page) => {
      await page.getByRole('tab', { name: 'Ticket to Ride' }).click();
      await page.getByRole('img', { name: 'Win percentage over time' }).waitFor();
    },
  },
  {
    name: 'stats-monopoly',
    hash: '#/stats',
    ready: 'Stats',
    seed: STATS_HISTORY,
    act: async (page) => {
      await page.getByRole('tab', { name: 'Monopoly' }).click();
      await page.getByRole('img', { name: 'Win percentage over time' }).waitFor();
    },
  },
  {
    name: 'stats-h2h-pick',
    hash: '#/stats',
    ready: 'Stats',
    seed: STATS_HISTORY,
    act: async (page) => {
      await page.getByRole('button', { name: /^Change / }).first().click();
      await page.getByRole('dialog', { name: 'Choose a player' }).waitFor();
    },
  },
  { name: 'players-stats', hash: '#/players', ready: 'Players', seed: STATS_HISTORY },
  { name: 'ttr-mid', hash: `#/play/${TTR_MID.matches[0]!.id}`, ready: 'Ticket to Ride', seed: TTR_MID },
  { name: 'ttr-final-round', hash: `#/play/${TTR_FINAL_ROUND.matches[0]!.id}`, ready: 'Ticket to Ride', seed: TTR_FINAL_ROUND },
  { name: 'ttr-five', hash: `#/play/${TTR_FIVE.matches[0]!.id}`, ready: 'Ticket to Ride', seed: TTR_FIVE },
  {
    name: 'ttr-turn-log',
    hash: `#/play/${TTR_MID.matches[0]!.id}`,
    ready: 'Ticket to Ride',
    seed: TTR_MID,
    act: async (page) => {
      await page.getByRole('button', { name: 'Turn log' }).click();
      await page.getByRole('dialog', { name: 'Turn log' }).waitFor();
    },
  },
  {
    name: 'ttr-turn-edit',
    hash: `#/play/${TTR_MID.matches[0]!.id}`,
    ready: 'Ticket to Ride',
    seed: TTR_MID,
    act: async (page) => {
      await page.getByRole('button', { name: 'Turn log' }).click();
      await page.getByRole('button', { name: /^Turn 3:/ }).click();
    },
  },
  { name: 'ttr-end', hash: `#/play/${TTR_END.matches[0]!.id}/final`, ready: 'Final scoring', seed: TTR_END },
  {
    name: 'ttr-add-ticket',
    hash: `#/play/${TTR_END.matches[0]!.id}/final`,
    ready: 'Final scoring',
    seed: TTR_END,
    act: async (page) => {
      await page.getByRole('button', { name: 'Add ticket' }).click();
      await page.getByRole('dialog', { name: 'Add ticket' }).getByRole('button', { name: '1', exact: true }).click();
      await page.getByRole('dialog', { name: 'Add ticket' }).getByRole('button', { name: '3', exact: true }).click();
    },
  },
  {
    name: 'ttr-tie',
    hash: `#/play/${TTR_TIE.matches[0]!.id}/results`,
    ready: 'Tied for first',
    seed: TTR_TIE,
    act: async (page) => {
      await page.getByRole('dialog', { name: "It's a tie" }).waitFor();
    },
  },
  { name: 'flip7-mid', hash: `#/play/${FLIP7_MID.matches[0]!.id}`, ready: 'Flip 7', seed: FLIP7_MID },
  { name: 'flip7-cards', hash: `#/play/${FLIP7_CARDS.matches[0]!.id}`, ready: 'Flip 7', seed: FLIP7_CARDS },
  {
    // Several modifiers selected: each shows the ring and ✓ (FR-8 AC-2).
    name: 'flip7-modifiers',
    hash: `#/play/${FLIP7_CARDS.matches[0]!.id}`,
    ready: 'Flip 7',
    seed: FLIP7_CARDS,
    act: async (page) => {
      await page.getByRole('button', { name: /^Alex, this round/ }).click();
      for (const m of ['+2', '+10', '×2']) await page.getByRole('button', { name: m, exact: true }).click();
    },
  },
  { name: 'flip7-eight', hash: `#/play/${FLIP7_EIGHT.matches[0]!.id}`, ready: 'Flip 7', seed: FLIP7_EIGHT },
  {
    name: 'flip7-keypad',
    hash: `#/play/${FLIP7_MID.matches[0]!.id}`,
    ready: 'Flip 7',
    seed: FLIP7_MID,
    act: async (page) => {
      await page.getByRole('button', { name: "Type Riley's round score" }).click();
    },
  },
  {
    // FR-20 AC-6: the ? overlay.
    name: 'shortcuts-overlay',
    hash: `#/play/${FLIP7_MID.matches[0]!.id}`,
    ready: 'Flip 7',
    seed: FLIP7_MID,
    act: async (page) => {
      await page.keyboard.press('?');
      await page.getByRole('dialog', { name: 'Keyboard shortcuts' }).waitFor();
    },
  },
  {
    name: 'flip7-round-edit',
    hash: `#/play/${FLIP7_MID.matches[0]!.id}`,
    ready: 'Flip 7',
    seed: FLIP7_MID,
    act: async (page) => {
      await page.getByRole('button', { name: 'Rounds', exact: true }).click();
      await page.getByRole('button', { name: 'Round 2' }).click();
      await page.getByRole('dialog', { name: 'Edit round 2' }).waitFor();
    },
  },
  { name: 'flip7-results', hash: `#/play/${FLIP7_DONE.matches[0]!.id}/results`, ready: 'Jordan wins', seed: FLIP7_DONE },
  {
    name: 'flip7-tie',
    hash: `#/play/${FLIP7_TIE.matches[0]!.id}/results`,
    ready: 'Tied for first',
    seed: FLIP7_TIE,
    act: async (page) => {
      await page.getByRole('dialog', { name: "It's a tie" }).waitFor();
    },
  },
  {
    name: 'setup-flip7',
    hash: '#/new/flip7',
    ready: 'Flip 7 setup',
    seed: { players: FOUR },
    act: async (page) => {
      for (const name of ['Alex', 'Sam', 'Jordan']) await page.getByRole('button', { name, exact: true }).click();
    },
  },
  { name: 'blitz-mid', hash: `#/play/${BLITZ_MID.matches[0]!.id}`, ready: 'Dutch Blitz', seed: BLITZ_MID },
  { name: 'blitz-handicap', hash: `#/play/${BLITZ_HANDICAP.matches[0]!.id}`, ready: 'Dutch Blitz', seed: BLITZ_HANDICAP },
  { name: 'blitz-eight', hash: `#/play/${BLITZ_EIGHT.matches[0]!.id}`, ready: 'Dutch Blitz', seed: BLITZ_EIGHT },
  {
    name: 'blitz-rounds',
    hash: `#/play/${BLITZ_MID.matches[0]!.id}`,
    ready: 'Dutch Blitz',
    seed: BLITZ_MID,
    act: async (page) => {
      await page.getByRole('button', { name: 'Rounds', exact: true }).click();
      await page.getByRole('dialog', { name: 'Rounds' }).waitFor();
    },
  },
  {
    name: 'blitz-round-edit',
    hash: `#/play/${BLITZ_MID.matches[0]!.id}`,
    ready: 'Dutch Blitz',
    seed: BLITZ_MID,
    act: async (page) => {
      await page.getByRole('button', { name: 'Rounds', exact: true }).click();
      await page.getByRole('button', { name: 'Round 2' }).click();
      await page.getByRole('dialog', { name: 'Edit round 2' }).waitFor();
    },
  },
  {
    name: 'blitz-results',
    hash: `#/play/${BLITZ_DONE.matches[0]!.id}/results`,
    ready: 'Jordan wins',
    seed: BLITZ_DONE,
  },
  {
    name: 'blitz-tie',
    hash: `#/play/${BLITZ_TIE.matches[0]!.id}/results`,
    ready: 'Tied for first',
    seed: BLITZ_TIE,
    act: async (page) => {
      await page.getByRole('dialog', { name: "It's a tie" }).waitFor();
    },
  },
  {
    name: 'setup-dutch-blitz',
    hash: '#/new/dutchBlitz',
    ready: 'Dutch Blitz setup',
    seed: { players: EIGHT },
    act: async (page) => {
      for (const name of ['Alex', 'Sam', 'Jordan', 'Christopher Alexander']) {
        await page.getByRole('button', { name, exact: true }).click();
      }
      await page.getByRole('textbox', { name: 'Alex target' }).fill('90');
    },
  },
  { name: 'monopoly-mid', hash: `#/play/${MONOPOLY_MID.matches[0]!.id}`, ready: 'Monopoly', seed: MONOPOLY_MID },
  { name: 'monopoly-eight', hash: `#/play/${MONOPOLY_EIGHT.matches[0]!.id}`, ready: 'Monopoly', seed: MONOPOLY_EIGHT },
  {
    name: 'monopoly-net-worth',
    hash: `#/play/${MONOPOLY_MID.matches[0]!.id}`,
    ready: 'Monopoly',
    seed: MONOPOLY_MID,
    act: async (page) => {
      await page.getByRole('button', { name: 'End game' }).click();
      for (const d of '1520') await page.getByRole('button', { name: d, exact: true }).click();
      await page.getByRole('button', { name: 'Next player' }).click();
    },
  },
  {
    name: 'monopoly-net-worth-eight',
    hash: `#/play/${MONOPOLY_EIGHT.matches[0]!.id}`,
    ready: 'Monopoly',
    seed: MONOPOLY_EIGHT,
    act: async (page) => {
      await page.getByRole('button', { name: 'End game' }).click();
    },
  },
  {
    name: 'monopoly-rank',
    hash: `#/play/${MONOPOLY_MID.matches[0]!.id}`,
    ready: 'Monopoly',
    seed: MONOPOLY_MID,
    act: async (page) => {
      await page.getByRole('button', { name: 'End game' }).click();
      for (const v of ['2400', '2400', '900']) {
        for (const d of v) await page.getByRole('button', { name: d, exact: true }).click();
        await page.getByRole('button', { name: /Next player|Rank players/ }).click();
      }
    },
  },
  {
    name: 'monopoly-tie',
    hash: `#/play/${MONOPOLY_MID.matches[0]!.id}`,
    ready: 'Monopoly',
    seed: MONOPOLY_MID,
    act: async (page) => {
      await page.getByRole('button', { name: 'End game' }).click();
      for (const v of ['2400', '2400', '900']) {
        for (const d of v) await page.getByRole('button', { name: d, exact: true }).click();
        await page.getByRole('button', { name: /Next player|Rank players/ }).click();
      }
      await page.getByRole('button', { name: 'See results' }).click();
      await page.getByRole('dialog', { name: "It's a tie" }).waitFor();
    },
  },
  {
    name: 'monopoly-results-shared',
    hash: `#/play/${MONOPOLY_SHARED.matches[0]!.id}/results`,
    ready: 'Shared win',
    seed: MONOPOLY_SHARED,
  },
  {
    name: 'history-player-filter',
    hash: '#/history',
    ready: 'History',
    seed: HISTORY,
    act: async (page) => {
      await page.getByRole('button', { name: 'All players' }).click();
      await page.getByRole('dialog', { name: 'Filter by player' }).waitFor();
    },
  },
  {
    name: 'history-filtered',
    hash: '#/history',
    ready: 'History',
    seed: HISTORY,
    act: async (page) => {
      await page.getByRole('button', { name: 'All players' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Riley' }).click();
    },
  },
  {
    name: 'match-detail',
    hash: `#/history/${HISTORY.matches[3]!.id}`,
    ready: 'Parcheesi',
    seed: HISTORY,
  },
  {
    name: 'match-edit',
    hash: `#/history/${RECENT[0]!.matches[0]!.id}/edit`,
    ready: 'Edit Parcheesi',
    seed: HISTORY,
  },
  { name: 'settings-new', hash: '#/settings', ready: 'Settings' },
  {
    name: 'merge-preview',
    hash: '#/settings',
    ready: 'Settings',
    seed: merge(...RECENT),
    act: async (page) => {
      await page.getByLabel('File to merge').setInputFiles({ name: 'ipad.backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(IPAD_FILE)) });
      await page.getByRole('dialog', { name: 'Merge preview' }).waitFor();
    },
  },
  {
    name: 'merge-these',
    hash: '#/settings',
    ready: 'Settings',
    seed: merge(...RECENT),
    act: async (page) => {
      await page.getByLabel('File to merge').setInputFiles({ name: 'ipad.backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(IPAD_FILE)) });
      await page.getByRole('dialog', { name: 'Merge preview' }).getByRole('button', { name: 'Merge' }).click();
      await page.getByRole('dialog', { name: 'Merge these?' }).waitFor();
    },
  },
  {
    name: 'merge-players-tool',
    hash: '#/settings',
    ready: 'Settings',
    seed: merge(...RECENT),
    act: async (page) => {
      await page.getByRole('button', { name: 'Merge players' }).click();
      await page.getByRole('dialog', { name: 'Merge players' }).getByRole('radio', { name: 'Alex' }).first().click();
    },
  },
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
