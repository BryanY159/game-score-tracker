import type { MatchEvent } from '../../domain/types';

export const PAWNS = 4;

export interface ParcheesiPlayerState {
  playerId: string;
  pawnsHome: number;
  tripleDoublets: number;
  /** Finishing place, or null while still playing. */
  placement: number | null;
}

export interface ParcheesiState {
  players: ParcheesiPlayerState[];
  /** Everyone has a place: the game is over (FR-6 AC-3). */
  complete: boolean;
}

/**
 * Replays the log (FR-6). Reaching 4 pawns home gives the next place (AC-2).
 * When one player is left, they're placed last automatically (AC-3).
 * Steps outside 0–4, or on a placed player, are ignored.
 */
export function parcheesiState(seats: string[], log: MatchEvent[]): ParcheesiState {
  const players = new Map(seats.map((id) => [id, { playerId: id, pawnsHome: 0, tripleDoublets: 0, placement: null as number | null }]));
  let nextPlace = 1;

  for (const e of log) {
    if (e.type === 'tripleDoublets') {
      const p = players.get(e.playerId);
      if (p) p.tripleDoublets = Math.max(0, p.tripleDoublets + e.delta);
      continue;
    }
    if (e.type !== 'pawns') continue;
    const p = players.get(e.playerId);
    if (!p || p.placement !== null) continue;
    const pawns = p.pawnsHome + e.delta;
    if (pawns < 0 || pawns > PAWNS) continue;
    p.pawnsHome = pawns;
    if (pawns === PAWNS) p.placement = nextPlace++;
  }

  const unplaced = [...players.values()].filter((p) => p.placement === null);
  if (seats.length > 1 && unplaced.length === 1) unplaced[0]!.placement = nextPlace;

  const list = seats.map((id) => players.get(id)!);
  return { players: list, complete: list.every((p) => p.placement !== null) };
}

/** Whether a step would change anything (to enable or disable stepper buttons). */
export function canStep(state: ParcheesiState, playerId: string, delta: 1 | -1): boolean {
  if (state.complete) return false;
  const p = state.players.find((x) => x.playerId === playerId);
  if (!p || p.placement !== null) return false;
  const next = p.pawnsHome + delta;
  return next >= 0 && next <= PAWNS;
}

/**
 * When the finishing order was settled: the time of the entry that completed it.
 * Game length runs to here, not to when Finalize was tapped (FR-6 AC-4).
 */
export function completedAt(log: MatchEvent[]): number | null {
  return log.length ? log[log.length - 1]!.at : null;
}

/** Seat outcomes to save (FR-6 AC-4): place, pawns home, winner. */
export function parcheesiResults(
  seats: { matchPlayerId: string; playerId: string }[],
  log: MatchEvent[],
): {
  matchPlayerId: string;
  placement: number | null;
  finalScore: null;
  marginPastTarget: null;
  isWinner: boolean;
  details: { pawnsHome: number; tripleDoublets: number };
}[] {
  const state = parcheesiState(
    seats.map((s) => s.playerId),
    log,
  );
  return seats.map((s) => {
    const p = state.players.find((x) => x.playerId === s.playerId)!;
    return {
      matchPlayerId: s.matchPlayerId,
      placement: p.placement,
      finalScore: null,
      marginPastTarget: null,
      isWinner: p.placement === 1,
      details: { pawnsHome: p.pawnsHome, tripleDoublets: p.tripleDoublets },
    };
  });
}
