import type { ScoreDb } from '../schema';
import { newRecord, softDelete, touch } from '../record';
import type { TurnLog, TurnLogEntry } from '../../domain/types';

/** Ticket to Ride's turn log (FR-7): one record per game, deleted when the game is finalized (AC-8). */
export async function getTurnLog(db: ScoreDb, matchId: string): Promise<TurnLog | null> {
  const logs = (await db.turnLogs.where('matchId').equals(matchId).toArray()).filter((l) => l.deletedAt === null);
  return logs[0] ?? null;
}

async function write(db: ScoreDb, matchId: string, change: (entries: TurnLogEntry[]) => TurnLogEntry[], now: number) {
  await db.transaction('rw', db.turnLogs, async () => {
    const log = await getTurnLog(db, matchId);
    if (log) await db.turnLogs.put(touch(log, { entries: change(log.entries) }, now));
    else await db.turnLogs.add(newRecord({ matchId, entries: change([]) }, now));
  });
}

/** One tap records the action (AC-2). Saved straight away (R-7). */
export async function appendTurn(db: ScoreDb, matchId: string, entry: Omit<TurnLogEntry, 'at'>, now: number = Date.now()): Promise<void> {
  await write(db, matchId, (e) => [...e, { ...entry, at: now }], now);
}

/** FR-5 AC-4: reverse the most recent turn. */
export async function undoTurn(db: ScoreDb, matchId: string, now: number = Date.now()): Promise<void> {
  await write(db, matchId, (e) => e.slice(0, -1), now);
}

/** AC-4: any logged turn can be edited (it keeps its player and time). */
export async function editTurn(
  db: ScoreDb,
  matchId: string,
  index: number,
  change: Pick<TurnLogEntry, 'action' | 'routeLength'>,
  now: number = Date.now(),
): Promise<void> {
  await write(db, matchId, (e) => e.map((x, i) => (i === index ? { ...x, action: change.action, routeLength: change.action === 'route' ? change.routeLength : undefined } : x)), now);
}

/** AC-8: finalizing deletes the turn log (soft delete, so the deletion syncs: NFR-5). */
export async function deleteTurnLog(db: ScoreDb, matchId: string, now: number = Date.now()): Promise<void> {
  await db.transaction('rw', db.turnLogs, async () => {
    const log = await getTurnLog(db, matchId);
    if (log) await db.turnLogs.put(softDelete(touch(log, { entries: [] }, now), now));
  });
}
