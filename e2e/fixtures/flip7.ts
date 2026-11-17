import { ALEX, CASEY, CHRISTOPHER, DREW, JORDAN, MORGAN, RILEY, SAM } from './players';
import { match, NOW } from './matches';
import type { MatchEvent, PaletteColor, Player, Round } from '../../src/domain/types';
import { dealerFor, flip7Entry, type Flip7Raw } from '../../src/games/flip7/scoring';

type Cell = number | 'bust' | 'f7';
const raw = (c: Cell): Flip7Raw =>
  c === 'bust' ? { mode: 'number', value: null, bust: true, flip7: false } : c === 'f7' ? { mode: 'number', value: 43, bust: false, flip7: true } : { mode: 'number', value: c, bust: false, flip7: false };

function flip7Game(
  players: { player: Player; color: PaletteColor; target?: number }[],
  rounds: Cell[][],
  draft: (Flip7Raw | null)[] | null,
  extra: { settings?: Record<string, unknown>; log?: MatchEvent[] } = {},
) {
  const g = match('flip7', players, { startedAt: NOW - (32 * 60 + 14) * 1000, settings: extra.settings ?? { entryMode: 'number' }, log: extra.log ?? [] });
  g.matchPlayers.forEach((mp, i) => (mp.target = players[i]!.target ?? 200));
  const ids = players.map((p) => p.player.id);
  const mk = (entries: Round['entries'], number: number, confirmed: boolean): Round => ({
    id: `d0000000-0000-4000-8000-${g.matches[0]!.id.slice(-6)}${String(number).padStart(6, '0')}`,
    createdAt: NOW - 60_000 * (20 - number),
    updatedAt: NOW - 60_000 * (20 - number),
    deletedAt: null,
    matchId: g.matches[0]!.id,
    number,
    dealerPlayerId: dealerFor(number, ids),
    confirmed,
    entries,
  });
  const all = rounds.map((r, i) => mk(r.map((c, j) => flip7Entry(ids[j]!, raw(c))), i + 1, true));
  if (draft) all.push(mk(draft.flatMap((r, j) => (r ? [flip7Entry(ids[j]!, r)] : [])), rounds.length + 1, false));
  return { ...g, rounds: all };
}

const four = [
  { player: ALEX, color: 'red' as const, target: 250 },
  { player: SAM, color: 'blue' as const },
  { player: JORDAN, color: 'green' as const },
  { player: RILEY, color: 'gold' as const },
];

/** The mockup: round 6, Sam deals, Alex plays to 250, Riley is entering. */
export const FLIP7_MID = flip7Game(
  four,
  [
    [40, 35, 'bust', 30],
    ['f7', 20, 40, 25],
    [30, 'bust', 'f7', 28],
    [42, 50, 20, 33],
    [42, 71, 9, 25],
  ],
  [
    { mode: 'number', value: 31, bust: false, flip7: false },
    { mode: 'number', value: null, bust: true, flip7: false },
    { mode: 'number', value: 43, bust: false, flip7: true },
    { mode: 'number', value: 23, bust: false, flip7: false },
  ],
);

/** Cards mode, Alex's hand being tapped in. */
export const FLIP7_CARDS = flip7Game(four, [[40, 35, 30, 30]], [{ mode: 'cards', cards: [3, 7, 12], mods: [4], x2: false, bust: false }, null, null, null], {
  settings: { entryMode: 'cards' },
});

const eight = [ALEX, SAM, JORDAN, RILEY, CASEY, MORGAN, CHRISTOPHER, DREW].map((player) => ({ player, color: player.color as PaletteColor }));
/** 8 players at 375×667 (R-2), keypad open. */
export const FLIP7_EIGHT = flip7Game(eight, [eight.map((_, i) => 20 + i * 3)], null);

/** Finished: Jordan wins on margin (the Results mockup). */
export const FLIP7_DONE = flip7Game(
  four,
  [
    [100, 90, 'f7', 80],
    [100, 60, 80, 'bust'],
    [62, 55, 89, 101],
  ],
  null,
);

/** Alex and Sam tied on 212 (+12), Jordan 185: the FR-11 AC-4 example. */
export const FLIP7_TIE = flip7Game(
  [four[0]!, four[1]!, four[2]!].map((p) => ({ ...p, target: 200 })),
  [
    [112, 112, 85],
    [100, 100, 100],
  ],
  null,
);
