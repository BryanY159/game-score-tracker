import type { RoundEntry } from '../../domain/types';

/** FR-8: number cards 0–12, modifiers +2…+10 and ×2. Action cards are left out (owner decision). */
export const NUMBER_CARDS = Array.from({ length: 13 }, (_, i) => i);
export const MODIFIERS = [2, 4, 6, 8, 10] as const;
export const FLIP7_BONUS = 15;
export const FLIP7_UNIQUE = 7;

export type Flip7Raw =
  | { mode: 'number'; value: number | null; bust: boolean; flip7: boolean }
  | { mode: 'cards'; cards: number[]; mods: number[]; x2: boolean; bust: boolean };

export type EntryMode = Flip7Raw['mode'];

export function blankRaw(mode: EntryMode): Flip7Raw {
  return mode === 'number' ? { mode, value: null, bust: false, flip7: false } : { mode, cards: [], mods: [], x2: false, bust: false };
}

/** Whether the player has entered anything this round. */
export function isEntered(raw: Flip7Raw): boolean {
  return raw.bust || (raw.mode === 'number' ? raw.value !== null : raw.cards.length > 0 || raw.mods.length > 0);
}

/** 7 different number cards (FR-8 AC-2): detected automatically in Cards mode. */
export function hasFlip7(raw: Flip7Raw): boolean {
  if (raw.bust) return false;
  return raw.mode === 'number' ? raw.flip7 : new Set(raw.cards).size >= FLIP7_UNIQUE;
}

/**
 * Round score.
 * Number mode (AC-1): the typed score, 0 on Bust, +15 with Flip 7!.
 * Cards mode (AC-2): number cards (doubled by ×2, which doubles number cards only: spec C-7)
 * + modifiers + 15 for 7 different numbers. Bust scores 0.
 */
export function flip7Score(raw: Flip7Raw): number {
  if (raw.bust) return 0;
  if (raw.mode === 'number') return (raw.value ?? 0) + (raw.flip7 ? FLIP7_BONUS : 0);
  const numbers = raw.cards.reduce((a, b) => a + b, 0) * (raw.x2 ? 2 : 1);
  const mods = raw.mods.reduce((a, b) => a + b, 0);
  return numbers + mods + (hasFlip7(raw) ? FLIP7_BONUS : 0);
}

export type CardTap = { kind: 'added'; raw: Flip7Raw } | { kind: 'duplicate' } | { kind: 'full' };

/** Tapping a number card: once each; a duplicate asks "Bust?" (AC-2). */
export function tapNumber(raw: Extract<Flip7Raw, { mode: 'cards' }>, n: number): CardTap {
  if (raw.bust) return { kind: 'full' };
  if (raw.cards.includes(n)) return { kind: 'duplicate' };
  if (new Set(raw.cards).size >= FLIP7_UNIQUE) return { kind: 'full' }; // a Flip 7 ends the player's turn
  return { kind: 'added', raw: { ...raw, cards: [...raw.cards, n] } };
}

export function toggleMod(raw: Extract<Flip7Raw, { mode: 'cards' }>, m: number): Flip7Raw {
  return { ...raw, mods: raw.mods.includes(m) ? raw.mods.filter((x) => x !== m) : [...raw.mods, m] };
}

export function flip7Entry(playerId: string, raw: Flip7Raw): RoundEntry {
  const flags: string[] = [];
  if (raw.bust) flags.push('bust');
  if (hasFlip7(raw)) flags.push('flip7');
  return { playerId, score: flip7Score(raw), raw: raw as unknown as Record<string, unknown>, flags };
}

export function rawOf(e: RoundEntry | undefined, mode: EntryMode): Flip7Raw {
  const r = e?.raw as Flip7Raw | undefined;
  return r && (r.mode === 'number' || r.mode === 'cards') ? r : blankRaw(mode);
}

/** FR-5 AC-5 / FR-8 AC-3: the dealer rotates every round, starting with the first seat. */
export function dealerFor(roundNumber: number, seatIds: string[]): string {
  return seatIds[(roundNumber - 1) % seatIds.length]!;
}
