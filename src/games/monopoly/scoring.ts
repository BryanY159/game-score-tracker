import type { MatchEvent } from '../../domain/types';

export interface MonopolyPlayerState {
  playerId: string;
  bankruptAt: number | null;
  netWorth: number | null;
  placement: number | null;
  isWinner: boolean;
}

export interface MonopolyState {
  players: MonopolyPlayerState[];
  /** Still playing, in turn order. */
  remaining: string[];
  complete: boolean;
  endedEarly: boolean;
  endedAt: number | null;
}

/**
 * FR-10. Bankruptcies fill places from the bottom (AC-1). When one player is
 * left they win (AC-2). Ending early ranks the remaining players by net worth
 * above everyone already bankrupt (AC-3), using the order saved in the entry.
 */
export function monopolyState(seats: string[], log: MatchEvent[]): MonopolyState {
  const players = new Map(
    seats.map((id) => [id, { playerId: id, bankruptAt: null, netWorth: null, placement: null, isWinner: false } as MonopolyPlayerState]),
  );
  let nextPlace = seats.length;
  let endedEarly = false;
  let endedAt: number | null = null;

  for (const e of log) {
    if (endedAt !== null) break; // nothing counts after the game is over
    if (e.type === 'bankrupt') {
      const p = players.get(e.playerId);
      if (!p || p.placement !== null) continue;
      p.bankruptAt = e.at;
      p.placement = nextPlace--;
      const left = [...players.values()].filter((x) => x.placement === null);
      if (left.length === 1 && seats.length > 1) {
        left[0]!.placement = 1;
        left[0]!.isWinner = true;
        endedAt = e.at;
      }
    } else if (e.type === 'endEarly') {
      const left = [...players.values()].filter((x) => x.placement === null);
      const order = e.order.filter((id) => left.some((x) => x.playerId === id));
      if (order.length !== left.length) continue; // stale entry; ignore
      const shared = e.tie?.kind === 'shared' ? new Set(e.tie.playerIds) : null;
      order.forEach((id, i) => {
        const p = players.get(id)!;
        p.netWorth = e.netWorth[id] ?? 0;
        // A shared win puts every tied player in 1st (FR-11 AC-3); later places skip ahead.
        p.placement = shared?.has(id) ? 1 : i + 1;
        p.isWinner = shared ? shared.has(id) : i === 0;
      });
      endedEarly = true;
      endedAt = e.at;
    }
  }

  const list = seats.map((id) => players.get(id)!);
  return {
    players: list,
    remaining: list.filter((p) => p.placement === null).map((p) => p.playerId),
    complete: endedAt !== null,
    endedEarly,
    endedAt,
  };
}

/** Remaining players by net worth, highest first; ties keep turn order. */
export function rankByNetWorth(remaining: string[], netWorth: Record<string, number>): string[] {
  return [...remaining].sort((a, b) => (netWorth[b] ?? 0) - (netWorth[a] ?? 0));
}

/** Players tied for the top net worth, if more than one (FR-11 AC-3). */
export function topTie(order: string[], netWorth: Record<string, number>): string[] {
  if (order.length < 2) return [];
  const top = netWorth[order[0]!] ?? 0;
  const tied = order.filter((id) => (netWorth[id] ?? 0) === top);
  return tied.length > 1 ? tied : [];
}

export function monopolyResults(
  seats: { matchPlayerId: string; playerId: string }[],
  log: MatchEvent[],
): {
  matchPlayerId: string;
  placement: number | null;
  finalScore: number | null;
  marginPastTarget: null;
  isWinner: boolean;
  details: { netWorth?: number; bankruptAt?: number };
}[] {
  const st = monopolyState(
    seats.map((s) => s.playerId),
    log,
  );
  return seats.map((s) => {
    const p = st.players.find((x) => x.playerId === s.playerId)!;
    const details: { netWorth?: number; bankruptAt?: number } = {};
    if (p.netWorth !== null) details.netWorth = p.netWorth;
    if (p.bankruptAt !== null) details.bankruptAt = p.bankruptAt;
    return {
      matchPlayerId: s.matchPlayerId,
      placement: p.placement,
      finalScore: p.netWorth,
      marginPastTarget: null,
      isWinner: p.isWinner,
      details,
    };
  });
}

/** 1520 → "1,520". */
export function formatMoney(n: number): string {
  return n.toLocaleString('en-US');
}
