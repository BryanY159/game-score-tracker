/** Which moments get a mini celebration (FR-19 AC-2). Pure, so it's easy to test. */
export type CelebrationKind = 'flip7' | 'leadChange' | 'finalRound' | 'bankrupt' | 'allPawnsHome';

export interface Celebration {
  kind: CelebrationKind;
  text: string;
  emoji: string;
}

export function celebrationFor(kind: CelebrationKind, name: string): Celebration {
  switch (kind) {
    case 'flip7':
      return { kind, text: `Flip 7! ${name} +15`, emoji: '🎉' };
    case 'leadChange':
      return { kind, text: `${name} takes the lead`, emoji: '👑' };
    case 'finalRound':
      return { kind, text: `Final round! ${name} is nearly out of trains`, emoji: '🚂' };
    case 'bankrupt':
      return { kind, text: `${name} is bankrupt`, emoji: '💸' };
    case 'allPawnsHome':
      return { kind, text: `${name}: all 4 pawns home!`, emoji: '🏠' };
  }
}

/**
 * Lead change: the leader after a round is someone other than before, and the
 * new leader leads alone (a tie for first isn't a change). Null otherwise.
 */
export function leadChange(before: string[] | null, after: string[]): string | null {
  if (!before || before.length === 0 || after.length !== 1) return null;
  const leader = after[0]!;
  return before.length === 1 && before[0] === leader ? null : leader;
}

/**
 * Standings for rounds games: by margin past own target, then total, then seat
 * order. Players with the best margin and total are the leaders.
 */
export function standings(rows: { playerId: string; total: number; target: number }[]): { order: string[]; leaders: string[] } {
  const sorted = rows
    .map((r, i) => ({ ...r, i, margin: r.total - r.target }))
    .sort((a, b) => b.margin - a.margin || b.total - a.total || a.i - b.i);
  const top = sorted[0];
  const leaders = top && top.total > 0 ? sorted.filter((r) => r.margin === top.margin && r.total === top.total).map((r) => r.playerId) : [];
  return { order: sorted.map((r) => r.playerId), leaders };
}
