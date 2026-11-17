import { describe, expect, it } from 'vitest';
import { rankTargetGame, signed } from './targets';

const p = (playerId: string, total: number, target = 75) => ({ playerId, total, target });

describe('target-game winner (FR-11 AC-1)', () => {
  it('largest margin past their own target wins, not the highest total', () => {
    // Alex 262 to a 250 handicap (+12) loses to Jordan 227 to 200 (+27): the mockup's example.
    const r = rankTargetGame([p('alex', 262, 250), p('jordan', 227, 200), p('sam', 205, 200), p('riley', 181, 200)]);
    expect(r.rows.map((x) => [x.playerId, x.margin, x.place, x.isWinner])).toEqual([
      ['jordan', 27, 1, true],
      ['alex', 12, 2, false],
      ['sam', 5, 3, false],
      ['riley', -19, 4, false],
    ]);
    expect(r.unresolvedTie).toEqual([]);
  });

  it('a margin tie goes to the higher total', () => {
    const r = rankTargetGame([p('a', 85, 75), p('b', 100, 90)]);
    expect(r.rows.map((x) => [x.playerId, x.place, x.isWinner])).toEqual([
      ['b', 1, true],
      ['a', 2, false],
    ]);
  });

  it('a full tie stays unresolved until decided (AC-3)', () => {
    const r = rankTargetGame([p('a', 80), p('b', 80), p('c', 60)]);
    expect(r.unresolvedTie).toEqual(['a', 'b']);
    expect(r.rows.every((x) => !x.isWinner)).toBe(true);
  });

  it('a shared win puts the tied players in 1st', () => {
    const r = rankTargetGame([p('a', 80), p('b', 80), p('c', 60)], { kind: 'shared', playerIds: ['b', 'a'] });
    expect(r.rows.map((x) => [x.playerId, x.place, x.isWinner])).toEqual([
      ['a', 1, true],
      ['b', 1, true],
      ['c', 3, false],
    ]);
  });

  it('a picked winner is 1st, the other tied player 2nd', () => {
    const r = rankTargetGame([p('a', 80), p('b', 80), p('c', 60)], { kind: 'picked', winnerId: 'b' });
    expect(r.rows.map((x) => [x.playerId, x.place, x.isWinner])).toEqual([
      ['b', 1, true],
      ['a', 2, false],
      ['c', 3, false],
    ]);
  });

  it('ignores a decision that no longer matches the tie', () => {
    const r = rankTargetGame([p('a', 80), p('b', 81)], { kind: 'shared', playerIds: ['a', 'b'] });
    expect(r.rows.map((x) => [x.playerId, x.isWinner])).toEqual([
      ['b', true],
      ['a', false],
    ]);
  });

  it('lower exact ties share a place', () => {
    const r = rankTargetGame([p('a', 90), p('b', 60), p('c', 60)]);
    expect(r.rows.map((x) => x.place)).toEqual([1, 2, 2]);
  });

  it('formats signed margins', () => {
    expect([signed(27), signed(0), signed(-19)]).toEqual(['+27', '+0', '−19']);
  });
});
