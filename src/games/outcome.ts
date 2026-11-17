import type { MatchBundle, Seat, SeatResult } from '../db/repos/matches';
import type { MatchEvent } from '../domain/types';
import { completedAt, parcheesiResults, parcheesiState } from './parcheesi/scoring';
import { formatMoney, monopolyResults, monopolyState } from './monopoly/scoring';

export interface OutcomeRow {
  seat: Seat;
  place: number;
  isWinner: boolean;
  /** Main per-player value, e.g. "4 home", "3,400". */
  value: string;
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
}

export function outcomeFor(b: MatchBundle, log: MatchEvent[] = b.match.log): Outcome {
  const ids = b.seats.map((s) => ({ matchPlayerId: s.mp.id, playerId: s.player.id }));
  const seatOf = (playerId: string) => b.seats.find((s) => s.player.id === playerId)!;

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
