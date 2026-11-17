import { describe, expect, it } from 'vitest';
import { assignColor, assignColors, freeColors, PALETTE } from './colors';
import type { PlayerColor } from './types';

const PAWNS: PlayerColor[] = ['red', 'blue', 'green', 'gold'];

describe('player colors (FR-4)', () => {
  it('keeps the profile color when it is free (AC-1)', () => {
    expect(assignColor('teal', PALETTE, ['red'])).toBe('teal');
  });

  it('gives the next free palette color on a clash (AC-1)', () => {
    expect(assignColor('red', PALETTE, ['red'])).toBe('blue');
    expect(assignColor('orange', PALETTE, ['orange', 'red'])).toBe('blue');
  });

  it('maps profile colors onto pawn colors for Parcheesi (AC-2)', () => {
    expect(assignColor('purple', PAWNS, [])).toBe('red');
    expect(assignColor('gold', PAWNS, ['gold'])).toBe('red');
  });

  it('returns null when every color is taken', () => {
    expect(assignColor('red', PAWNS, PAWNS)).toBeNull();
  });

  it('only offers unused colors when changing (AC-1, AC-3)', () => {
    expect(freeColors(PAWNS, ['red', 'gold'])).toEqual(['blue', 'green']);
  });

  it('never gives two players the same color (AC-3), for random lineups', () => {
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let run = 0; run < 500; run++) {
      const allowed = rand() < 0.5 ? PAWNS : PALETTE;
      const n = 1 + Math.floor(rand() * allowed.length);
      const prefs = Array.from({ length: n }, () => PALETTE[Math.floor(rand() * PALETTE.length)]!);
      const out = assignColors(prefs, allowed);
      expect(out.every((c) => c !== null && allowed.includes(c))).toBe(true);
      expect(new Set(out).size).toBe(n);
    }
  });
});
