import { ALEX, CASEY, CHRISTOPHER, DREW, JORDAN, MORGAN, RILEY, SAM } from './players';
import { match, NOW } from './matches';
import type { PaletteColor, Player, Round } from '../../src/domain/types';
import { blitzEntry } from '../../src/games/dutchBlitz/scoring';

type Score = [dutch: number, blitz: number];

function withRounds(
  players: { player: Player; color: PaletteColor; target?: number }[],
  rounds: Score[][],
  draft: Score[] | null,
  extra: Parameters<typeof match>[2] = {},
) {
  const g = match('dutchBlitz', players, { startedAt: NOW - (18 * 60 + 50) * 1000, ...extra });
  g.matchPlayers.forEach((mp, i) => (mp.target = players[i]!.target ?? 75));
  const mk = (scores: Score[], number: number, confirmed: boolean): Round => ({
    id: `c0000000-0000-4000-8000-${g.matches[0]!.id.slice(-6)}${String(number).padStart(6, '0')}`,
    createdAt: NOW - 60_000 * (10 - number),
    updatedAt: NOW - 60_000 * (10 - number),
    deletedAt: null,
    matchId: g.matches[0]!.id,
    number,
    dealerPlayerId: null,
    confirmed,
    entries: scores.map(([dutch, blitz], i) => blitzEntry(players[i]!.player.id, { dutch, blitz })),
  });
  const all = rounds.map((r, i) => mk(r, i + 1, true));
  if (draft) all.push(mk(draft, rounds.length + 1, false));
  return { ...g, rounds: all };
}

const four = [
  { player: ALEX, color: 'red' as const },
  { player: SAM, color: 'blue' as const },
  { player: JORDAN, color: 'green' as const },
  { player: RILEY, color: 'gold' as const },
];

/** The mockup's state: round 4 being entered, Jordan blitzed. */
export const BLITZ_MID = withRounds(
  four,
  [
    [[16, 0], [8, 2], [10, 1], [12, 3]],
    [[14, 1], [12, 0], [9, 2], [7, 2]],
    [[18, 0], [10, 3], [13, 0], [9, 1]],
  ],
  [[12, 2], [6, 5], [14, 0], [9, 3]],
);

/** Handicap: Alex plays to 90. */
export const BLITZ_HANDICAP = withRounds(
  [{ ...four[0]!, target: 90 }, four[1]!, four[2]!],
  [
    [[20, 0], [12, 1], [11, 2]],
    [[22, 0], [14, 2], [10, 1]],
  ],
  null,
);

const eight = [ALEX, SAM, JORDAN, RILEY, CASEY, MORGAN, CHRISTOPHER, DREW].map((player) => ({ player, color: player.color as PaletteColor }));
/** 8 players at 375×667 (plan R-2). */
export const BLITZ_EIGHT = withRounds(eight, [eight.map((_, i) => [10 + i, i % 3] as Score)], null);

/** Finished: Jordan wins on margin. */
export const BLITZ_DONE = withRounds(
  [{ ...four[0]!, target: 90 }, four[1]!, four[2]!, four[3]!],
  [
    [[30, 0], [20, 1], [25, 0], [18, 2]],
    [[30, 0], [22, 0], [28, 1], [20, 1]],
    [[25, 1], [20, 2], [30, 0], [16, 3]],
  ],
  null,
);

/** Finished with Alex and Sam tied on margin and total. */
export const BLITZ_TIE = withRounds(
  [four[0]!, four[1]!, four[2]!],
  [
    [[40, 0], [40, 0], [20, 3]],
    [[38, 0], [38, 0], [22, 1]],
  ],
  null,
);
