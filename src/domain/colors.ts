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
