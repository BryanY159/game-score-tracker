import type { Match } from './types';

type Clock = Pick<Match, 'startedAt' | 'endedAt' | 'pausedDurationMs' | 'pausedAt'>;

/**
 * Playing time so far, without paused time (FR-5 AC-1). Derived from
 * timestamps, never from ticks, so iOS suspending the app can't skew it (R-6).
 */
export function elapsedMs(m: Clock, now: number = Date.now()): number {
  const end = m.endedAt ?? m.pausedAt ?? now;
  return Math.max(0, end - m.startedAt - m.pausedDurationMs);
}

/** 32:14 under an hour, 1:05:09 after. */
export function formatClock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** 48 min, 1 h 22 min. */
export function formatLength(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
