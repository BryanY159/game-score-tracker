import type { PaletteColor, PlayerColor } from './types';

/** Profile palette in assignment order (spec §6). */
export const PALETTE: PaletteColor[] = ['red', 'blue', 'green', 'gold', 'purple', 'pink', 'teal', 'orange'];

export const COLOR_HEX: Record<PlayerColor, string> = {
  red: '#C0392B',
  blue: '#1D4ED8',
  green: '#15803D',
  gold: '#EAB308',
  purple: '#6D28D9',
  pink: '#BE185D',
  teal: '#0F766E',
  orange: '#C2410C',
  black: '#1C1C1E',
};

export const COLOR_NAME: Record<PlayerColor, string> = {
  red: 'Red',
  blue: 'Blue',
  green: 'Green',
  gold: 'Gold',
  purple: 'Purple',
  pink: 'Pink',
  teal: 'Teal',
  orange: 'Orange',
  black: 'Black',
};

/**
 * FR-4: start from the preferred color (the profile color) if this game allows
 * it and nobody has it yet; otherwise the next free color in the game's order.
 */
export function assignColor(preferred: PlayerColor, allowed: PlayerColor[], taken: PlayerColor[]): PlayerColor | null {
  if (allowed.includes(preferred) && !taken.includes(preferred)) return preferred;
  const start = Math.max(0, allowed.indexOf(preferred));
  for (let i = 0; i < allowed.length; i++) {
    const c = allowed[(start + i) % allowed.length]!;
    if (!taken.includes(c)) return c;
  }
  return null;
}

/** Assign colors for a whole lineup in seat order, never duplicating (FR-4 AC-3). */
export function assignColors(preferred: PlayerColor[], allowed: PlayerColor[]): (PlayerColor | null)[] {
  const taken: PlayerColor[] = [];
  return preferred.map((p) => {
    const c = assignColor(p, allowed, taken);
    if (c) taken.push(c);
    return c;
  });
}

/** Colors a player could switch to: allowed and not used by anyone else. */
export function freeColors(allowed: PlayerColor[], taken: PlayerColor[]): PlayerColor[] {
  return allowed.filter((c) => !taken.includes(c));
}
