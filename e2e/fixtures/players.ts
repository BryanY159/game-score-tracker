import type { PaletteColor, Player } from '../../src/domain/types';

/** Synthetic players only. Never real user data (CLAUDE.md). */
const T = Date.UTC(2026, 10, 1);
let n = 0;
export function player(name: string, emoji: string, color: PaletteColor, extra: Partial<Player> = {}): Player {
  n += 1;
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    createdAt: T,
    updatedAt: T,
    deletedAt: null,
    name,
    emoji,
    color,
    hideFromStats: false,
    isGuest: false,
    ...extra,
  };
}

export const ALEX = player('Alex', '🦊', 'red');
export const SAM = player('Sam', '🐢', 'blue');
export const JORDAN = player('Jordan', '🌵', 'green');
export const RILEY = player('Riley', '🐙', 'gold');
export const CASEY = player('Casey', '🦉', 'purple');
export const MORGAN = player('Morgan', '🐳', 'teal', { hideFromStats: true });
export const CHRISTOPHER = player('Christopher Alexander', '🐻', 'pink');
export const DREW = player('Drew', '🐝', 'orange');

export const FOUR = [ALEX, SAM, JORDAN, RILEY];
export const EIGHT = [ALEX, SAM, JORDAN, RILEY, CASEY, MORGAN, CHRISTOPHER, DREW];
