import { describe, expect, it } from 'vitest';
import { GAMES, playerLimits, rangeLabel, requireGame } from './registry';

describe('game registry (FR-3 AC-1)', () => {
  it('has the five games with their spec ranges and targets', () => {
    const byKey = Object.fromEntries(GAMES.map((g) => [g.key, g]));
    expect(byKey.parcheesi).toMatchObject({ minPlayers: 2, maxPlayers: 4, defaultTarget: null, template: 'placement' });
    expect(byKey.ticketToRide).toMatchObject({ minPlayers: 2, maxPlayers: 5, template: 'ticketToRide' });
    expect(byKey.monopoly).toMatchObject({ minPlayers: 2, maxPlayers: 8, template: 'placement' });
    expect(byKey.dutchBlitz).toMatchObject({ minPlayers: 2, maxPlayers: 8, defaultTarget: 75, template: 'rounds' });
    expect(byKey.flip7).toMatchObject({ minPlayers: 2, maxPlayers: null, defaultTarget: 200, template: 'rounds' });
  });

  it('uses pawn and train colors where the spec says (FR-4 AC-2)', () => {
    expect(requireGame('parcheesi').pieceColors).toEqual(['red', 'blue', 'green', 'gold']);
    expect(requireGame('ticketToRide').pieceColors).toEqual(['red', 'blue', 'green', 'gold', 'black']);
    expect(requireGame('flip7').pieceColors).toHaveLength(8);
  });

  it('enforces the range, and caps the override at the colors available (A-12)', () => {
    expect(playerLimits(requireGame('parcheesi'), false)).toEqual({ min: 2, max: 4 });
    expect(playerLimits(requireGame('parcheesi'), true)).toEqual({ min: 1, max: 4 });
    expect(playerLimits(requireGame('ticketToRide'), true)).toEqual({ min: 1, max: 5 });
    expect(playerLimits(requireGame('flip7'), false)).toEqual({ min: 2, max: 8 });
    expect(playerLimits(requireGame('monopoly'), true)).toEqual({ min: 1, max: 8 });
  });

  it('labels ranges', () => {
    expect(rangeLabel(requireGame('parcheesi'))).toBe('2–4 players');
    expect(rangeLabel(requireGame('flip7'))).toBe('2+ players');
  });
});
