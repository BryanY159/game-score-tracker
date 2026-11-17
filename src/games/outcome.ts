import type { MatchBundle, Seat, SeatResult } from '../db/repos/matches';
import type { MatchEvent } from '../domain/types';
import { completedAt, parcheesiResults, parcheesiState } from './parcheesi/scoring';
import { formatMoney, monopolyResults, monopolyState } from './monopoly/scoring';
import { reachedTarget, totals } from './dutchBlitz/scoring';
import { rankTargetGame, signed, type TieDecision } from '../domain/targets';
import { requireGame } from './registry';

export interface OutcomeRow {
  seat: Seat;
  place: number;
  isWinner: boolean;
  /** Main per-player value, e.g. "4 home", "3,400". */
  value: string;
  /** Second line in target games, e.g. "+12 · to 250". */
  detail?: string;
}

/** A game's result, computed from its entries: shared by Results, editing and history. */
export interface Outcome {
  complete: boolean;
  endedAt: number | null;
  endedEarly: boolean;
  rows: OutcomeRow[];
  /** Line under "X wins". */
  subtitle: string;
  results: SeatResult[];
  /** Players still tied for first with no decision yet (FR-11 AC-3); Finalize waits for one. */
  tie: Seat[];
  /** Confirmed rounds (rounds games). */
  roundCount: number;
}

/** The tie decision that still applies: made after the same number of confirmed rounds. */
export function currentTieDecision(log: MatchEvent[], rounds: number): TieDecision | null {
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i]!;
    if (e.type === 'tieDecision') return e.rounds === rounds ? e.decision : null;
  }
  return null;
}

export function outcomeFor(b: MatchBundle, log: MatchEvent[] = b.match.log, rounds = b.rounds): Outcome {
  const ids = b.seats.map((s) => ({ matchPlayerId: s.mp.id, playerId: s.player.id }));
  const seatOf = (playerId: string) => b.seats.find((s) => s.player.id === playerId)!;

  if (requireGame(b.match.gameKey).template === 'rounds') {
    const game = requireGame(b.match.gameKey);
    const confirmed = rounds.filter((r) => r.confirmed);
    const tot = totals(
      b.seats.map((s) => s.player.id),
      confirmed,
    );
    const targets = Object.fromEntries(b.seats.map((s) => [s.player.id, s.mp.target ?? game.defaultTarget ?? 0]));
    const over = confirmed.length > 0 && reachedTarget(tot, targets);
    const ranking = rankTargetGame(
      b.seats.map((s) => ({ playerId: s.player.id, total: tot[s.player.id] ?? 0, target: targets[s.player.id]! })),
      currentTieDecision(log, confirmed.length),
    );
    const rows = ranking.rows.map((r) => ({
      seat: seatOf(r.playerId),
      place: r.place,
      isWinner: r.isWinner,
      value: String(r.total),
      detail: `${signed(r.margin)} · to ${r.target}`,
    }));
    const winners = ranking.rows.filter((r) => r.isWinner);
    const lead = winners[0] ?? ranking.rows[0];
    const last = confirmed[confirmed.length - 1];
    return {
      complete: over,
      endedAt: over && last ? last.updatedAt : null,
      endedEarly: false,
      subtitle: lead ? `${signed(lead.margin)} past target · ${lead.total} points` : '',
      rows,
      tie: over ? ranking.unresolvedTie.map(seatOf) : [],
      roundCount: confirmed.length,
      results: ranking.rows.map((r) => ({
        matchPlayerId: seatOf(r.playerId).mp.id,
        placement: r.place,
        finalScore: r.total,
        marginPastTarget: r.margin,
        isWinner: r.isWinner,
        details: {},
      })),
    };
  }

  if (b.match.gameKey === 'monopoly') {
    const st = monopolyState(
      b.seats.map((s) => s.player.id),
      log,
    );
    return {
      complete: st.complete,
      endedAt: st.endedAt,
      endedEarly: st.endedEarly,
      subtitle: st.endedEarly ? 'Ended early · highest net worth' : 'Last one standing',
      rows: rank(
        st.players.map((p) => ({
          seat: seatOf(p.playerId),
          place: p.placement ?? 99,
          isWinner: p.isWinner,
          value: p.netWorth !== null ? formatMoney(p.netWorth) : p.bankruptAt !== null ? 'Bankrupt' : 'Last standing',
        })),
      ),
      results: monopolyResults(ids, log),
      tie: [],
      roundCount: 0,
    };
  }

  const st = parcheesiState(
    b.seats.map((s) => s.player.id),
    log,
  );
  return {
    complete: st.complete,
    endedAt: st.complete ? completedAt(log) : null,
    endedEarly: false,
    subtitle: 'First with all 4 pawns home',
    rows: rank(
      st.players.map((p) => ({
        seat: seatOf(p.playerId),
        place: p.placement ?? 99,
        isWinner: p.placement === 1,
        value: `${p.pawnsHome} home`,
      })),
    ),
    results: parcheesiResults(ids, log),
    tie: [],
    roundCount: 0,
  };
}

function rank(rows: OutcomeRow[]): OutcomeRow[] {
  return rows.sort((a, b) => a.place - b.place || a.seat.mp.seatOrder - b.seat.mp.seatOrder);
}

/** "Riley wins", or "Shared win" (names go on the next line, so the title never truncates). */
export function headline(o: Outcome): string {
  const winners = o.rows.filter((r) => r.isWinner).map((r) => r.seat.player.name);
  return winners.length === 1 ? `${winners[0]} wins` : 'Shared win';
}

/** "Alex and Jordan" for a shared win, else null. */
export function sharedNames(o: Outcome): string | null {
  const winners = o.rows.filter((r) => r.isWinner).map((r) => r.seat.player.name);
  if (winners.length < 2) return null;
  return `${winners.slice(0, -1).join(', ')} and ${winners[winners.length - 1]}`;
}
