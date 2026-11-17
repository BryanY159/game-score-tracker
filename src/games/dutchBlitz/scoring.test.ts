import { describe, expect, it } from 'vitest';
import { blitzEntry, blitzRoundScore, clampInput, reachedTarget, totals } from './scoring';
import type { Round } from '../../domain/types';

const round = (n: number, entries: Round['entries'], confirmed = true) =>
  ({ id: `r${n}`, number: n, matchId: 'm', dealerPlayerId: null, entries, confirmed, createdAt: 0, updatedAt: 0, deletedAt: null }) as Round;

describe('Dutch Blitz (FR-9)', () => {
  it('scores Dutch +1 and Blitz −2 (AC-1)', () => {
    expect(blitzRoundScore({ dutch: 12, blitz: 2 })).toBe(8);
    expect(blitzRoundScore({ dutch: 6, blitz: 5 })).toBe(-4);
    expect(blitzRoundScore({ dutch: 0, blitz: 0 })).toBe(0);
  });

  it('flags the player who blitzed', () => {
    expect(blitzEntry('a', { dutch: 14, blitz: 0 })).toEqual({ playerId: 'a', score: 14, raw: { dutch: 14, blitz: 0 }, flags: ['blitz'] });
    expect(blitzEntry('a', { dutch: 3, blitz: 1 }).flags).toEqual([]);
  });

  it('keeps inputs in range', () => {
    expect(clampInput({ dutch: 99, blitz: -3 })).toEqual({ dutch: 40, blitz: 0 });
    expect(clampInput({ dutch: Number.NaN, blitz: 12 })).toEqual({ dutch: 0, blitz: 10 });
  });

  it('totals only confirmed rounds (AC-2)', () => {
    const rounds = [
      round(1, [blitzEntry('a', { dutch: 10, blitz: 0 }), blitzEntry('b', { dutch: 4, blitz: 3 })]),
      round(2, [blitzEntry('a', { dutch: 5, blitz: 1 })], false),
    ];
    expect(totals(['a', 'b'], rounds)).toEqual({ a: 10, b: -2 });
  });

  it('ends after a round in which anyone reaches their own target (AC-3)', () => {
    expect(reachedTarget({ a: 74, b: 80 }, { a: 75, b: 90 })).toBe(false);
    expect(reachedTarget({ a: 75, b: 10 }, { a: 75, b: 90 })).toBe(true);
  });
});
