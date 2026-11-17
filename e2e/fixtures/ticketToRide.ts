import { ALEX, CASEY, JORDAN, RILEY, SAM } from './players';
import { match, NOW } from './matches';
import type { Player, PlayerColor, TurnLog, TurnLogEntry } from '../../src/domain/types';

type Seat = { player: Player; color: PlayerColor };
type Act = number | 'd' | 't';

/** Builds a game from turns in seat order: a number is a route length, 'd' draws trains, 't' draws tickets. */
function ttrGame(seats: Seat[], acts: Act[], details: Record<string, Record<string, unknown>> = {}) {
  const g = match('ticketToRide', seats, { startedAt: NOW - 54 * 60_000 });
  const entries: TurnLogEntry[] = acts.map((a, i) => {
    const playerId = seats[i % seats.length]!.player.id;
    const at = NOW - (acts.length - i) * 20_000;
    if (a === 'd') return { playerId, action: 'drawTrains', at };
    if (a === 't') return { playerId, action: 'drawTickets', at };
    return { playerId, action: 'route', routeLength: a, at };
  });
  g.matchPlayers.forEach((mp) => (mp.details = details[mp.playerId] ?? {}));
  const log: TurnLog = { id: `e0000000-0000-4000-8000-${g.matches[0]!.id.slice(-12)}`, createdAt: NOW, updatedAt: NOW, deletedAt: null, matchId: g.matches[0]!.id, entries };
  return { ...g, turnLogs: [log] };
}

const four: Seat[] = [
  { player: SAM, color: 'blue' },
  { player: ALEX, color: 'red' },
  { player: JORDAN, color: 'black' },
  { player: RILEY, color: 'gold' },
];

/** The mockup: turn 23, Sam to play. */
export const TTR_MID = ttrGame(four, [6, 5, 4, 3, 5, 6, 'd', 4, 6, 4, 5, 't', 'd', 6, 6, 'd', 'd', 'd', 4, 3, 2, 4]);

/** Final round: Alex is down to 2 trains (just triggered). */
const toTwo: Act[] = [];
for (let i = 0; i < 7; i++) toTwo.push('d', 6, 'd', 'd');
toTwo.push('d', 1); // Alex: 7×6 + 1 = 43 → 2 left
export const TTR_FINAL_ROUND = ttrGame(four, toTwo);

/** Play over: everyone has had their last turn; tickets being entered. */
export const TTR_END = ttrGame(four, [...toTwo, 'd', 'd', 'd', 'd'], {
  [SAM.id]: { tickets: [{ value: 13, completed: true }, { value: 20, completed: true }, { value: 8, completed: false }], longestPath: true },
});

/** Tied on total and tickets, both on the longest path: the tie screen (FR-11 AC-2, AC-3). */
export const TTR_TIE = ttrGame([four[0]!, four[1]!], [...Array.from({ length: 7 }, () => [6, 6] as Act[]).flat(), 1, 1, 'd', 'd'], {
  [SAM.id]: { tickets: [{ value: 10, completed: true }], longestPath: true },
  [ALEX.id]: { tickets: [{ value: 10, completed: true }], longestPath: true },
});

/** 5 players (the maximum) at 375×667. */
export const TTR_FIVE = ttrGame([...four, { player: CASEY, color: 'green' }], [6, 5, 4, 3, 2, 'd', 'd']);

/** Same play as TTR_TIE, no tickets entered yet: for the ticket tie-break flow. */
export const TTR_TIEBREAK = ttrGame([four[0]!, four[1]!], [...Array.from({ length: 7 }, () => [6, 6] as Act[]).flat(), 1, 1, 'd', 'd']);
