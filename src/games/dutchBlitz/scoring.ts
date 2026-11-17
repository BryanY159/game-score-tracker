import type { Round, RoundEntry } from '../../domain/types';

export const DUTCH_MAX = 40;
export const BLITZ_MAX = 10;

export interface BlitzInput {
  dutch: number;
  blitz: number;
}

/** FR-9 AC-1: Dutch pile cards +1 each, Blitz pile cards left −2 each. */
export function blitzRoundScore({ dutch, blitz }: BlitzInput): number {
  return dutch - 2 * blitz;
}

export function blitzEntry(playerId: string, input: BlitzInput): RoundEntry {
  return {
    playerId,
    score: blitzRoundScore(input),
    raw: { dutch: input.dutch, blitz: input.blitz },
    // A player who emptied their Blitz pile ended the round ("Blitz!" in the mockup).
    flags: input.blitz === 0 && input.dutch > 0 ? ['blitz'] : [],
  };
}

export function blitzInput(e: RoundEntry | undefined): BlitzInput {
  return { dutch: Number(e?.raw.dutch ?? 0), blitz: Number(e?.raw.blitz ?? 0) };
}

export function clampInput(i: BlitzInput): BlitzInput {
  const c = (n: number, max: number) => Math.max(0, Math.min(max, Math.floor(Number.isFinite(n) ? n : 0)));
  return { dutch: c(i.dutch, DUTCH_MAX), blitz: c(i.blitz, BLITZ_MAX) };
}

/** Totals from confirmed rounds. */
export function totals(playerIds: string[], rounds: Round[]): Record<string, number> {
  const t = Object.fromEntries(playerIds.map((id) => [id, 0]));
  for (const r of rounds) if (r.confirmed) for (const e of r.entries) if (e.playerId in t) t[e.playerId]! += e.score;
  return t;
}

/** FR-9 AC-3 / FR-8 AC-4: the game ends after a round in which anyone reaches their target. */
export function reachedTarget(tot: Record<string, number>, targets: Record<string, number>): boolean {
  return Object.keys(targets).some((id) => (tot[id] ?? 0) >= targets[id]!);
}
