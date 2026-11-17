import type { Match, MatchPlayer, Player, Round, Settings, TurnLog } from '../types';

/** Bump when the export layout changes; restore refuses files from a newer app. */
export const SCHEMA_VERSION = 1;
export const APP_ID = 'game-score-tracker';

export interface BackupTables {
  players: Player[];
  matches: Match[];
  matchPlayers: MatchPlayer[];
  rounds: Round[];
  turnLogs: TurnLog[];
  settings: Settings[];
}

export interface BackupFile {
  app: typeof APP_ID;
  schemaVersion: number;
  exportedAt: number;
  tables: BackupTables;
}

export const TABLE_NAMES = ['players', 'matches', 'matchPlayers', 'rounds', 'turnLogs', 'settings'] as const;

export class BackupFormatError extends Error {}

/** Checks a parsed file before anything is changed (FR-15 AC-2). */
export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupFormatError("This file isn't a backup from this app.");
  }
  const d = data as Partial<BackupFile>;
  if (!d || typeof d !== 'object' || d.app !== APP_ID || typeof d.schemaVersion !== 'number' || !d.tables) {
    throw new BackupFormatError("This file isn't a backup from this app.");
  }
  if (d.schemaVersion > SCHEMA_VERSION) {
    throw new BackupFormatError('This backup is from a newer version of the app. Update the app, then try again.');
  }
  for (const name of TABLE_NAMES) {
    const rows = (d.tables as unknown as Record<string, unknown>)[name];
    if (!Array.isArray(rows)) throw new BackupFormatError(`The backup is missing ${name}.`);
    for (const r of rows as Record<string, unknown>[]) {
      if (!r || typeof r.id !== 'string' || typeof r.createdAt !== 'number' || typeof r.updatedAt !== 'number') {
        throw new BackupFormatError('The backup is damaged: a record is missing its id or dates.');
      }
    }
  }
  return d as BackupFile;
}

/** Counts shown before a restore (and later a merge). */
export function summarize(tables: BackupTables): { games: number; players: number } {
  return {
    games: tables.matches.filter((m) => m.status === 'finished' && m.deletedAt === null).length,
    players: tables.players.filter((p) => !p.isGuest && p.deletedAt === null).length,
  };
}

export function backupFileName(at: number): string {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  // ".backup.json" is git-ignored, so a backup can't be committed by accident (R-10).
  return `game-scores-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.backup.json`;
}
