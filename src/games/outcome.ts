import type { MatchBundle, Seat, SeatResult } from '../db/repos/matches';
import type { MatchEvent } from '../domain/types';
import { completedAt, parcheesiResults, parcheesiState } from './parcheesi/scoring';
import { formatMoney, monopolyResults, monopolyState } from './monopoly/scoring';
import { signed } from '../domain/targets';
import { roundsResult } from './rounds';
import { flip7Details } from './flip7/stats';
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
  /** Flip 7: "Play another round" chosen and that round not yet confirmed (FR-11 AC-4). */
  extraRound?: boolean;
}

export function outcomeFor(b: MatchBundle, log: MatchEvent[] = b.match.log, rounds = b.rounds): Outcome {
  const ids = b.seats.map((s) => ({ matchPlayerId: s.mp.id, playerId: s.player.id }));
  const seatOf = (playerId: string) => b.seats.find((s) => s.player.id === playerId)!;

  if (requireGame(b.match.gameKey).template === 'rounds') {
    const game = requireGame(b.match.gameKey);
    const targets = b.seats.map((s) => ({ playerId: s.player.id, target: s.mp.target ?? game.defaultTarget ?? 0 }));
    const res = roundsResult(targets, rounds, log);
    const confirmed = rounds.filter((r) => r.confirmed);
    const rows = res.ranking.rows.map((r) => ({
      seat: seatOf(r.playerId),
      place: r.place,
      isWinner: r.isWinner,
      value: String(r.total),
      detail: `${signed(r.margin)} · to ${r.target}`,
    }));
    const winners = res.ranking.rows.filter((r) => r.isWinner);
    const lead = winners[0] ?? res.ranking.rows[0];
    const last = confirmed[confirmed.length - 1];
    const flip7 = b.match.gameKey === 'flip7' ? flip7Details(targets, confirmed) : null;
    return {
      complete: res.over,
      endedAt: res.over && last ? last.updatedAt : null,
      endedEarly: false,
      subtitle: lead ? `${signed(lead.margin)} past target · ${lead.total} points` : '',
      rows,
      tie: res.over ? res.ranking.unresolvedTie.map(seatOf) : [],
      roundCount: res.confirmed,
      extraRound: res.extraRound,
      results: res.ranking.rows.map((r) => ({
        matchPlayerId: seatOf(r.playerId).mp.id,
        placement: r.place,
        finalScore: r.total,
        marginPastTarget: r.margin,
        isWinner: r.isWinner,
        details: flip7?.[r.playerId] ?? {},
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
