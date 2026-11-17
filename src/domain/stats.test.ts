import { describe, expect, it } from 'vitest';
import { gameSpecific, headToHead, overall, perGame, winShare, winTrend, winningMargin, type GameRecord, type StatSeat } from './stats';
import type { GameKey } from './types';

let n = 0;
const seat = (playerId: string, placement: number, extra: Partial<StatSeat> = {}): StatSeat => ({
  playerId,
  placement,
  isWinner: placement === 1,
  finalScore: null,
  marginPastTarget: null,
  target: null,
  details: {},
  ...extra,
});
const game = (gameKey: GameKey, seats: StatSeat[], extra: Partial<GameRecord> = {}): GameRecord => ({
  matchId: `m${++n}`,
  gameKey,
  endedAt: n,
  lengthMs: 60 * 60_000,
  rounds: 0,
  seats,
  ...extra,
});
const P = [
  { id: 'alex', name: 'Alex' },
  { id: 'sam', name: 'Sam' },
  { id: 'jo', name: 'Jo' },
];

describe('win share (A-6)', () => {
  it('a shared win among k players counts 1/k', () => {
    const r = game('monopoly', [seat('alex', 1), seat('sam', 1), seat('jo', 3)]);
    expect([winShare(r, 'alex'), winShare(r, 'sam'), winShare(r, 'jo')]).toEqual([0.5, 0.5, 0]);
  });
});

describe('per-game stats (FR-14 AC-1 to AC-3)', () => {
  const recs = [
    game('parcheesi', [seat('alex', 1), seat('sam', 2)]),
    game('parcheesi', [seat('sam', 1), seat('alex', 2)]),
    game('parcheesi', [seat('alex', 1), seat('sam', 2), seat('jo', 3)]),
    game('parcheesi', [seat('alex', 1), seat('sam', 1)]), // shared
  ];
  it('rates and averages, not totals (AC-2)', () => {
    const s = perGame(recs, 'parcheesi', P, 1);
    const alex = s.find((x) => x.playerId === 'alex')!;
    expect(alex).toMatchObject({ games: 4, winRate: (1 + 0 + 1 + 0.5) / 4, avgPlacement: 1.25, avgMargin: null });
  });
  it('shows a player only after the minimum number of games (AC-3)', () => {
    const s = perGame(recs, 'parcheesi', P, 4);
    expect(s.map((x) => [x.playerId, x.eligible])).toEqual([
      ['alex', true],
      ['sam', true],
      ['jo', false],
    ]);
    expect(perGame(recs, 'parcheesi', P, 5).every((x) => !x.eligible)).toBe(true);
  });
  it('target games average the margin past target', () => {
    const r = [game('dutchBlitz', [seat('alex', 1, { marginPastTarget: 6 }), seat('sam', 2, { marginPastTarget: -10 })]), game('dutchBlitz', [seat('alex', 2, { marginPastTarget: -4 }), seat('sam', 1, { marginPastTarget: 2 })])];
    expect(perGame(r, 'dutchBlitz', P, 1).find((x) => x.playerId === 'alex')!.avgMargin).toBe(1);
  });
  it('Ticket to Ride margin is the winner minus the runner-up, in games won (A-7)', () => {
    const r = game('ticketToRide', [seat('alex', 1, { finalScore: 121 }), seat('sam', 2, { finalScore: 110 }), seat('jo', 3, { finalScore: 90 })]);
    expect(winningMargin(r, 'alex')).toBe(11);
    expect(winningMargin(r, 'sam')).toBeNull();
  });
});

describe('overall (A-5)', () => {
  it('is the mean of per-game win %, only over games where the minimum is reached', () => {
    const recs = [
      game('parcheesi', [seat('alex', 1), seat('sam', 2)]),
      game('parcheesi', [seat('alex', 1), seat('sam', 2)]),
      game('monopoly', [seat('alex', 2), seat('sam', 1)]),
      game('monopoly', [seat('alex', 2), seat('sam', 1)]),
      game('flip7', [seat('alex', 1), seat('sam', 2)]), // only 1 game: not counted with min 2
    ];
    const o = overall(recs, P, 2, ['parcheesi', 'monopoly', 'flip7']);
    expect(o.find((x) => x.playerId === 'alex')).toMatchObject({ winRate: 0.5, gamesCounted: 2, games: 5, eligible: true });
    expect(o.find((x) => x.playerId === 'jo')).toMatchObject({ eligible: false });
  });
});

describe('head to head (AC-4, A-8)', () => {
  it('counts only games both played; higher placement wins; shared placement is a tie', () => {
    const recs = [
      game('flip7', [seat('alex', 1, { finalScore: 212 }), seat('sam', 2, { finalScore: 190 })]),
      game('flip7', [seat('sam', 1, { finalScore: 230 }), seat('jo', 2), seat('alex', 3, { finalScore: 200 })]),
      game('monopoly', [seat('alex', 1), seat('sam', 1)]),
      game('parcheesi', [seat('alex', 1), seat('jo', 2)]), // Sam absent
    ];
    expect(headToHead(recs, 'alex', 'sam', null)).toEqual({ games: 3, aWins: 1, bWins: 1, ties: 1, aAvgMargin: 22, bAvgMargin: 30 });
    expect(headToHead(recs, 'alex', 'sam', 'flip7').games).toBe(2);
  });
});

describe('game-specific stats (AC-5)', () => {
  const all = new Set(['alex', 'sam', 'jo']);
  it('Parcheesi: pawns home, triple doublets per game and the most in one game', () => {
    const recs = [
      game('parcheesi', [seat('alex', 1, { details: { pawnsHome: 4, tripleDoublets: 3 } }), seat('sam', 2, { details: { pawnsHome: 2, tripleDoublets: 0 } })]),
      game('parcheesi', [seat('sam', 1, { details: { pawnsHome: 4, tripleDoublets: 1 } }), seat('alex', 2, { details: { pawnsHome: 3 } })]),
    ];
    const r = gameSpecific(recs, 'parcheesi', all);
    expect(r).toEqual([
      { label: 'Most pawns home on average', playerId: 'alex', value: '3.5' },
      { label: 'Fewest triple doublets per game', playerId: 'sam', value: '0.5' },
      { label: 'Most triple doublets in one game', playerId: 'alex', value: '3' },
      { label: 'Triple doublets per player per game', playerId: null, value: '1' },
    ]);
  });
  it('Ticket to Ride: ticket completion rate and longest-path rate', () => {
    const recs = [game('ticketToRide', [seat('alex', 1, { details: { tickets: [{ completed: true }, { completed: false }], longestPath: true } }), seat('sam', 2, { details: { tickets: [{ completed: true }] } })])];
    expect(gameSpecific(recs, 'ticketToRide', all)).toEqual([
      { label: 'Best ticket completion rate', playerId: 'sam', value: '100%' },
      { label: 'Longest path most often', playerId: 'alex', value: '100%' },
    ]);
  });
  it('Flip 7: Flip 7s per game, bust rate, fewest rounds to 200 by player count', () => {
    const recs = [
      game('flip7', [seat('alex', 1, { details: { flip7Count: 2, busts: 1, roundsTo200: 7 } }), seat('sam', 2, { details: { flip7Count: 0, busts: 4, roundsTo200: null } })], { rounds: 10 }),
      game('flip7', [seat('sam', 1, { details: { flip7Count: 1, busts: 2, roundsTo200: 6 } }), seat('alex', 2, { details: { flip7Count: 0, busts: 3 } }), seat('jo', 3, { details: { busts: 0 } })], { rounds: 8 }),
    ];
    expect(gameSpecific(recs, 'flip7', all)).toEqual([
      { label: 'Most Flip 7s per game', playerId: 'alex', value: '1' },
      { label: 'Lowest bust rate', playerId: 'jo', value: '0%' },
      { label: 'Fewest rounds to 200 · 2 players', playerId: 'alex', value: '7' },
      { label: 'Fewest rounds to 200 · 3 players', playerId: 'sam', value: '6' },
    ]);
  });
  it('Dutch Blitz: average rounds to finish; Monopoly: average game length', () => {
    expect(gameSpecific([game('dutchBlitz', [seat('alex', 1)], { rounds: 4 }), game('dutchBlitz', [seat('alex', 1)], { rounds: 7 })], 'dutchBlitz', all)).toEqual([
      { label: 'Rounds to finish, on average', playerId: null, value: '5.5' },
    ]);
    expect(gameSpecific([game('monopoly', [seat('alex', 1)], { lengthMs: 130 * 60_000 })], 'monopoly', all)[0]!.value).toBe('2 h 10 min');
  });
  it('leaves out players who are not eligible (hidden, guests, under the minimum)', () => {
    const recs = [game('parcheesi', [seat('guest', 1, { details: { pawnsHome: 4, tripleDoublets: 9 } }), seat('alex', 2, { details: { pawnsHome: 1 } })])];
    expect(gameSpecific(recs, 'parcheesi', new Set(['alex']))[0]).toMatchObject({ playerId: 'alex' });
  });
});

describe('win % trend', () => {
  it('is each player\'s running win % after each game', () => {
    const recs = [game('flip7', [seat('alex', 1), seat('sam', 2)]), game('flip7', [seat('alex', 2), seat('sam', 1)]), game('flip7', [seat('alex', 1), seat('sam', 2)])];
    expect(winTrend(recs, 'flip7', P)).toEqual([
      { game: 1, alex: 100, sam: 0 },
      { game: 2, alex: 50, sam: 50 },
      { game: 3, alex: 67, sam: 33 },
    ]);
  });
});

describe('head to head default', () => {
  it('picks the pair with the most games together', async () => {
    const { busiestPair } = await import('./stats');
    const recs = [game('flip7', [seat('alex', 1), seat('jo', 2)]), game('flip7', [seat('jo', 1), seat('alex', 2)]), game('flip7', [seat('sam', 1), seat('alex', 2)])];
    expect(busiestPair(recs, P, 'flip7')).toEqual(['alex', 'jo']);
  });
});
