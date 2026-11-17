import type { ScoreDb } from '../schema';
import type { Settings } from '../../domain/types';

export const SETTINGS_ID = 'settings';

export function defaultSettings(now: number = Date.now()): Settings {
  return {
    id: SETTINGS_ID,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    statsMinGames: 5,
    backupReminder: { enabled: true, mode: 'games', everyGames: 10 },
    lastBackupAt: null,
  };
}

/** Returns the single Settings record, creating it with defaults if missing. */
export async function getSettings(db: ScoreDb): Promise<Settings> {
  return db.transaction('rw', db.settings, async () => {
    const existing = await db.settings.get(SETTINGS_ID);
    if (existing) return existing;
    const created = defaultSettings();
    await db.settings.add(created);
    return created;
  });
}
