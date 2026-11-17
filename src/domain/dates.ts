const DAY = 24 * 60 * 60 * 1000;

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Today, Yesterday, a weekday within the last week, then "Nov 12" (or "Nov 12, 2025" in another year). */
export function relativeDay(t: number, now: number = Date.now()): string {
  const days = Math.round((startOfDay(now) - startOfDay(t)) / DAY);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days > 1 && days < 7) return new Date(t).toLocaleDateString('en-US', { weekday: 'short' });
  const sameYear = new Date(t).getFullYear() === new Date(now).getFullYear();
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}
