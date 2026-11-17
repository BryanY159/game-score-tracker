import type { ScoreDb } from '../../db/schema';
import { touch } from '../../db/record';
import { getSettings } from '../../db/repos/settings';
import { APP_ID, SCHEMA_VERSION, TABLE_NAMES, type BackupFile, type BackupTables } from './format';

/** FR-15 AC-1: everything, soft-deleted records included. */
export async function exportAll(db: ScoreDb, now: number = Date.now()): Promise<BackupFile> {
  return db.transaction('r', db.tables, async () => {
    const tables = Object.fromEntries(
      await Promise.all(TABLE_NAMES.map(async (n) => [n, await db.table(n).toArray()] as const)),
    ) as unknown as BackupTables;
    return { app: APP_ID, schemaVersion: SCHEMA_VERSION, exportedAt: now, tables };
  });
}

/** FR-15 AC-2: replace all local data with the file, in one transaction. */
export async function restoreAll(db: ScoreDb, file: BackupFile): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const n of TABLE_NAMES) {
      const table = db.table(n);
      await table.clear();
      const rows = file.tables[n];
      if (rows.length) await table.bulkAdd(rows);
    }
  });
  await getSettings(db); // a backup without settings gets defaults
}

/** Called once the file has actually been saved or shared (FR-17 shows this date). */
export async function markBackedUp(db: ScoreDb, now: number = Date.now()): Promise<void> {
  const s = await getSettings(db);
  await db.settings.put(touch(s, { lastBackupAt: now }, now));
}
