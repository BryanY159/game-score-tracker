import type { MatchBundle } from '../db/repos/matches';
import { elapsedMs, formatLength } from '../domain/timer';
import { parcheesiState } from './parcheesi/scoring';

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
  parts.push(formatLength(elapsedMs(b.match, now)));
  if (b.match.pausedAt !== null) parts.push('paused');
  return parts.join(' · ');
}
