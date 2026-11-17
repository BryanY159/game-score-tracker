import Dexie, { type EntityTable } from 'dexie';
import type { Match, MatchPlayer, Player, Round, Settings, TurnLog } from '../domain/types';

export const DB_NAME = 'game-score-tracker';

export class ScoreDb extends Dexie {
  players!: EntityTable<Player, 'id'>;
  matches!: EntityTable<Match, 'id'>;
  matchPlayers!: EntityTable<MatchPlayer, 'id'>;
  rounds!: EntityTable<Round, 'id'>;
  turnLogs!: EntityTable<TurnLog, 'id'>;
  settings!: EntityTable<Settings, 'id'>;

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
  }
}

export const TABLES = ['players', 'matches', 'matchPlayers', 'rounds', 'turnLogs', 'settings'] as const;

export const db = new ScoreDb();
