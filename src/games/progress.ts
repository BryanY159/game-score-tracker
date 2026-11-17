import type { MatchBundle } from '../db/repos/matches';
import { elapsedMs, formatLength } from '../domain/timer';
import { parcheesiState } from './parcheesi/scoring';
import { monopolyState } from './monopoly/scoring';

/** In-progress card line, e.g. "1 placed · 42 min · paused". */
export function progressLine(b: MatchBundle, now?: number): string {
  const parts: string[] = [];
  if (b.match.gameKey === 'parcheesi') {
    const placed = parcheesiState(
      b.seats.map((s) => s.player.id),
      b.match.log,
    ).players.filter((p) => p.placement !== null).length;
    parts.push(placed === 0 ? 'Just started' : `${placed} placed`);
  }
  if (b.match.gameKey === 'monopoly') {
    const left = monopolyState(
      b.seats.map((s) => s.player.id),
      b.match.log,
    ).remaining.length;
    parts.push(`${left} still playing`);
  }
  if (b.match.gameKey === 'ticketToRide') parts.push(`Turn ${b.turns.length + 1}`);
  if (b.match.gameKey === 'dutchBlitz' || b.match.gameKey === 'flip7') {
    parts.push(`Round ${b.rounds.filter((r) => r.confirmed).length + 1}`);
  }
  parts.push(formatLength(elapsedMs(b.match, now)));
  if (b.match.pausedAt !== null) parts.push('paused');
  return parts.join(' · ');
}
