import type { TurnLogEntry } from '../../domain/types';

/** FR-7 AC-1: route lengths 1–6 (US map only, spec FR-7 AC-9). */
export const ROUTE_POINTS: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 10, 6: 15 };
export const ROUTE_LENGTHS = [1, 2, 3, 4, 5, 6] as const;
export const START_TRAINS = 45;
export const FINAL_ROUND_AT = 2;
export const LONGEST_PATH_BONUS = 10;

export interface TtrPlayer {
  playerId: string;
  routePoints: number;
  trains: number;
}

export interface TtrState {
  players: TtrPlayer[];
  /** Whose turn it is now (turn order is the seat order). */
  current: string;
  turn: number;
  /** Set once a player ends a turn with ≤ 2 trains (AC-5). */
  finalRound: null | { triggeredBy: string; atTurn: number; turnsLeft: number };
  /** Every player has had their last turn: go to end-of-game scoring. */
  playComplete: boolean;
}

/**
 * Replays the turn log (AC-2, AC-3). Each turn belongs to the next player in
 * seat order. When a player ends a turn with 2 or fewer trains, every player,
 * that player included, gets exactly one more turn (AC-5). Because it is
 * replayed, editing a logged turn works the final round out again (A-10).
 */
export function ttrState(seatIds: string[], entries: TurnLogEntry[]): TtrState {
  const players = new Map(seatIds.map((id) => [id, { playerId: id, routePoints: 0, trains: START_TRAINS }]));
  let finalAt: number | null = null;
  let triggeredBy = '';
  entries.forEach((e, i) => {
    const p = players.get(e.playerId);
    if (!p) return;
    if (e.action === 'route' && e.routeLength) {
      p.routePoints += ROUTE_POINTS[e.routeLength] ?? 0;
      p.trains -= e.routeLength;
    }
    if (finalAt === null && p.trains <= FINAL_ROUND_AT) {
      finalAt = i;
      triggeredBy = p.playerId;
    }
  });
  const n = seatIds.length;
  const turn = entries.length;
  const lastTurn = finalAt === null ? null : finalAt + n; // index of the trigger player's extra turn
  const playComplete = lastTurn !== null && turn > lastTurn;
  return {
    players: seatIds.map((id) => players.get(id)!),
    current: seatIds[turn % n]!,
    turn,
    finalRound: finalAt === null ? null : { triggeredBy, atTurn: finalAt, turnsLeft: Math.max(0, lastTurn! - turn + 1) },
    playComplete,
  };
}

/** Who takes turn i (0-based). */
export function playerForTurn(seatIds: string[], i: number): string {
  return seatIds[i % seatIds.length]!;
}

/** A route can't use more trains than the player has left (A-10). */
export function canClaim(state: TtrState, playerId: string, length: number): boolean {
  const p = state.players.find((x) => x.playerId === playerId);
  return !!p && !state.playComplete && length <= p.trains;
}

/** Route lengths a logged turn could be changed to without any player's trains going below 0. Draws are always allowed. */
export function allowedRouteLengths(seatIds: string[], entries: TurnLogEntry[], index: number): number[] {
  return ROUTE_LENGTHS.filter((len) => {
    const trial = entries.map((e, i) => (i === index ? { ...e, action: 'route' as const, routeLength: len } : e));
    return ttrState(seatIds, trial).players.every((p) => p.trains >= 0);
  });
}

export interface Ticket {
  value: number;
  completed: boolean;
}

export interface TtrFinal {
  routePoints: number;
  tickets: Ticket[];
  longestPath: boolean;
}

/** AC-6, AC-7: route points + completed tickets − failed tickets + 10 for the longest path. */
export function ttrTotal(f: TtrFinal): number {
  const tickets = f.tickets.reduce((a, t) => a + (t.completed ? t.value : -t.value), 0);
  return f.routePoints + tickets + (f.longestPath ? LONGEST_PATH_BONUS : 0);
}

export function ticketsCompleted(f: TtrFinal): number {
  return f.tickets.filter((t) => t.completed).length;
}

export type TieDecision = { kind: 'shared'; playerIds: string[] } | { kind: 'picked'; winnerId: string };

/**
 * FR-11 AC-2: highest total; a tie goes to the most completed tickets, then the
 * longest-path holder. A tie that remains needs a decision (AC-3).
 */
export function rankTtr(
  finals: { playerId: string; final: TtrFinal }[],
  decision: TieDecision | null = null,
): { rows: { playerId: string; total: number; place: number; isWinner: boolean }[]; unresolvedTie: string[] } {
  const key = (x: { final: TtrFinal }) => [ttrTotal(x.final), ticketsCompleted(x.final), x.final.longestPath ? 1 : 0];
  const cmp = (a: { final: TtrFinal }, b: { final: TtrFinal }) => {
    const ka = key(a);
    const kb = key(b);
    for (let i = 0; i < ka.length; i++) if (kb[i]! !== ka[i]!) return kb[i]! - ka[i]!;
    return 0;
  };
  let order = [...finals].sort(cmp);
  const top = order[0];
  const tied = top ? order.filter((x) => cmp(x, top) === 0).map((x) => x.playerId) : [];
  let unresolved: string[] = [];
  let shared = new Set<string>();
  if (tied.length > 1) {
    const covers = decision && (decision.kind === 'shared' ? decision.playerIds.length === tied.length && tied.every((t) => decision.playerIds.includes(t)) : tied.includes(decision.winnerId));
    if (!covers) unresolved = tied;
    else if (decision.kind === 'shared') shared = new Set(tied);
    else order = [order.find((x) => x.playerId === decision.winnerId)!, ...order.filter((x) => x.playerId !== decision.winnerId)];
  }
  const rows = order.map((x, i) => {
    const firstEqual = order.findIndex((y) => cmp(y, x) === 0);
    const place = shared.has(x.playerId) ? 1 : decision?.kind === 'picked' && tied.includes(x.playerId) ? i + 1 : firstEqual + 1;
    return {
      playerId: x.playerId,
      total: ttrTotal(x.final),
      place,
      isWinner: unresolved.length === 0 && (shared.size ? shared.has(x.playerId) : i === 0),
    };
  });
  return { rows, unresolvedTie: unresolved };
}
