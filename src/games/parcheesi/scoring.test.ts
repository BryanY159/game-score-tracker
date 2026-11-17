import { describe, expect, it } from 'vitest';
import { canStep, parcheesiState } from './scoring';
import type { MatchEvent } from '../../domain/types';
import { ordinal } from '../../domain/placement';

const seats = ['a', 'b', 'c', 'd'];
const step = (playerId: string, delta: 1 | -1 = 1, n = 1): MatchEvent[] =>
  Array.from({ length: n }, () => ({ type: 'pawns', playerId, delta, at: 0 }));

describe('Parcheesi scoring (FR-6)', () => {
  it('starts everyone at 0 pawns home, unplaced', () => {
    const s = parcheesiState(seats, []);
    expect(s.players.map((p) => [p.pawnsHome, p.placement])).toEqual([[0, null], [0, null], [0, null], [0, null]]);
    expect(s.complete).toBe(false);
  });

  it('places players in the order they reach 4 (AC-2)', () => {
    const s = parcheesiState(seats, [...step('c', 1, 4), ...step('a', 1, 3), ...step('b', 1, 4)]);
    expect(s.players.find((p) => p.playerId === 'c')!.placement).toBe(1);
    expect(s.players.find((p) => p.playerId === 'b')!.placement).toBe(2);
    expect(s.players.find((p) => p.playerId === 'a')).toMatchObject({ pawnsHome: 3, placement: null });
  });

  it('places the last player left automatically and completes (AC-3)', () => {
    const s = parcheesiState(seats, [...step('c', 1, 4), ...step('b', 1, 4), ...step('a', 1, 2), ...step('d', 1, 4)]);
    expect(s.players.map((p) => p.placement)).toEqual([4, 2, 1, 3]);
    expect(s.players.find((p) => p.playerId === 'a')!.pawnsHome).toBe(2);
    expect(s.complete).toBe(true);
  });

  it('works for two players', () => {
    const s = parcheesiState(['a', 'b'], step('b', 1, 4));
    expect(s.players.map((p) => p.placement)).toEqual([2, 1]);
    expect(s.complete).toBe(true);
  });

  it('keeps pawns within 0–4 and ignores steps for placed players', () => {
    const s = parcheesiState(seats, [...step('a', -1), ...step('b', 1, 4), ...step('b', -1), ...step('b', 1)]);
    expect(s.players[0]!.pawnsHome).toBe(0);
    expect(s.players[1]).toMatchObject({ pawnsHome: 4, placement: 1 });
    expect(canStep(s, 'a', -1)).toBe(false);
    expect(canStep(s, 'a', 1)).toBe(true);
    expect(canStep(s, 'b', -1)).toBe(false);
  });

  it('undo (dropping the last entry) un-places a player (FR-5 AC-4)', () => {
    const log = [...step('a', 1, 4)];
    expect(parcheesiState(seats, log).players[0]!.placement).toBe(1);
    expect(parcheesiState(seats, log.slice(0, -1)).players[0]).toMatchObject({ pawnsHome: 3, placement: null });
  });

  it('formats places', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd']);
  });
});

describe('Parcheesi results', () => {
  it('maps the finished state to saved seat results (FR-6 AC-4)', async () => {
    const { parcheesiResults } = await import('./scoring');
    const seats = [
      { matchPlayerId: 'm1', playerId: 'a' },
      { matchPlayerId: 'm2', playerId: 'b' },
    ];
    expect(parcheesiResults(seats, step('b', 1, 4))).toEqual([
      { matchPlayerId: 'm1', placement: 2, finalScore: null, marginPastTarget: null, isWinner: false, details: { pawnsHome: 0, tripleDoublets: 0 } },
      { matchPlayerId: 'm2', placement: 1, finalScore: null, marginPastTarget: null, isWinner: true, details: { pawnsHome: 4, tripleDoublets: 0 } },
    ]);
  });
});

describe('triple doublets (FR-6 AC-6)', () => {
  const td = (playerId: string, delta: number): MatchEvent => ({ type: 'tripleDoublets', playerId, delta, at: 0 });
  it('counts per player, never below 0, and undo drops the last entry', () => {
    const log = [td('a', 1), td('a', 1), td('b', -1), td('c', 3)];
    const s = parcheesiState(seats, log);
    expect(s.players.map((p) => p.tripleDoublets)).toEqual([2, 0, 3, 0]);
    expect(parcheesiState(seats, log.slice(0, -1)).players[2]!.tripleDoublets).toBe(0);
  });
  it('can still change after a player is placed, and does not affect places', () => {
    const s = parcheesiState(seats, [...step('a', 1, 4), td('a', 1)]);
    expect(s.players[0]).toMatchObject({ placement: 1, tripleDoublets: 1 });
  });
  it('is saved in details', async () => {
    const { parcheesiResults } = await import('./scoring');
    const r = parcheesiResults([{ matchPlayerId: 'm', playerId: 'a' }, { matchPlayerId: 'n', playerId: 'b' }], [td('a', 2), ...step('b', 1, 4)]);
    expect(r[0]!.details).toEqual({ pawnsHome: 0, tripleDoublets: 2 });
  });
});
