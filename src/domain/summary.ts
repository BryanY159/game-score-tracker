import type { MatchBundle } from '../db/repos/matches';

/** "Sam won · 4 players", "Shared win · Alex and Sam" for history rows. */
export function resultLine(b: MatchBundle): string {
  const winners = b.seats.filter((s) => s.mp.isWinner);
  const players = b.match.endedEarly ? 'ended early' : `${b.seats.length} players`;
  if (winners.length === 0) return players;
  if (winners.length === 1) return `${winners[0]!.player.name} won · ${players}`;
  const names = winners.map((w) => w.player.name);
  return `Shared win · ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
