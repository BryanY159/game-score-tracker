import type { MatchBundle, Seat } from '../db/repos/matches';

/** The per-player value shown in history rows and game detail, by game. */
export function seatValue(b: MatchBundle, s: Seat): string {
  switch (b.match.gameKey) {
    case 'parcheesi':
      return `${(s.mp.details.pawnsHome as number | undefined) ?? 0} home`;
    case 'monopoly': {
      const nw = s.mp.details.netWorth as number | undefined;
      if (nw !== undefined) return nw.toLocaleString('en-US');
      return s.mp.details.bankruptAt !== undefined ? 'Bankrupt' : 'Last standing';
    }
    default:
      return s.mp.finalScore !== null ? String(s.mp.finalScore) : '';
  }
}

/** Seats by finishing place; unplaced seats keep turn order at the end. */
export function rankedSeats(b: MatchBundle): Seat[] {
  return [...b.seats].sort((x, y) => (x.mp.placement ?? 99) - (y.mp.placement ?? 99) || x.mp.seatOrder - y.mp.seatOrder);
}
