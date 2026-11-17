import type { GameKey } from './types';

/**
 * Stats (FR-14). Everything here is a rate or an average, never a raw total
 * (AC-2). Pure functions over plain records, so they're easy to test.
 */

export interface StatSeat {
  playerId: string;
  placement: number | null;
  isWinner: boolean;
  finalScore: number | null;
  marginPastTarget: number | null;
  target: number | null;
  details: Record<string, unknown>;
}

export interface GameRecord {
  matchId: string;
  gameKey: GameKey;
  endedAt: number;
  lengthMs: number;
  rounds: number;
  seats: StatSeat[];
}

export interface StatPlayer {
  id: string;
  name: string;
}

/** A shared win among k players counts 1/k for each (A-6). */
export function winShare(r: GameRecord, playerId: string): number {
  const winners = r.seats.filter((s) => s.isWinner);
  return winners.some((s) => s.playerId === playerId) ? 1 / winners.length : 0;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export interface PlayerGameStats {
  playerId: string;
  games: number;
  eligible: boolean;
  winRate: number;
  avgPlacement: number | null;
  /** Target games: margin past target; Ticket to Ride: winning margin over the runner-up, in games won (A-7). */
  avgMargin: number | null;
}

/** Winner's score minus the runner-up's (Ticket to Ride margin, A-7). */
export function winningMargin(r: GameRecord, playerId: string): number | null {
  const me = r.seats.find((s) => s.playerId === playerId);
  if (!me?.isWinner || me.finalScore === null) return null;
  const others = r.seats.filter((s) => s.playerId !== playerId && s.finalScore !== null).map((s) => s.finalScore!);
  return others.length ? me.finalScore - Math.max(...others) : null;
}

/** AC-1 to AC-3: per game, per player; shown only after the minimum number of games. */
export function perGame(records: GameRecord[], gameKey: GameKey, players: StatPlayer[], minGames: number): PlayerGameStats[] {
  const games = records.filter((r) => r.gameKey === gameKey);
  return players
    .map((p) => {
      const mine = games.filter((r) => r.seats.some((s) => s.playerId === p.id));
      const seats = mine.map((r) => r.seats.find((s) => s.playerId === p.id)!);
      const margins =
        gameKey === 'ticketToRide'
          ? mine.map((r) => winningMargin(r, p.id)).filter((m): m is number => m !== null)
          : seats.map((s) => s.marginPastTarget).filter((m): m is number => m !== null);
      return {
        playerId: p.id,
        games: mine.length,
        eligible: mine.length >= minGames,
        winRate: mine.length ? mine.reduce((a, r) => a + winShare(r, p.id), 0) / mine.length : 0,
        avgPlacement: avg(seats.map((s) => s.placement).filter((x): x is number => x !== null)),
        avgMargin: gameKey === 'parcheesi' || gameKey === 'monopoly' ? null : avg(margins),
      };
    })
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.winRate - a.winRate || b.games - a.games);
}

/** A-5: the overall figure is the mean of a player's per-game win %, over games where they've reached the minimum. */
export function overall(records: GameRecord[], players: StatPlayer[], minGames: number, gameKeys: GameKey[]) {
  return players
    .map((p) => {
      const rates = gameKeys.map((g) => perGame(records, g, [p], minGames)[0]!).filter((s) => s.eligible);
      const games = records.filter((r) => r.seats.some((s) => s.playerId === p.id)).length;
      return { playerId: p.id, games, gamesCounted: rates.length, eligible: rates.length > 0, winRate: avg(rates.map((r) => r.winRate)) ?? 0 };
    })
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.winRate - a.winRate || b.games - a.games);
}

/**
 * AC-4 / A-8: only games both played. Whoever placed higher wins the matchup;
 * a shared placement is a tie.
 */
export function headToHead(records: GameRecord[], a: string, b: string, gameKey: GameKey | null) {
  let aWins = 0;
  let bWins = 0;
  let ties = 0;
  const aMargins: number[] = [];
  const bMargins: number[] = [];
  for (const r of records) {
    if (gameKey && r.gameKey !== gameKey) continue;
    const sa = r.seats.find((s) => s.playerId === a);
    const sb = r.seats.find((s) => s.playerId === b);
    if (!sa || !sb || sa.placement === null || sb.placement === null) continue;
    if (sa.placement < sb.placement) {
      aWins++;
      if (sa.finalScore !== null && sb.finalScore !== null) aMargins.push(sa.finalScore - sb.finalScore);
    } else if (sb.placement < sa.placement) {
      bWins++;
      if (sa.finalScore !== null && sb.finalScore !== null) bMargins.push(sb.finalScore - sa.finalScore);
    } else ties++;
  }
  return { games: aWins + bWins + ties, aWins, bWins, ties, aAvgMargin: avg(aMargins), bAvgMargin: avg(bMargins) };
}

/** Head to head opens on the two players with the most games together (in this game, or all games). */
export function busiestPair(records: GameRecord[], players: StatPlayer[], gameKey: GameKey | null): [string, string] | null {
  let best: [string, string] | null = null;
  let most = -1;
  for (let i = 0; i < players.length; i++)
    for (let j = i + 1; j < players.length; j++) {
      const n = headToHead(records, players[i]!.id, players[j]!.id, gameKey).games;
      if (n > most) {
        most = n;
        best = [players[i]!.id, players[j]!.id];
      }
    }
  return best;
}

export interface Record_ {
  label: string;
  playerId: string | null;
  value: string;
}

/** AC-5: game-specific stats, as rates and averages, for eligible players. */
export function gameSpecific(records: GameRecord[], gameKey: GameKey, eligible: Set<string>): Record_[] {
  const games = records.filter((r) => r.gameKey === gameKey);
  if (!games.length) return [];
  const per = (f: (s: StatSeat, r: GameRecord) => number | null) => {
    const by = new Map<string, number[]>();
    for (const r of games)
      for (const s of r.seats) {
        if (!eligible.has(s.playerId)) continue;
        const v = f(s, r);
        if (v === null) continue;
        by.set(s.playerId, [...(by.get(s.playerId) ?? []), v]);
      }
    return [...by.entries()].map(([playerId, xs]) => ({ playerId, value: avg(xs)! }));
  };
  const best = (xs: { playerId: string; value: number }[], dir: 1 | -1 = 1) => [...xs].sort((a, b) => dir * (b.value - a.value))[0];
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const one = (x: number) => (Math.round(x * 10) / 10).toString();
  const out: Record_[] = [];
  const push = (label: string, top: { playerId: string; value: number } | undefined, fmt: (n: number) => string) =>
    top && out.push({ label, playerId: top.playerId, value: fmt(top.value) });
  const num = (v: unknown) => (typeof v === 'number' ? v : null);

  switch (gameKey) {
    case 'parcheesi': {
      push('Most pawns home on average', best(per((s) => num(s.details.pawnsHome))), one);
      push('Fewest triple doublets per game', best(per((s) => num(s.details.tripleDoublets) ?? 0), -1), one);
      // The record for a single game (owner request, M10).
      let rec: { playerId: string; value: number } | undefined;
      for (const r of games)
        for (const s of r.seats) {
          const v = num(s.details.tripleDoublets) ?? 0;
          if (eligible.has(s.playerId) && v > 0 && (!rec || v > rec.value)) rec = { playerId: s.playerId, value: v };
        }
      push('Most triple doublets in one game', rec, (n) => String(n));
      const allTd = games.flatMap((r) => r.seats.map((s) => num(s.details.tripleDoublets) ?? 0));
      out.push({ label: 'Triple doublets per player per game', playerId: null, value: one(avg(allTd) ?? 0) });
      break;
    }
    case 'ticketToRide': {
      const tickets = (s: StatSeat) => (Array.isArray(s.details.tickets) ? (s.details.tickets as { completed: boolean }[]) : []);
      push(
        'Best ticket completion rate',
        best(
          per((s) => {
            const t = tickets(s);
            return t.length ? t.filter((x) => x.completed).length / t.length : null;
          }),
        ),
        pct,
      );
      push('Longest path most often', best(per((s) => (s.details.longestPath ? 1 : 0))), pct);
      break;
    }
    case 'flip7': {
      push('Most Flip 7s per game', best(per((s) => num(s.details.flip7Count))), one);
      push('Lowest bust rate', best(per((s, r) => (r.rounds ? (num(s.details.busts) ?? 0) / r.rounds : null)), -1), pct);
      // Fewest rounds to 200, by player count (FR-8 AC-5, A-4).
      const byCount = new Map<number, { playerId: string; value: number }>();
      for (const r of games)
        for (const s of r.seats) {
          const v = num(s.details.roundsTo200);
          if (v === null || !eligible.has(s.playerId)) continue;
          const cur = byCount.get(r.seats.length);
          if (!cur || v < cur.value) byCount.set(r.seats.length, { playerId: s.playerId, value: v });
        }
      for (const [n, rec] of [...byCount.entries()].sort((a, b) => a[0] - b[0])) push(`Fewest rounds to 200 · ${n} players`, rec, (x) => String(x));
      break;
    }
    case 'dutchBlitz':
      out.push({ label: 'Rounds to finish, on average', playerId: null, value: one(avg(games.map((r) => r.rounds)) ?? 0) });
      break;
    case 'monopoly': {
      const mins = avg(games.map((r) => r.lengthMs / 60000)) ?? 0;
      out.push({ label: 'Average game length', playerId: null, value: mins >= 60 ? `${Math.floor(mins / 60)} h ${Math.round(mins % 60)} min` : `${Math.round(mins)} min` });
      break;
    }
  }
  return out;
}

/** Trend chart: each player's running win % after each of their games, oldest first. */
export function winTrend(records: GameRecord[], gameKey: GameKey | null, players: StatPlayer[]) {
  const games = records.filter((r) => !gameKey || r.gameKey === gameKey).sort((a, b) => a.endedAt - b.endedAt);
  const tally = new Map(players.map((p) => [p.id, { played: 0, won: 0 }]));
  return games.map((r, i) => {
    const point: Record<string, number> & { game: number } = { game: i + 1 };
    for (const s of r.seats) {
      const t = tally.get(s.playerId);
      if (!t) continue;
      t.played++;
      t.won += winShare(r, s.playerId);
    }
    for (const [id, t] of tally) if (t.played) point[id] = Math.round((t.won / t.played) * 100);
    return point;
  });
}

/**
 * FR-14 AC-5 (M13): per player, Flip 7s and busts as a % of rounds played,
 * only for players who've reached the minimum number of Flip 7 games (AC-3).
 */
export function flip7Rates(records: GameRecord[], players: StatPlayer[], minGames: number) {
  const games = records.filter((r) => r.gameKey === 'flip7');
  return players
    .map((p) => {
      let rounds = 0;
      let flip7s = 0;
      let busts = 0;
      let played = 0;
      for (const r of games) {
        const s = r.seats.find((x) => x.playerId === p.id);
        if (!s) continue;
        played++;
        rounds += r.rounds;
        flip7s += typeof s.details.flip7Count === 'number' ? s.details.flip7Count : 0;
        busts += typeof s.details.busts === 'number' ? s.details.busts : 0;
      }
      return {
        playerId: p.id,
        games: played,
        rounds,
        eligible: played >= minGames && rounds > 0,
        flip7Rate: rounds ? flip7s / rounds : 0,
        bustRate: rounds ? busts / rounds : 0,
      };
    })
    .filter((x) => x.games > 0)
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.flip7Rate - a.flip7Rate);
}
