import type { Match, MatchEvent, MatchPlayer, Player, PlayerColor } from '../../src/domain/types';

/** Synthetic games only (CLAUDE.md). Times are fixed so screenshots are stable. */
export const NOW = Date.UTC(2026, 10, 14, 20, 0, 0);

let n = 0;
const id = (prefix: string) => {
  n += 1;
  return `${prefix}0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
};

export function match(
  gameKey: Match['gameKey'],
  seats: { player: Player; color: PlayerColor }[],
  extra: Partial<Match> = {},
): { matches: Match[]; matchPlayers: MatchPlayer[]; players: Player[] } {
  const m: Match = {
    id: id('a'),
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    gameKey,
    status: 'inProgress',
    startedAt: NOW - (41 * 60 + 37) * 1000,
    endedAt: null,
    pausedDurationMs: 0,
    pausedAt: null,
    settings: {},
    notes: '',
    endedEarly: false,
    log: [],
    ...extra,
  };
  const matchPlayers = seats.map(
    (s, seatOrder): MatchPlayer => ({
      id: id('b'),
      createdAt: NOW,
      updatedAt: NOW,
      deletedAt: null,
      matchId: m.id,
      playerId: s.player.id,
      seatOrder,
      color: s.color,
      target: null,
      finalScore: null,
      placement: null,
      marginPastTarget: null,
      isWinner: false,
      details: {},
    }),
  );
  return { matches: [m], matchPlayers, players: seats.map((s) => s.player) };
}

export function pawns(playerId: string, count: number, at = NOW - 60_000): MatchEvent[] {
  return Array.from({ length: count }, (_, i) => ({ type: 'pawns' as const, playerId, delta: 1 as const, at: at + i }));
}
