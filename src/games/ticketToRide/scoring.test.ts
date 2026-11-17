import { describe, expect, it } from 'vitest';
import { allowedRouteLengths, canClaim, rankTtr, ttrState, ttrTotal, type TtrFinal } from './scoring';
import type { TurnLogEntry } from '../../domain/types';

const seats = ['a', 'b', 'c'];
const route = (playerId: string, routeLength: number): TurnLogEntry => ({ playerId, action: 'route', routeLength });
const draw = (playerId: string): TurnLogEntry => ({ playerId, action: 'drawTrains' });

/** Turns in seat order: each item is one turn for the next player. */
function turns(...actions: (number | 'd')[]): TurnLogEntry[] {
  return actions.map((a, i) => (a === 'd' ? draw(seats[i % 3]!) : route(seats[i % 3]!, a)));
}

describe('Ticket to Ride turns (FR-7)', () => {
  it('routes add points 1, 2, 4, 7, 10, 15 and subtract trains (AC-1 to AC-3)', () => {
    const s = ttrState(seats, turns(1, 2, 3, 4, 5, 6));
    expect(s.players.map((p) => [p.routePoints, p.trains])).toEqual([
      [1 + 7, 45 - 5],
      [2 + 10, 45 - 7],
      [4 + 15, 45 - 9],
    ]);
  });

  it('moves to the next player after each turn (AC-2)', () => {
    expect(ttrState(seats, turns('d', 'd')).current).toBe('c');
    expect(ttrState(seats, turns('d', 'd', 'd')).current).toBe('a');
  });

  it("can't claim a route longer than the trains left (A-10)", () => {
    // a: 6×7 = 42 trains used → 3 left.
    const many = Array.from({ length: 7 }, () => [6, 'd', 'd'] as (number | 'd')[]).flat();
    const s = ttrState(seats, turns(...many));
    expect(s.players[0]!.trains).toBe(3);
    expect(canClaim(s, 'a', 3)).toBe(true);
    expect(canClaim(s, 'a', 4)).toBe(false);
  });

  it('final round: ≤ 2 trains after a turn gives everyone, the trigger included, exactly one more turn (AC-5)', () => {
    // a reaches 2 trains on turn index 21 (8th turn of a: 7×6 + 1 = 43 used).
    const base = Array.from({ length: 7 }, () => [6, 'd', 'd'] as (number | 'd')[]).flat();
    let s = ttrState(seats, turns(...base, 1));
    expect(s.finalRound).toMatchObject({ triggeredBy: 'a', atTurn: 21, turnsLeft: 3 });
    expect(s.playComplete).toBe(false);
    s = ttrState(seats, turns(...base, 1, 'd', 'd'));
    expect(s.finalRound!.turnsLeft).toBe(1);
    expect(s.current).toBe('a'); // the trigger player's own last turn
    s = ttrState(seats, turns(...base, 1, 'd', 'd', 'd'));
    expect(s.playComplete).toBe(true);
  });

  it('editing a logged turn works the final round out again (A-10)', () => {
    const base = Array.from({ length: 7 }, () => [6, 'd', 'd'] as (number | 'd')[]).flat();
    const log = turns(...base, 1);
    expect(ttrState(seats, log).finalRound).not.toBeNull();
    const edited = log.map((e, i) => (i === 0 ? draw('a') : e)); // a's first 6-route was really a draw
    expect(ttrState(seats, edited).finalRound).toBeNull();
  });

  it('only offers edits that keep trains at 0 or more', () => {
    const base = Array.from({ length: 7 }, () => [6, 'd', 'd'] as (number | 'd')[]).flat();
    const log = turns(...base, 'd'); // a has 3 left
    expect(allowedRouteLengths(seats, log, 21)).toEqual([1, 2, 3]);
  });
});

const final = (routePoints: number, tickets: [number, boolean][] = [], longestPath = false): TtrFinal => ({
  routePoints,
  tickets: tickets.map(([value, completed]) => ({ value, completed })),
  longestPath,
});

describe('Ticket to Ride scoring (FR-7 AC-6, AC-7; FR-11 AC-2)', () => {
  it('adds completed tickets, subtracts failed ones, +10 for the longest path', () => {
    expect(ttrTotal(final(78, [[13, true], [20, true], [8, false]], true))).toBe(113);
  });

  it('a tie on total goes to the most completed tickets', () => {
    const r = rankTtr([
      { playerId: 'a', final: final(100, [[10, true]]) },
      { playerId: 'b', final: final(90, [[10, true], [10, true]]) },
    ]);
    expect(r.rows.map((x) => [x.playerId, x.total, x.place, x.isWinner])).toEqual([
      ['b', 110, 1, true],
      ['a', 110, 2, false],
    ]);
  });

  it('then to the longest-path holder', () => {
    const r = rankTtr([
      { playerId: 'a', final: final(100, [[10, true]]) },
      { playerId: 'b', final: final(90, [[10, true]], true) },
    ]);
    expect(r.rows[0]).toMatchObject({ playerId: 'b', isWinner: true });
  });

  it('both holding the longest path still tie: the tie screen decides (AC-7, FR-11 AC-3)', () => {
    const tied = [
      { playerId: 'a', final: final(90, [[10, true]], true) },
      { playerId: 'b', final: final(90, [[10, true]], true) },
    ];
    expect(rankTtr(tied).unresolvedTie).toEqual(['a', 'b']);
    expect(rankTtr(tied, { kind: 'picked', winnerId: 'b' }).rows.map((x) => [x.playerId, x.place])).toEqual([
      ['b', 1],
      ['a', 2],
    ]);
    expect(rankTtr(tied, { kind: 'shared', playerIds: ['a', 'b'] }).rows.every((x) => x.isWinner)).toBe(true);
  });
});
