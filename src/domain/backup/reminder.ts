import type { Match, Settings } from '../types';

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export interface BackupStatus {
  gamesSince: number;
  totalGames: number;
  due: boolean;
  neverBackedUp: boolean;
}

/**
 * FR-17: suggest a backup every N finished games, or monthly. Monthly counts
 * from the last backup, or from the first unbacked game if there's never been one.
 */
export function backupStatus(settings: Settings, matches: Match[], now: number = Date.now()): BackupStatus {
  const finished = matches.filter((m) => m.status === 'finished' && m.deletedAt === null);
  const since = finished.filter((m) => settings.lastBackupAt === null || (m.endedAt ?? 0) > settings.lastBackupAt);
  const r = settings.backupReminder;
  let due = false;
  if (r.enabled && since.length > 0) {
    if (r.mode === 'games') due = since.length >= r.everyGames;
    else {
      const from = settings.lastBackupAt ?? Math.min(...since.map((m) => m.endedAt ?? now));
      due = now - from >= MONTH_MS;
    }
  }
  return { gamesSince: since.length, totalGames: finished.length, due, neverBackedUp: settings.lastBackupAt === null };
}
