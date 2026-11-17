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

/** Extra per-player detail in game detail: margin and handicap target in target games (FR-13 AC-2). */
export function seatDetail(b: MatchBundle, s: Seat): string | null {
  switch (b.match.gameKey) {
    case 'parcheesi': {
      const n = (s.mp.details.tripleDoublets as number | undefined) ?? 0;
      return `${n} triple ${n === 1 ? 'doublet' : 'doublets'}`;
    }
    case 'dutchBlitz':
    case 'flip7': {
      const margin = s.mp.marginPastTarget;
      if (margin === null || s.mp.target === null) return null;
      return `${margin >= 0 ? '+' : '−'}${Math.abs(margin)} · to ${s.mp.target}`;
    }
    default:
      return null;
  }
}

/** Seats by finishing place; unplaced seats keep turn order at the end. */
export function rankedSeats(b: MatchBundle): Seat[] {
  return [...b.seats].sort((x, y) => (x.mp.placement ?? 99) - (y.mp.placement ?? 99) || x.mp.seatOrder - y.mp.seatOrder);
}
