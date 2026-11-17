/**
 * FR-11 AC-1: in target games the winner has the largest margin past their own
 * target; a margin tie goes to the higher total. A tie that remains needs a
 * decision (AC-3): shared win or the winner of an outside tie-breaker.
 */
export interface TargetPlayer {
  playerId: string;
  total: number;
  target: number;
}

export type TieDecision = { kind: 'shared'; playerIds: string[] } | { kind: 'picked'; winnerId: string };

export interface TargetRanking {
  rows: { playerId: string; total: number; target: number; margin: number; place: number; isWinner: boolean }[];
  /** Players still tied for first when no decision covers them. */
  unresolvedTie: string[];
}

const better = (a: TargetPlayer, b: TargetPlayer) => b.total - b.target - (a.total - a.target) || b.total - a.total;

export function rankTargetGame(players: TargetPlayer[], decision: TieDecision | null = null): TargetRanking {
  const sorted = [...players].sort(better);
  const top = sorted[0];
  const tiedTop = top ? sorted.filter((p) => better(p, top) === 0).map((p) => p.playerId) : [];
  let unresolvedTie: string[] = [];
  let order = sorted;
  let sharedFirst = new Set<string>();

  if (tiedTop.length > 1) {
    const covers = decision && (decision.kind === 'shared' ? sameSet(decision.playerIds, tiedTop) : tiedTop.includes(decision.winnerId));
    if (!covers) unresolvedTie = tiedTop;
    else if (decision.kind === 'shared') sharedFirst = new Set(tiedTop);
    else order = [sorted.find((p) => p.playerId === decision.winnerId)!, ...sorted.filter((p) => p.playerId !== decision.winnerId)];
  }

  const rows = order.map((p, i) => {
    // Exact ties below first share a place (competition ranking); a picked winner breaks only the top tie.
    const firstEqual = order.findIndex((q) => better(q, p) === 0);
    const place = sharedFirst.has(p.playerId) ? 1 : decision?.kind === 'picked' && tiedTop.includes(p.playerId) ? i + 1 : firstEqual + 1;
    return {
      playerId: p.playerId,
      total: p.total,
      target: p.target,
      margin: p.total - p.target,
      place,
      isWinner: unresolvedTie.length === 0 && (sharedFirst.size ? sharedFirst.has(p.playerId) : i === 0),
    };
  });
  return { rows, unresolvedTie };
}

function sameSet(a: string[], b: string[]) {
  return a.length === b.length && a.every((x) => b.includes(x));
}

/** "+27", "−19" (with a real minus sign). */
export function signed(n: number): string {
  return n >= 0 ? `+${n}` : `−${Math.abs(n)}`;
}
