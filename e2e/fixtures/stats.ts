import { ALEX, CASEY, JORDAN, MORGAN, RILEY, SAM } from './players';
import { match, NOW } from './matches';
import type { GameKey, Player, PlayerColor, Round } from '../../src/domain/types';

/** A synthetic history across all five games, for Stats (M10). Morgan is hidden from stats. */
type S = { player: Player; place: number; score?: number; margin?: number; target?: number; details?: Record<string, unknown> };
const DAY = 24 * 3600_000;
let k = 0;

function finished(gameKey: GameKey, seats: S[], daysAgo: number, rounds = 0, minutes = 45) {
  const endedAt = NOW - daysAgo * DAY;
  const g = match(
    gameKey,
    seats.map((s) => ({ player: s.player, color: s.player.color as PlayerColor })),
    { status: 'finished', startedAt: endedAt - minutes * 60_000, endedAt },
  );
  g.matchPlayers.forEach((mp, i) => {
    const s = seats[i]!;
    mp.placement = s.place;
    mp.isWinner = s.place === 1;
    mp.finalScore = s.score ?? null;
    mp.marginPastTarget = s.margin ?? null;
    mp.target = s.target ?? null;
    mp.details = s.details ?? {};
  });
  const rs: Round[] = Array.from({ length: rounds }, (_, i) => ({
    id: `f0000000-0000-4000-8000-${String(++k).padStart(12, '0')}`,
    createdAt: endedAt,
    updatedAt: endedAt,
    deletedAt: null,
    matchId: g.matches[0]!.id,
    number: i + 1,
    dealerPlayerId: null,
    entries: [],
    confirmed: true,
  }));
  return { ...g, rounds: rs };
}

const games = [
  // Parcheesi ×6: Alex 3 wins, Sam 2, Jordan 1.
  ...[0, 1, 2, 3, 4, 5].map((i) =>
    finished(
      'parcheesi',
      [
        { player: [ALEX, SAM, ALEX, JORDAN, ALEX, SAM][i]!, place: 1, details: { pawnsHome: 4, tripleDoublets: i % 3 } },
        { player: [SAM, ALEX, SAM, ALEX, SAM, ALEX][i]!, place: 2, details: { pawnsHome: 3, tripleDoublets: i === 2 ? 4 : 1 } },
        { player: [JORDAN, JORDAN, JORDAN, SAM, JORDAN, JORDAN][i]!, place: 3, details: { pawnsHome: 1, tripleDoublets: 0 } },
      ],
      30 - i * 4,
      40,
    ),
  ),
  // Flip 7 ×5, Morgan (hidden) plays twice; Casey only twice (under the minimum).
  ...[0, 1, 2, 3, 4].map((i) =>
    finished(
      'flip7',
      [
        { player: [JORDAN, ALEX, ALEX, JORDAN, SAM][i]!, place: 1, score: 227, margin: 27, target: 200, details: { flip7Count: 2, busts: 1, roundsTo200: 7 + i } },
        { player: [ALEX, SAM, JORDAN, ALEX, ALEX][i]!, place: 2, score: 210, margin: 10, target: 200, details: { flip7Count: 1, busts: 2, roundsTo200: 9 } },
        { player: [SAM, JORDAN, SAM, SAM, JORDAN][i]!, place: 3, score: 180, margin: -20, target: 200, details: { flip7Count: 0, busts: 4, roundsTo200: null } },
        ...(i < 2 ? [{ player: [MORGAN, CASEY][i]!, place: 4, score: 150, margin: -50, target: 200, details: { flip7Count: 0, busts: 5, roundsTo200: null } }] : []),
      ],
      25 - i * 5,
      9,
      50,
    ),
  ),
  // Dutch Blitz ×5.
  ...[0, 1, 2, 3, 4].map((i) =>
    finished(
      'dutchBlitz',
      [
        { player: [ALEX, ALEX, SAM, RILEY, ALEX][i]!, place: 1, score: 82, margin: 7, target: 75 },
        { player: [SAM, RILEY, ALEX, ALEX, RILEY][i]!, place: 2, score: 60, margin: -15, target: 75 },
        { player: [RILEY, SAM, RILEY, SAM, SAM][i]!, place: 3, score: 41, margin: -34, target: 75 },
      ],
      20 - i * 3,
      4 + i,
      35,
    ),
  ),
  // Ticket to Ride ×5.
  ...[0, 1, 2, 3, 4].map((i) =>
    finished(
      'ticketToRide',
      [
        { player: [SAM, SAM, ALEX, SAM, JORDAN][i]!, place: 1, score: 121, details: { routePoints: 90, tickets: [{ value: 13, completed: true }, { value: 9, completed: true }], longestPath: true } },
        { player: [ALEX, JORDAN, SAM, ALEX, SAM][i]!, place: 2, score: 110, details: { routePoints: 88, tickets: [{ value: 10, completed: true }, { value: 8, completed: false }], longestPath: false } },
        { player: [JORDAN, ALEX, JORDAN, JORDAN, ALEX][i]!, place: 3, score: 95, details: { routePoints: 80, tickets: [{ value: 15, completed: true }], longestPath: false } },
      ],
      18 - i * 3,
      0,
      82,
    ),
  ),
  // Monopoly ×5.
  ...[0, 1, 2, 3, 4].map((i) =>
    finished(
      'monopoly',
      [
        { player: [RILEY, ALEX, RILEY, SAM, RILEY][i]!, place: 1 },
        { player: [ALEX, RILEY, SAM, RILEY, ALEX][i]!, place: 2 },
        { player: [SAM, SAM, ALEX, ALEX, SAM][i]!, place: 3 },
      ],
      26 - i * 5,
      0,
      120 + i * 5,
    ),
  ),
];

export const STATS_HISTORY = {
  matches: games.flatMap((g) => g.matches),
  matchPlayers: games.flatMap((g) => g.matchPlayers),
  rounds: games.flatMap((g) => g.rounds),
  players: [ALEX, SAM, JORDAN, RILEY, CASEY, MORGAN],
};
