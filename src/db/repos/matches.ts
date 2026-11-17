import type { ScoreDb } from '../schema';
import { newRecord, softDelete, touch } from '../record';
import type { GameKey, Match, MatchEvent, MatchPlayer, Player, PlayerColor } from '../../domain/types';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export interface LineupEntry {
  /** A saved profile, or null for a guest (FR-2 AC-3). */
  playerId: string | null;
  guestName?: string;
  emoji: string;
  color: PlayerColor;
  target?: number | null;
}

/** A seat with its player, in turn order. */
export interface Seat {
  mp: MatchPlayer;
  player: Player;
}

export interface MatchBundle {
  match: Match;
  seats: Seat[];
}

/** FR-3 step 6: start the game. Guests become isGuest profiles; the timer starts (AC-4). */
export async function createMatch(
  db: ScoreDb,
  gameKey: GameKey,
  lineup: LineupEntry[],
  settings: Record<string, unknown> = {},
  now: number = Date.now(),
): Promise<Match> {
  const colors = lineup.map((l) => l.color);
  if (new Set(colors).size !== colors.length) throw new Error('Two players share a color');

  return db.transaction('rw', db.matches, db.matchPlayers, db.players, async () => {
    const match: Match = newRecord(
      {
        gameKey,
        status: 'inProgress' as const,
        startedAt: now,
        endedAt: null,
        pausedDurationMs: 0,
        pausedAt: null,
        settings,
        notes: '',
        endedEarly: false,
        log: [],
      },
      now,
    );
    await db.matches.add(match);

    for (const [seatOrder, entry] of lineup.entries()) {
      let playerId = entry.playerId;
      if (!playerId) {
        const guest: Player = newRecord(
          {
            name: (entry.guestName ?? '').trim() || 'Guest',
            emoji: entry.emoji,
            color: entry.color === 'black' ? 'red' : entry.color,
            hideFromStats: true,
            isGuest: true,
          },
          now,
        );
        await db.players.add(guest);
        playerId = guest.id;
      }
      const mp: MatchPlayer = newRecord(
        {
          matchId: match.id,
          playerId,
          seatOrder,
          color: entry.color,
          target: entry.target ?? null,
          finalScore: null,
          placement: null,
          marginPastTarget: null,
          isWinner: false,
          details: {},
        },
        now,
      );
      await db.matchPlayers.add(mp);
    }
    return match;
  });
}

export async function getMatchBundle(db: ScoreDb, matchId: string): Promise<MatchBundle | null> {
  const match = await db.matches.get(matchId);
  if (!match || match.deletedAt !== null) return null;
  const mps = (await db.matchPlayers.where('matchId').equals(matchId).toArray())
    .filter((mp) => mp.deletedAt === null)
    .sort((a, b) => a.seatOrder - b.seatOrder);
  const players = await db.players.bulkGet(mps.map((mp) => mp.playerId));
  const seats = mps.map((mp, i) => ({ mp, player: players[i]! })).filter((s) => s.player);
  return { match, seats };
}

/** Records one entry. Written straight away so nothing is lost if iOS kills the app (R-7). */
export async function appendEvent(
  db: ScoreDb,
  matchId: string,
  event: DistributiveOmit<MatchEvent, 'at'>,
  now: number = Date.now(),
): Promise<void> {
  await db.transaction('rw', db.matches, async () => {
    const m = await db.matches.get(matchId);
    if (!m || m.status !== 'inProgress') return;
    await db.matches.put(touch(m, { log: [...m.log, { ...event, at: now } as MatchEvent] }, now));
  });
}

/** FR-5 AC-4: reverse the most recent entry. */
export async function undoLastEvent(db: ScoreDb, matchId: string): Promise<void> {
  await db.transaction('rw', db.matches, async () => {
    const m = await db.matches.get(matchId);
    if (!m || m.status !== 'inProgress' || m.log.length === 0) return;
    await db.matches.put(touch(m, { log: m.log.slice(0, -1) }));
  });
}

/** FR-5 AC-3: discard the game (after the screen confirms). */
export async function cancelMatch(db: ScoreDb, matchId: string, now: number = Date.now()): Promise<void> {
  await db.transaction('rw', db.matches, async () => {
    const m = await db.matches.get(matchId);
    if (!m) return;
    await db.matches.put(softDelete(touch(m, { status: 'cancelled' }, now), now));
  });
}

export interface SeatResult {
  matchPlayerId: string;
  placement: number | null;
  finalScore: number | null;
  marginPastTarget: number | null;
  isWinner: boolean;
  details: Record<string, unknown>;
}

/** FR-12 AC-2: save the outcome and mark the game finished. */
export async function finalizeMatch(
  db: ScoreDb,
  matchId: string,
  results: SeatResult[],
  endedAt: number,
  now: number = Date.now(),
): Promise<void> {
  await db.transaction('rw', db.matches, db.matchPlayers, async () => {
    const m = await db.matches.get(matchId);
    if (!m) throw new Error('Game not found');
    await writeResults(db, matchId, results, now);
    await db.matches.put(touch(m, { status: 'finished', endedAt, pausedAt: null }, now));
  });
}

/**
 * FR-12 AC-2 / FR-13: edit a finished game in place. It stays finished and
 * keeps its length; the entries and the outcome are replaced.
 */
export async function saveFinishedEdit(
  db: ScoreDb,
  matchId: string,
  changes: { log?: MatchEvent[]; endedEarly?: boolean },
  results: SeatResult[],
  now: number = Date.now(),
): Promise<void> {
  await db.transaction('rw', db.matches, db.matchPlayers, async () => {
    const m = await db.matches.get(matchId);
    if (!m || m.status !== 'finished') throw new Error('Only a finished game can be edited here');
    await writeResults(db, matchId, results, now);
    await db.matches.put(touch(m, changes, now));
  });
}

async function writeResults(db: ScoreDb, matchId: string, results: SeatResult[], now: number) {
  for (const r of results) {
    const mp = await db.matchPlayers.get(r.matchPlayerId);
    if (!mp || mp.matchId !== matchId) throw new Error('Seat not in this game');
    await db.matchPlayers.put(
      touch(
        mp,
        {
          placement: r.placement,
          finalScore: r.finalScore,
          marginPastTarget: r.marginPastTarget,
          isWinner: r.isWinner,
          details: r.details,
        },
        now,
      ),
    );
  }
}

/** Games waiting under In Progress on Home (FR-5 AC-2). */
export async function listInProgress(db: ScoreDb): Promise<Match[]> {
  const all = await db.matches.where('status').equals('inProgress').toArray();
  return all.filter((m) => m.deletedAt === null).sort((a, b) => b.updatedAt - a.updatedAt);
}

/** FR-5 AC-1: pause stops the clock. */
export async function pauseMatch(db: ScoreDb, matchId: string, now: number = Date.now()): Promise<void> {
  await db.transaction('rw', db.matches, async () => {
    const m = await db.matches.get(matchId);
    if (!m || m.status !== 'inProgress' || m.pausedAt !== null) return;
    await db.matches.put(touch(m, { pausedAt: now }, now));
  });
}

/** Resume: the paused stretch is added to pausedDurationMs, so it's left out of the game length. */
export async function resumeMatch(db: ScoreDb, matchId: string, now: number = Date.now()): Promise<void> {
  await db.transaction('rw', db.matches, async () => {
    const m = await db.matches.get(matchId);
    if (!m || m.pausedAt === null) return;
    const paused = Math.max(0, now - m.pausedAt);
    await db.matches.put(touch(m, { pausedAt: null, pausedDurationMs: m.pausedDurationMs + paused }, now));
  });
}

/** FR-5 AC-6: free-text notes, e.g. house rules. */
export async function setNotes(db: ScoreDb, matchId: string, notes: string, now: number = Date.now()): Promise<void> {
  await db.transaction('rw', db.matches, async () => {
    const m = await db.matches.get(matchId);
    if (!m || m.notes === notes) return;
    await db.matches.put(touch(m, { notes }, now));
  });
}

/** Most recently finished games, newest first (FR-13 AC-1). */
export async function listRecentFinished(db: ScoreDb, limit = Infinity): Promise<MatchBundle[]> {
  const finished = (await db.matches.where('status').equals('finished').toArray())
    .filter((m) => m.deletedAt === null)
    .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))
    .slice(0, limit);
  const bundles = await Promise.all(finished.map((m) => getMatchBundle(db, m.id)));
  return bundles.filter((b): b is MatchBundle => b !== null);
}
