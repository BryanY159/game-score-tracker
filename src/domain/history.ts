import type { MatchBundle } from '../db/repos/matches';
import type { GameKey } from './types';

export interface HistoryFilter {
  gameKey: GameKey | null;
  playerId: string | null;
}

/** FR-13 AC-1: filter by game and by player. */
export function filterHistory(bundles: MatchBundle[], f: HistoryFilter): MatchBundle[] {
  return bundles.filter(
    (b) =>
      (f.gameKey === null || b.match.gameKey === f.gameKey) &&
      (f.playerId === null || b.seats.some((s) => s.player.id === f.playerId)),
  );
}

export function endTime(b: MatchBundle): number {
  return b.match.endedAt ?? b.match.updatedAt;
}

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Groups newest-first games as in the mockup: "This week" (the last 7 days),
 * "Earlier in November" (rest of this month), then "October 2026" and so on.
 */
export function groupByPeriod(bundles: MatchBundle[], now: number = Date.now()): { label: string; items: MatchBundle[] }[] {
  const weekStart = startOfDay(now) - 6 * DAY;
  const nowDate = new Date(now);
  const groups: { label: string; items: MatchBundle[] }[] = [];
  for (const b of [...bundles].sort((x, y) => endTime(y) - endTime(x))) {
    const t = endTime(b);
    const d = new Date(t);
    let label: string;
    if (t >= weekStart) label = 'This week';
    else if (d.getFullYear() === nowDate.getFullYear() && d.getMonth() === nowDate.getMonth())
      label = `Earlier in ${d.toLocaleDateString('en-US', { month: 'long' })}`;
    else label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(b);
    else groups.push({ label, items: [b] });
  }
  return groups;
}
