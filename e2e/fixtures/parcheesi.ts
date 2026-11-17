import { ALEX, JORDAN, RILEY, SAM } from './players';
import { match, pawns, NOW } from './matches';

const seats = [
  { player: ALEX, color: 'red' as const },
  { player: SAM, color: 'blue' as const },
  { player: JORDAN, color: 'green' as const },
  { player: RILEY, color: 'gold' as const },
];

/** The mockup's state: Riley placed 1st, Alex 3, Jordan 2, Sam 1. */
export const PARCHEESI_MID = match('parcheesi', seats, {
  log: [...pawns(RILEY.id, 4), ...pawns(ALEX.id, 3), ...pawns(JORDAN.id, 2), ...pawns(SAM.id, 1)],
});

/** Finished order: Riley, Jordan, Alex, Sam (placed automatically). */
export const PARCHEESI_DONE = match('parcheesi', seats, {
  log: [...pawns(RILEY.id, 4), ...pawns(JORDAN.id, 4), ...pawns(SAM.id, 2), ...pawns(ALEX.id, 4, NOW - 1000)],
});

/** Paused mid-game, as after tapping Back. */
export const PARCHEESI_PAUSED = match('parcheesi', seats, {
  log: PARCHEESI_MID.matches[0]!.log,
  pausedAt: NOW - 10 * 60_000,
  notes: 'Doubles roll again.',
});

/** Finished games for Home's Recent list. */
function finished(order: typeof seats, endedAt: number, shared = false) {
  const g = match('parcheesi', order, { status: 'finished', startedAt: endedAt - 41 * 60_000, endedAt });
  g.matchPlayers.forEach((mp, i) => {
    mp.placement = shared && i === 1 ? 1 : i + 1;
    mp.isWinner = i === 0 || (shared && i === 1);
    mp.details = { pawnsHome: i === order.length - 1 ? 2 : 4 };
  });
  return g;
}
const DAY = 24 * 60 * 60_000;
export const RECENT = [
  finished([seats[3]!, seats[0]!, seats[1]!, seats[2]!], NOW - 2 * 60 * 60_000),
  finished([seats[1]!, seats[0]!], NOW - 3 * DAY),
  finished([seats[0]!, seats[1]!, seats[2]!], NOW - 9 * DAY, true),
];

export function merge(...parts: ReturnType<typeof match>[]) {
  return {
    matches: parts.flatMap((p) => p.matches),
    matchPlayers: parts.flatMap((p) => p.matchPlayers),
    players: [...new Map(parts.flatMap((p) => p.players).map((p) => [p.id, p])).values()],
  };
}
