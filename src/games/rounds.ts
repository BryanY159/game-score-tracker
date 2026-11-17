import type { MatchEvent, Round } from '../domain/types';
import { rankTargetGame, type TargetRanking, type TieDecision } from '../domain/targets';

export interface TargetSeat {
  playerId: string;
  target: number;
}

/** Totals from confirmed rounds. */
export function roundTotals(playerIds: string[], rounds: Round[]): Record<string, number> {
  const t = Object.fromEntries(playerIds.map((id) => [id, 0]));
  for (const r of rounds) if (r.confirmed) for (const e of r.entries) if (e.playerId in t) t[e.playerId]! += e.score;
  return t;
}

/** The tie decision that still applies: made after the same number of confirmed rounds. */
export function currentTieDecision(log: MatchEvent[], rounds: number): TieDecision | null {
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i]!;
    if (e.type === 'tieDecision') return e.rounds === rounds ? e.decision : null;
  }
  return null;
}

/** "Play another round" was chosen after exactly this many confirmed rounds (FR-11 AC-4). */
export function extraRoundAfter(log: MatchEvent[], rounds: number): boolean {
  return log.some((e) => e.type === 'extraRound' && e.afterRounds === rounds);
}

export interface RoundsResult {
  /** The game is over: a target was reached, and no extra round is under way. */
  over: boolean;
  /** "Play another round" was chosen and that round isn't confirmed yet. */
  extraRound: boolean;
  totals: Record<string, number>;
  ranking: TargetRanking;
  confirmed: number;
}

/**
 * Target games (FR-8 AC-4, FR-9 AC-3, FR-11): the game ends after a round in
 * which anyone reaches their own target. A tie that remains needs a decision,
 * or for Flip 7 everyone plays another round (FR-11 AC-4): it adds to the
 * running totals, with the same targets, and the winner is decided again.
 */
export function roundsResult(seats: TargetSeat[], rounds: Round[], log: MatchEvent[]): RoundsResult {
  const confirmed = rounds.filter((r) => r.confirmed);
  const totals = roundTotals(
    seats.map((s) => s.playerId),
    confirmed,
  );
  const reached = confirmed.length > 0 && seats.some((s) => (totals[s.playerId] ?? 0) >= s.target);
  const extraRound = reached && extraRoundAfter(log, confirmed.length);
  const ranking = rankTargetGame(
    seats.map((s) => ({ playerId: s.playerId, total: totals[s.playerId] ?? 0, target: s.target })),
    currentTieDecision(log, confirmed.length),
  );
  return { over: reached && !extraRound, extraRound, totals, ranking, confirmed: confirmed.length };
}
