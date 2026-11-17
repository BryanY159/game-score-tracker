import Dexie, { type EntityTable } from 'dexie';
import type { Match, MatchPlayer, Player, Round, Settings, TurnLog } from '../domain/types';
import type { BackupFile } from '../domain/backup/format';

export interface StoredBackup {
  id: string;
  createdAt: number;
  /** Why it was made, e.g. "Before merging a file". */
  reason: string;
  file: BackupFile;
}

export const DB_NAME = 'game-score-tracker';

export class ScoreDb extends Dexie {
  players!: EntityTable<Player, 'id'>;
  matches!: EntityTable<Match, 'id'>;
  matchPlayers!: EntityTable<MatchPlayer, 'id'>;
  rounds!: EntityTable<Round, 'id'>;
  turnLogs!: EntityTable<TurnLog, 'id'>;
  settings!: EntityTable<Settings, 'id'>;
  /** Automatic backups made before a merge (FR-16 AC-3). This device only; not exported. */
  backups!: EntityTable<StoredBackup, 'id'>;

  constructor(name: string = DB_NAME) {
    super(name);
    this.version(1).stores({
      players: 'id, name, updatedAt',
      matches: 'id, gameKey, status, startedAt, updatedAt',
      matchPlayers: 'id, matchId, playerId, updatedAt',
      rounds: 'id, matchId, [matchId+number], updatedAt',
      turnLogs: 'id, matchId, updatedAt',
      settings: 'id',
    });
    // v2 (M11): automatic backups before a merge. Existing data is untouched.
    this.version(2).stores({ backups: 'id, createdAt' });
  }
}

export const TABLES = ['players', 'matches', 'matchPlayers', 'rounds', 'turnLogs', 'settings'] as const;

export const db = new ScoreDb();
