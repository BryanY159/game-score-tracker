import { describe, expect, it } from 'vitest';
import { formatMoney, monopolyResults, monopolyState, rankByNetWorth, topTie } from './scoring';
import type { MatchEvent } from '../../domain/types';

const seats = ['a', 'b', 'c', 'd'];
const bankrupt = (playerId: string, at = 1): MatchEvent => ({ type: 'bankrupt', playerId, at });
const endEarly = (netWorth: Record<string, number>, order: string[], tie: Extract<MatchEvent, { type: 'endEarly' }>['tie'] = null, at = 99): MatchEvent => ({
  type: 'endEarly', netWorth, order, tie, at,
});

describe('Monopoly (FR-10)', () => {
  it('records bankruptcies from last place up, with the time (AC-1)', () => {
    const s = monopolyState(seats, [bankrupt('c', 10), bankrupt('a', 20)]);
    expect(s.players.find((p) => p.playerId === 'c')).toMatchObject({ placement: 4, bankruptAt: 10 });
    expect(s.players.find((p) => p.playerId === 'a')).toMatchObject({ placement: 3, bankruptAt: 20 });
    expect(s.remaining).toEqual(['b', 'd']);
    expect(s.complete).toBe(false);
  });

  it('the last player left wins and the game ends (AC-2)', () => {
    const s = monopolyState(seats, [bankrupt('c', 10), bankrupt('a', 20), bankrupt('d', 30)]);
    expect(s.players.map((p) => [p.placement, p.isWinner])).toEqual([[3, false], [1, true], [4, false], [2, false]]);
    expect(s).toMatchObject({ complete: true, endedEarly: false, endedAt: 30 });
  });

  it('ignores a second bankruptcy for the same player, and anything after the end', () => {
    const s = monopolyState(['a', 'b'], [bankrupt('a', 1), bankrupt('a', 2), bankrupt('b', 3)]);
    expect(s.players.map((p) => p.placement)).toEqual([2, 1]);
  });

  it('ending early ranks remaining players by net worth above the bankrupt ones (AC-3)', () => {
    const nw = { a: 1200, b: 3400, d: 800 };
    const order = rankByNetWorth(['a', 'b', 'd'], nw);
    expect(order).toEqual(['b', 'a', 'd']);
    const s = monopolyState(seats, [bankrupt('c'), endEarly(nw, order)]);
    expect(s.players.map((p) => [p.playerId, p.placement, p.netWorth, p.isWinner])).toEqual([
      ['a', 2, 1200, false],
      ['b', 1, 3400, true],
      ['c', 4, null, false],
      ['d', 3, 800, false],
    ]);
    expect(s).toMatchObject({ complete: true, endedEarly: true, endedAt: 99 });
  });

  it('keeps a manual reorder (dragged before finalizing)', () => {
    const s = monopolyState(seats, [endEarly({ a: 10, b: 20, c: 30, d: 40 }, ['a', 'd', 'c', 'b'])]);
    expect(s.players.map((p) => p.placement)).toEqual([1, 4, 3, 2]);
  });

  it('detects a tie for the top net worth (FR-11 AC-3)', () => {
    expect(topTie(['b', 'a', 'd'], { a: 3400, b: 3400, d: 1 })).toEqual(['b', 'a']);
    expect(topTie(['b', 'a'], { a: 1, b: 2 })).toEqual([]);
    expect(topTie(['a'], { a: 1 })).toEqual([]);
  });

  it('a shared win puts the tied players in 1st, both winners', () => {
    const nw = { a: 3400, b: 3400, d: 800 };
    const s = monopolyState(seats, [bankrupt('c'), endEarly(nw, ['a', 'b', 'd'], { kind: 'shared', playerIds: ['a', 'b'] })]);
    expect(s.players.map((p) => [p.playerId, p.placement, p.isWinner])).toEqual([
      ['a', 1, true],
      ['b', 1, true],
      ['c', 4, false],
      ['d', 3, false],
    ]);
  });

  it('a picked winner of an outside tie-breaker is first', () => {
    const nw = { a: 3400, b: 3400 };
    const s = monopolyState(['a', 'b'], [endEarly(nw, ['b', 'a'], { kind: 'picked', winnerId: 'b' })]);
    expect(s.players.map((p) => [p.placement, p.isWinner])).toEqual([[2, false], [1, true]]);
  });

  it('undo (dropping the last entry) reopens the game', () => {
    const log = [bankrupt('c'), bankrupt('a'), bankrupt('d')];
    expect(monopolyState(seats, log.slice(0, -1)).complete).toBe(false);
  });

  it('saves placements, net worth and bankruptcy times (AC-4)', () => {
    const res = monopolyResults(
      [
        { matchPlayerId: 'm1', playerId: 'a' },
        { matchPlayerId: 'm2', playerId: 'b' },
      ],
      [bankrupt('a', 5)],
    );
    expect(res).toEqual([
      { matchPlayerId: 'm1', placement: 2, finalScore: null, marginPastTarget: null, isWinner: false, details: { bankruptAt: 5 } },
      { matchPlayerId: 'm2', placement: 1, finalScore: null, marginPastTarget: null, isWinner: true, details: {} },
    ]);
    const early = monopolyResults([{ matchPlayerId: 'm1', playerId: 'a' }, { matchPlayerId: 'm2', playerId: 'b' }], [endEarly({ a: 5, b: 9 }, ['b', 'a'])]);
    expect(early.map((r) => [r.placement, r.finalScore, r.details])).toEqual([[2, 5, { netWorth: 5 }], [1, 9, { netWorth: 9 }]]);
  });

  it('formats money', () => {
    expect(formatMoney(1520)).toBe('1,520');
  });
});
