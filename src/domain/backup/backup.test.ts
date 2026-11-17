import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ScoreDb } from '../../db/schema';
import { createPlayer, deletePlayer } from '../../db/repos/players';
import { cancelMatch, createMatch, finalizeMatch } from '../../db/repos/matches';
import { defaultSettings, getSettings } from '../../db/repos/settings';
import { exportAll, markBackedUp, restoreAll } from './backup';
import { backupFileName, BackupFormatError, parseBackup, SCHEMA_VERSION, summarize } from './format';
import { backupStatus } from './reminder';
import type { Match } from '../types';

let db: ScoreDb;
let other: ScoreDb;
beforeEach(() => {
  db = new ScoreDb(`backup-${crypto.randomUUID()}`);
  other = new ScoreDb(`restore-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await db.delete();
  await other.delete();
});

async function someData(target: ScoreDb) {
  const alex = await createPlayer(target, { name: 'Alex', emoji: '🦊', color: 'red', hideFromStats: false });
  const gone = await createPlayer(target, { name: 'Gone', emoji: '🐢', color: 'blue', hideFromStats: false });
  await deletePlayer(target, gone.id);
  const m = await createMatch(target, 'parcheesi', [
    { playerId: alex.id, emoji: '🦊', color: 'red' },
    { playerId: null, guestName: 'Pat', emoji: '🙂', color: 'blue' },
  ]);
  await finalizeMatch(target, m.id, [], 10_000);
  const c = await createMatch(target, 'parcheesi', [{ playerId: alex.id, emoji: '🦊', color: 'red' }]);
  await cancelMatch(target, c.id);
  await getSettings(target);
}

describe('export and restore (FR-15)', () => {
  it('exports every table with a schema version, soft-deleted records included (AC-1)', async () => {
    await someData(db);
    const file = await exportAll(db, 1234);
    expect(file).toMatchObject({ app: 'game-score-tracker', schemaVersion: SCHEMA_VERSION, exportedAt: 1234 });
    expect(file.tables.players).toHaveLength(3); // Alex, deleted Gone, guest Pat
    expect(file.tables.players.some((p) => p.deletedAt !== null)).toBe(true);
    expect(file.tables.matches.some((m) => m.status === 'cancelled')).toBe(true);
    expect(file.tables.settings).toHaveLength(1);
  });

  it('round-trips exactly: export, then restore elsewhere, then export again', async () => {
    await someData(db);
    const file = await exportAll(db, 1);
    await createPlayer(other, { name: 'Will be replaced', emoji: '🐳', color: 'teal', hideFromStats: false });
    await restoreAll(other, parseBackup(JSON.stringify(file)));
    expect(await exportAll(other, 1)).toEqual(file);
  });

  it('restore replaces everything (AC-2)', async () => {
    await createPlayer(other, { name: 'Old', emoji: '🐳', color: 'teal', hideFromStats: false });
    await someData(db);
    await restoreAll(other, await exportAll(db));
    expect((await other.players.toArray()).map((p) => p.name).sort()).toEqual(['Alex', 'Gone', 'Pat']);
  });

  it('rejects files that are not backups, or are from a newer app', async () => {
    expect(() => parseBackup('not json')).toThrow(BackupFormatError);
    expect(() => parseBackup('{"app":"something-else"}')).toThrow("isn't a backup");
    const file = await exportAll(db);
    expect(() => parseBackup(JSON.stringify({ ...file, schemaVersion: SCHEMA_VERSION + 1 }))).toThrow('newer version');
    const broken = { ...file, tables: { ...file.tables, players: [{ name: 'no id' }] } };
    expect(() => parseBackup(JSON.stringify(broken))).toThrow('damaged');
    const missing = { ...file, tables: { ...file.tables, rounds: undefined } };
    expect(() => parseBackup(JSON.stringify(missing))).toThrow('missing rounds');
  });

  it('summarizes saved games and players for the confirm step', async () => {
    await someData(db);
    expect(summarize((await exportAll(db)).tables)).toEqual({ games: 1, players: 1 });
  });

  it('records the backup date', async () => {
    await markBackedUp(db, 777);
    expect((await getSettings(db)).lastBackupAt).toBe(777);
  });

  it('names files so they are git-ignored (R-10)', () => {
    expect(backupFileName(new Date(2026, 10, 4).getTime())).toBe('game-scores-2026-11-04.backup.json');
  });
});

describe('backup reminder (FR-17)', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const game = (endedAt: number, status: Match['status'] = 'finished') => ({ status, endedAt, deletedAt: null }) as Match;
  const settings = (patch: Partial<ReturnType<typeof defaultSettings>> = {}) => ({ ...defaultSettings(0), ...patch });

  it('counts games since the last backup', () => {
    const s = settings({ lastBackupAt: 100 });
    const st = backupStatus(s, [game(50), game(150), game(200), game(300, 'inProgress')]);
    expect(st).toMatchObject({ gamesSince: 2, totalGames: 3, due: false });
  });

  it('is due every N games', () => {
    const s = settings({ backupReminder: { enabled: true, mode: 'games', everyGames: 3 } });
    expect(backupStatus(s, [game(1), game(2)]).due).toBe(false);
    expect(backupStatus(s, [game(1), game(2), game(3)]).due).toBe(true);
  });

  it('is due monthly, counting from the last backup', () => {
    const s = settings({ lastBackupAt: 0, backupReminder: { enabled: true, mode: 'month', everyGames: 10 } });
    expect(backupStatus(s, [game(DAY)], 29 * DAY).due).toBe(false);
    expect(backupStatus(s, [game(DAY)], 31 * DAY).due).toBe(true);
    expect(backupStatus(s, [], 90 * DAY).due).toBe(false); // nothing new to back up
  });

  it('is never due when turned off', () => {
    const s = settings({ backupReminder: { enabled: false, mode: 'games', everyGames: 1 } });
    expect(backupStatus(s, [game(1), game(2)]).due).toBe(false);
  });
});
