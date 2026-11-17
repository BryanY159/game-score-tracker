import type { ScoreDb, StoredBackup } from '../schema';
import { newId, softDelete, touch } from '../record';
import { exportAll } from '../../domain/backup/backup';
import type { BackupFile } from '../../domain/backup/format';
import { MERGED_TABLES, planMerge, type MergePlan } from '../../domain/backup/merge';

export const KEEP_BACKUPS = 3;

/** FR-16 AC-3: saved on this device before every merge; the newest few are kept. */
export async function saveAutoBackup(db: ScoreDb, reason: string, now: number = Date.now()): Promise<StoredBackup> {
  const backup: StoredBackup = { id: newId(), createdAt: now, reason, file: await exportAll(db, now) };
  await db.transaction('rw', db.backups, async () => {
    await db.backups.add(backup);
    const all = await db.backups.orderBy('createdAt').toArray();
    for (const old of all.slice(0, Math.max(0, all.length - KEEP_BACKUPS))) await db.backups.delete(old.id);
  });
  return backup;
}

export async function latestAutoBackup(db: ScoreDb): Promise<StoredBackup | undefined> {
  return db.backups.orderBy('createdAt').last();
}

/** AC-2: the preview, worked out against this device's data without changing anything. */
export async function previewMerge(db: ScoreDb, file: BackupFile): Promise<MergePlan> {
  const local = await exportAll(db);
  return planMerge(local.tables, file.tables);
}

/**
 * AC-1, AC-3: back up, then apply the plan in one transaction. The plan is
 * worked out again inside the transaction, so it always matches the data it
 * changes. Returns the counts actually applied.
 */
export async function applyMerge(db: ScoreDb, file: BackupFile, now: number = Date.now()): Promise<MergePlan['counts']> {
  await saveAutoBackup(db, 'Before merging a file', now);
  return db.transaction('rw', MERGED_TABLES.map((t) => db.table(t)), async () => {
    const local = Object.fromEntries(await Promise.all(MERGED_TABLES.map(async (t) => [t, await db.table(t).toArray()] as const)));
    const plan = planMerge(local as Parameters<typeof planMerge>[0], file.tables);
    for (const t of MERGED_TABLES) {
      const rows = [...plan.add[t], ...plan.update[t]];
      if (rows.length) await db.table(t).bulkPut(rows);
    }
    return plan.counts;
  });
}

export class PlayerMergeError extends Error {}

/** Games both players are seated in: merging them would give one person two seats (R-9). */
export async function sharedGames(db: ScoreDb, a: string, b: string): Promise<string[]> {
  const mps = (await db.matchPlayers.toArray()).filter((mp) => mp.deletedAt === null);
  const ofA = new Set(mps.filter((mp) => mp.playerId === a).map((mp) => mp.matchId));
  return [...new Set(mps.filter((mp) => mp.playerId === b && ofA.has(mp.matchId)).map((mp) => mp.matchId))];
}

/**
 * AC-4: merge two profiles of the same person. `drop`'s games move to `keep`
 * and `drop` is soft-deleted. A backup is saved first. Refused if they played
 * in the same game.
 */
export async function mergePlayers(db: ScoreDb, keep: string, drop: string, now: number = Date.now()): Promise<number> {
  if (keep === drop) throw new PlayerMergeError('Pick two different players.');
  if ((await sharedGames(db, keep, drop)).length) throw new PlayerMergeError('They played in the same game, so they must be different people.');
  await saveAutoBackup(db, 'Before merging players', now);
  return db.transaction('rw', db.players, db.matchPlayers, async () => {
    const [k, d] = await db.players.bulkGet([keep, drop]);
    if (!k || !d || k.deletedAt !== null || d.deletedAt !== null) throw new PlayerMergeError('Player not found.');
    const seats = (await db.matchPlayers.where('playerId').equals(drop).toArray()).filter((mp) => mp.deletedAt === null);
    for (const mp of seats) await db.matchPlayers.put(touch(mp, { playerId: keep }, now));
    await db.players.put(softDelete(d, now));
    return seats.length;
  });
}
