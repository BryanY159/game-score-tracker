import { describe, expect, it } from 'vitest';
import { blankRaw, dealerFor, flip7Entry, flip7Score, hasFlip7, isEntered, tapNumber, toggleMod, type Flip7Raw } from './scoring';
import { flip7Details } from './stats';
import { roundsResult } from '../rounds';
import type { MatchEvent, Round } from '../../domain/types';

type Cards = Extract<Flip7Raw, { mode: 'cards' }>;
const cards = (c: number[], mods: number[] = [], x2 = false, bust = false): Cards => ({ mode: 'cards', cards: c, mods, x2, bust });
const num = (value: number | null, flip7 = false, bust = false): Flip7Raw => ({ mode: 'number', value, flip7, bust });

describe('Flip 7 Number mode (FR-8 AC-1)', () => {
  it('scores the typed value, 0 on Bust, +15 with Flip 7!', () => {
    expect(flip7Score(num(23))).toBe(23);
    expect(flip7Score(num(23, false, true))).toBe(0);
    expect(flip7Score(num(43, true))).toBe(58);
    expect(hasFlip7(num(43, true))).toBe(true);
  });
  it('knows when a player has entered something', () => {
    expect(isEntered(blankRaw('number'))).toBe(false);
    expect(isEntered(num(0))).toBe(true);
    expect(isEntered(num(null, false, true))).toBe(true);
  });
});

describe('Flip 7 Cards mode (FR-8 AC-2)', () => {
  it('adds number cards and modifiers', () => {
    expect(flip7Score(cards([3, 7, 12], [4]))).toBe(26);
  });
  it('×2 doubles number cards only, not modifiers (spec C-7)', () => {
    expect(flip7Score(cards([3, 7, 12], [4, 10], true))).toBe(2 * 22 + 14);
  });
  it('7 different numbers is a Flip 7, detected automatically: +15', () => {
    const r = cards([0, 1, 2, 3, 4, 5, 6]);
    expect(hasFlip7(r)).toBe(true);
    expect(flip7Score(r)).toBe(21 + 15);
    expect(flip7Score(cards([0, 1, 2, 3, 4, 5, 6], [2], true))).toBe(42 + 2 + 15);
  });
  it('each number can be tapped once; a duplicate asks "Bust?"', () => {
    const t = tapNumber(cards([5]), 8);
    expect(t).toEqual({ kind: 'added', raw: cards([5, 8]) });
    expect(tapNumber(cards([5, 8]), 5)).toEqual({ kind: 'duplicate' });
  });
  it('no more cards after a Flip 7 or a bust', () => {
    expect(tapNumber(cards([0, 1, 2, 3, 4, 5, 6]), 9)).toEqual({ kind: 'full' });
    expect(tapNumber(cards([3], [], false, true), 9)).toEqual({ kind: 'full' });
  });
  it('modifiers toggle', () => {
    expect(toggleMod(cards([]), 4)).toMatchObject({ mods: [4] });
    expect(toggleMod(cards([], [4]), 4)).toMatchObject({ mods: [] });
  });
  it('a bust scores 0 and is flagged', () => {
    expect(flip7Entry('a', cards([3, 7], [], false, true))).toMatchObject({ score: 0, flags: ['bust'] });
    expect(flip7Entry('a', cards([0, 1, 2, 3, 4, 5, 6])).flags).toEqual(['flip7']);
  });
});

describe('dealer (FR-8 AC-3, FR-5 AC-5)', () => {
  it('rotates every round, starting with the first seat', () => {
    const seats = ['a', 'b', 'c'];
    expect([1, 2, 3, 4, 5].map((n) => dealerFor(n, seats))).toEqual(['a', 'b', 'c', 'a', 'b']);
  });
});

const round = (n: number, scores: Record<string, number | 'bust' | 'flip7'>): Round => ({
  id: `r${n}`,
  createdAt: n,
  updatedAt: n,
  deletedAt: null,
  matchId: 'm',
  number: n,
  dealerPlayerId: null,
  confirmed: true,
  entries: Object.entries(scores).map(([playerId, v]) =>
    v === 'bust'
      ? flip7Entry(playerId, num(null, false, true))
      : v === 'flip7'
        ? flip7Entry(playerId, num(45, true))
        : flip7Entry(playerId, num(v)),
  ),
});

describe('Flip 7 tie: play another round (FR-11 AC-4)', () => {
  const seats = ['alex', 'sam', 'jordan'].map((playerId) => ({ playerId, target: 200 }));
  // After the last round: Alex 212, Sam 212 (+12 each), Jordan 185.
  const rounds = [round(1, { alex: 112, sam: 112, jordan: 85 }), round(2, { alex: 100, sam: 100, jordan: 100 })];
  const extra = (afterRounds: number): MatchEvent => ({ type: 'extraRound', afterRounds, at: 0 });

  it('a tie on margin and total stays unresolved', () => {
    const r = roundsResult(seats, rounds, []);
    expect(r.over).toBe(true);
    expect(r.ranking.unresolvedTie).toEqual(['alex', 'sam']);
  });

  it('choosing "Play another round" reopens the game for everyone', () => {
    const r = roundsResult(seats, rounds, [extra(2)]);
    expect(r).toMatchObject({ over: false, extraRound: true });
  });

  it('the extra round adds to running totals; Jordan can pass Sam; Alex wins', () => {
    // Alex scores 20, Sam busts, Jordan scores 30.
    const r = roundsResult(seats, [...rounds, round(3, { alex: 20, sam: 'bust', jordan: 30 })], [extra(2)]);
    expect(r.over).toBe(true);
    expect(r.ranking.rows.map((x) => [x.playerId, x.total, x.margin, x.place, x.isWinner])).toEqual([
      ['alex', 232, 32, 1, true],
      ['jordan', 215, 15, 2, false],
      ['sam', 212, 12, 3, false],
    ]);
  });

  it('a player who was not tied can win the extra round', () => {
    const r = roundsResult(seats, [...rounds, round(3, { alex: 0, sam: 0, jordan: 60 })], [extra(2)]);
    expect(r.ranking.rows[0]).toMatchObject({ playerId: 'jordan', total: 245, isWinner: true });
  });

  it('if it is still tied, the tie comes back, as many times as needed', () => {
    const r = roundsResult(seats, [...rounds, round(3, { alex: 10, sam: 10, jordan: 0 })], [extra(2)]);
    expect(r.over).toBe(true);
    expect(r.ranking.unresolvedTie).toEqual(['alex', 'sam']);
    const again = roundsResult(seats, [...rounds, round(3, { alex: 10, sam: 10, jordan: 0 })], [extra(2), extra(3)]);
    expect(again.extraRound).toBe(true);
  });
});

describe('saved Flip 7 details (FR-8 AC-5)', () => {
  it('counts Flip 7s and busts, and the round each 200-target player reached 200', () => {
    const d = flip7Details(
      [
        { playerId: 'a', target: 200 },
        { playerId: 'b', target: 250 },
      ],
      [round(1, { a: 'flip7', b: 'bust' }), round(2, { a: 100, b: 'flip7' }), round(3, { a: 50, b: 200 })],
    );
    expect(d.a).toEqual({ flip7Count: 1, busts: 0, roundsTo200: 3 });
    // Handicap target: not counted for "fewest rounds to 200" (A-4).
    expect(d.b).toEqual({ flip7Count: 1, busts: 1, roundsTo200: null });
  });
});
