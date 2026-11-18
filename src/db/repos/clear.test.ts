import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ScoreDb } from '../schema';
import { clearAllData, countForClear } from './clear';
import { getSettings, updateSettings } from './settings';
import { appendTurn } from './turnLogs';

let db: ScoreDb;
beforeEach(async () => {
  db = new ScoreDb(`clear-${crypto.randomUUID()}`);
  const row = (id: string, extra: Record<string, unknown> = {}) => ({ id, createdAt: 1, updatedAt: 1, deletedAt: null, ...extra });
  // Synthetic rows only; the shape doesn't matter for clearing.
  await db.players.bulkPut([row('p1'), row('p2', { deletedAt: 5 })] as never);
  await db.matches.bulkPut([row('m1'), row('m2')] as never);
  await db.matchPlayers.bulkPut([row('mp1', { matchId: 'm1' })] as never);
  await db.rounds.bulkPut([row('r1', { matchId: 'm1', number: 1 })] as never);
  await appendTurn(db, 'm2', { playerId: 'p1', action: 'drawTrains' }, 100);
  await db.backups.put({ id: 'b1', createdAt: 1, reason: 'Before merge', file: {} } as never);
  await updateSettings(db, { statsMinGames: 3 });
});
afterEach(async () => {
  await db.delete();
});

describe('Clear all data (temporary, FR-21)', () => {
  it('counts what will go, soft-deleted rows included', async () => {
    expect(await countForClear(db)).toEqual({ players: 2, games: 2, rounds: 1, turnLogs: 1, backups: 1 });
  });

  it('deletes players, games, seats, rounds and turn logs, and keeps settings and backups by default', async () => {
    await clearAllData(db, { settingsAndBackups: false });
    for (const t of [db.players, db.matches, db.matchPlayers, db.rounds, db.turnLogs]) expect(await t.count()).toBe(0);
    expect(await db.backups.count()).toBe(1);
    expect((await getSettings(db)).statsMinGames).toBe(3);
  });

  it('also clears settings (back to defaults) and the automatic backups when asked', async () => {
    await clearAllData(db, { settingsAndBackups: true });
    expect(await db.backups.count()).toBe(0);
    expect((await getSettings(db)).statsMinGames).toBe(5);
  });
});
