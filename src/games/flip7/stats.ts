import type { Round } from '../../domain/types';

/**
 * What a finished Flip 7 game saves per player (FR-8 AC-5): Flip 7 count, busts,
 * and, for players whose target was 200 (A-4), the round in which their total
 * first reached 200 (for "fewest rounds to 200").
 */
export function flip7Details(
  seats: { playerId: string; target: number }[],
  confirmed: Round[],
): Record<string, { flip7Count: number; busts: number; roundsTo200: number | null }> {
  const out: Record<string, { flip7Count: number; busts: number; roundsTo200: number | null }> = {};
  for (const s of seats) {
    let total = 0;
    let flip7Count = 0;
    let busts = 0;
    let roundsTo200: number | null = null;
    confirmed.forEach((r, i) => {
      const e = r.entries.find((x) => x.playerId === s.playerId);
      if (!e) return;
      total += e.score;
      if (e.flags.includes('flip7')) flip7Count++;
      if (e.flags.includes('bust')) busts++;
      if (s.target === 200 && roundsTo200 === null && total >= 200) roundsTo200 = i + 1;
    });
    out[s.playerId] = { flip7Count, busts, roundsTo200 };
  }
  return out;
}
