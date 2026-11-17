import { PALETTE } from '../domain/colors';
import type { GameDefinition, GameKey } from '../domain/types';

/** Games are defined in code (intent: no in-app game builder). */
export const GAMES: GameDefinition[] = [
  {
    key: 'flip7',
    name: 'Flip 7',
    tagline: 'Rounds to 200',
    template: 'rounds',
    minPlayers: 2,
    maxPlayers: null,
    defaultTarget: 200,
    pieceColors: PALETTE,
    tieBreakers: ['marginPastTarget', 'total', 'playAnotherRound'],
    available: false,
  },
  {
    key: 'dutchBlitz',
    name: 'Dutch Blitz',
    tagline: 'Rounds to 75',
    template: 'rounds',
    minPlayers: 2,
    maxPlayers: 8,
    defaultTarget: 75,
    pieceColors: PALETTE,
    tieBreakers: ['marginPastTarget', 'total'],
    available: true,
  },
  {
    key: 'ticketToRide',
    name: 'Ticket to Ride',
    tagline: 'Turn tracker',
    template: 'ticketToRide',
    minPlayers: 2,
    maxPlayers: 5,
    defaultTarget: null,
    pieceColors: ['red', 'blue', 'green', 'gold', 'black'],
    tieBreakers: ['total', 'ticketsCompleted', 'longestPath'],
    available: false,
  },
  {
    key: 'parcheesi',
    name: 'Parcheesi',
    tagline: 'Finishing order',
    template: 'placement',
    minPlayers: 2,
    maxPlayers: 4,
    defaultTarget: null,
    pieceColors: ['red', 'blue', 'green', 'gold'],
    tieBreakers: [],
    available: true,
  },
  {
    key: 'monopoly',
    name: 'Monopoly',
    tagline: 'Last one standing',
    template: 'placement',
    minPlayers: 2,
    maxPlayers: 8,
    defaultTarget: null,
    pieceColors: PALETTE,
    tieBreakers: [],
    available: true,
  },
];

export function getGame(key: string): GameDefinition | undefined {
  return GAMES.find((x) => x.key === key);
}

export function requireGame(key: GameKey): GameDefinition {
  const g = getGame(key);
  if (!g) throw new Error(`Unknown game ${key}`);
  return g;
}

/**
 * Player limits (FR-3 AC-1, A-12). The normal range applies unless
 * overridden; the override can never pass the colors available, since two
 * players can't share a color (FR-4 AC-3).
 */
export function playerLimits(game: GameDefinition, override: boolean): { min: number; max: number } {
  const colorCap = game.pieceColors.length;
  if (override) return { min: 1, max: colorCap };
  return { min: game.minPlayers, max: Math.min(game.maxPlayers ?? colorCap, colorCap) };
}

/** "2–4 players", "2+ players". */
export function rangeLabel(game: GameDefinition): string {
  return game.maxPlayers === null ? `${game.minPlayers}+ players` : `${game.minPlayers}–${game.maxPlayers} players`;
}
