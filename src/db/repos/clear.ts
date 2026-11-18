import type { ScoreDb } from '../schema';
import { getSettings } from './settings';

/**
 * TEMPORARY (spec FR-21, to be removed in the 1.0.0 PR): wipes this device's
 * data so the owner can start clean after testing. Players, games (with their
 * seats), rounds and turn logs always go; settings and the automatic merge
 * backups only when asked.
 */
export interface ClearCounts {
  players: number;
  games: number;
  rounds: number;
  turnLogs: number;
  backups: number;
}

export async function countForClear(db: ScoreDb): Promise<ClearCounts> {
  return {
    players: await db.players.count(),
    games: await db.matches.count(),
    rounds: await db.rounds.count(),
    turnLogs: await db.turnLogs.count(),
    backups: await db.backups.count(),
  };
}

export async function clearAllData(db: ScoreDb, { settingsAndBackups }: { settingsAndBackups: boolean }): Promise<void> {
  const tables = [db.players, db.matches, db.matchPlayers, db.rounds, db.turnLogs, ...(settingsAndBackups ? [db.settings, db.backups] : [])];
  await db.transaction('rw', tables, async () => {
    for (const t of tables) await t.clear();
  });
  if (settingsAndBackups) await getSettings(db); // back to the defaults
}
