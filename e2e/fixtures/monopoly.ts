import { ALEX, CASEY, CHRISTOPHER, DREW, JORDAN, MORGAN, RILEY, SAM } from './players';
import { match, NOW } from './matches';
import type { PaletteColor } from '../../src/domain/types';

const four = [
  { player: ALEX, color: 'red' as const },
  { player: SAM, color: 'blue' as const },
  { player: JORDAN, color: 'green' as const },
  { player: RILEY, color: 'gold' as const },
];

/** Sam went bankrupt half an hour ago. */
export const MONOPOLY_MID = match('monopoly', four, {
  startedAt: NOW - 2 * 3600_000,
  log: [{ type: 'bankrupt', playerId: SAM.id, at: NOW - 30 * 60_000 }],
});

const eightPlayers = [ALEX, SAM, JORDAN, RILEY, CASEY, MORGAN, CHRISTOPHER, DREW].map((player) => ({
  player,
  color: player.color as PaletteColor,
}));

/** 8 players at 375×667 (plan R-2), two out. */
export const MONOPOLY_EIGHT = match('monopoly', eightPlayers, {
  log: [
    { type: 'bankrupt', playerId: DREW.id, at: NOW - 50 * 60_000 },
    { type: 'bankrupt', playerId: MORGAN.id, at: NOW - 20 * 60_000 },
  ],
});

/** Ended early with a shared win on net worth. */
export const MONOPOLY_SHARED = match('monopoly', four, {
  log: [
    { type: 'bankrupt', playerId: SAM.id, at: NOW - 30 * 60_000 },
    {
      type: 'endEarly',
      netWorth: { [ALEX.id]: 2400, [JORDAN.id]: 2400, [RILEY.id]: 900 },
      order: [ALEX.id, JORDAN.id, RILEY.id],
      tie: { kind: 'shared', playerIds: [ALEX.id, JORDAN.id] },
      at: NOW - 60_000,
    },
  ],
});
