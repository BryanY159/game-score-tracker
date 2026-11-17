import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { ScoreDb } from '../schema';
import { createPlayer, deletePlayer, updatePlayer } from './players';
import { createMatch, finalizeMatch, getMatchBundle } from './matches';
import { exportAll, restoreAll } from '../../domain/backup/backup';
import { applyMerge, latestAutoBackup, mergePlayers, previewMerge, saveAutoBackup, KEEP_BACKUPS } from './merge';
import { sameNamePairs } from '../../domain/backup/merge';

let iphone: ScoreDb;
let ipad: ScoreDb;
beforeEach(() => {
  iphone = new ScoreDb(`iphone-${crypto.randomUUID()}`);
  ipad = new ScoreDb(`ipad-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await iphone.delete();
  await ipad.delete();
});

async function play(db: ScoreDb, names: string[], winner = 0) {
  const ids = [];
  for (const n of names) ids.push((await createPlayer(db, { name: n, emoji: '🦊', color: 'red', hideFromStats: false })).id);
  const m = await createMatch(db, 'parcheesi', ids.map((id, i) => ({ playerId: id, emoji: '🦊', color: (['red', 'blue', 'green', 'gold'] as const)[i]! })));
  const b = (await getMatchBundle(db, m.id))!;
  await finalizeMatch(db, m.id, b.seats.map((s, i) => ({ matchPlayerId: s.mp.id, placement: i === winner ? 1 : 2, finalScore: null, marginPastTarget: null, isWinner: i === winner, details: {} })), 1000);
  return { matchId: m.id, ids };
}

describe('merge import (FR-16)', () => {
  it('previews, then adds the other device\'s games and players (AC-1, AC-2)', async () => {
    await play(iphone, ['Alex', 'Sam']);
    await play(ipad, ['Riley', 'Jo']);
    const file = await exportAll(ipad);
    const preview = await previewMerge(iphone, file);
    expect(preview.counts).toMatchObject({ newGames: 1, newPlayers: 2 });
    expect(await iphone.matches.count()).toBe(1); // the preview changes nothing
    const applied = await applyMerge(iphone, file);
    expect(applied).toEqual(preview.counts);
    expect(await iphone.matches.count()).toBe(2);
    expect((await iphone.players.toArray()).map((p) => p.name).sort()).toEqual(['Alex', 'Jo', 'Riley', 'Sam']);
  });

  it('running the same merge twice changes nothing the second time', async () => {
    await play(iphone, ['Alex', 'Sam']);
    await play(ipad, ['Riley', 'Jo']);
    const file = await exportAll(ipad);
    await applyMerge(iphone, file);
    const after1 = await exportAll(iphone, 1);
    const second = await applyMerge(iphone, file);
    expect(second).toMatchObject({ added: 0, conflictsTakingIncoming: 0, newGames: 0, newPlayers: 0 });
    const after2 = await exportAll(iphone, 1);
    expect(after2.tables).toEqual(after1.tables);
  });

  it('merging both ways gives both devices the same data', async () => {
    await play(iphone, ['Alex', 'Sam']);
    await play(ipad, ['Riley', 'Jo']);
    const fromPhone = await exportAll(iphone);
    const fromPad = await exportAll(ipad);
    await applyMerge(iphone, fromPad);
    await applyMerge(ipad, fromPhone);
    const strip = async (db: ScoreDb) => {
      const t = (await exportAll(db, 1)).tables;
      return { ...t, settings: [] };
    };
    expect(await strip(iphone)).toEqual(await strip(ipad));
  });

  it('the newer edit wins and deletions carry over (AC-1)', async () => {
    const { ids } = await play(iphone, ['Alex', 'Sam']);
    await restoreAll(ipad, await exportAll(iphone)); // the iPad starts as a copy
    await updatePlayer(ipad, ids[0]!, { name: 'Alexander', emoji: '🦊', color: 'red', hideFromStats: false });
    await deletePlayer(ipad, ids[1]!);
    await applyMerge(iphone, await exportAll(ipad));
    const ps = await iphone.players.toArray();
    expect(ps.find((p) => p.id === ids[0])!.name).toBe('Alexander');
    expect(ps.find((p) => p.id === ids[1])!.deletedAt).not.toBeNull();
  });

  it('saves an automatic backup before applying, and keeps the newest few (AC-3)', async () => {
    await play(iphone, ['Alex', 'Sam']);
    const before = await exportAll(iphone, 1);
    await play(ipad, ['Riley', 'Jo']);
    await applyMerge(iphone, await exportAll(ipad), 5000);
    const backup = (await latestAutoBackup(iphone))!;
    expect(backup.reason).toBe('Before merging a file');
    expect({ ...backup.file, exportedAt: 1 }.tables).toEqual(before.tables);
    // Restoring it undoes the merge.
    await restoreAll(iphone, backup.file);
    expect(await iphone.matches.count()).toBe(1);
    for (let i = 0; i < 5; i++) await saveAutoBackup(iphone, 'x', 6000 + i);
    expect(await iphone.backups.count()).toBe(KEEP_BACKUPS);
  });

  it('flags same-name players, and the player merge moves their games (AC-4)', async () => {
    await play(iphone, ['Alex', 'Sam']);
    await play(ipad, ['Alex', 'Jo']);
    await applyMerge(iphone, await exportAll(ipad));
    const pairs = sameNamePairs(await iphone.players.toArray());
    expect(pairs).toHaveLength(1);
    const [keep, drop] = pairs[0]!;
    const moved = await mergePlayers(iphone, keep.id, drop.id);
    expect(moved).toBe(1);
    const seats = (await iphone.matchPlayers.toArray()).filter((mp) => mp.playerId === keep.id);
    expect(seats).toHaveLength(2);
    expect((await iphone.players.get(drop.id))!.deletedAt).not.toBeNull();
    expect(sameNamePairs(await iphone.players.toArray())).toEqual([]);
    expect((await latestAutoBackup(iphone))!.reason).toBe('Before merging players');
  });

  it('refuses to merge two players who were in the same game (R-9)', async () => {
    const { ids } = await play(iphone, ['Alex', 'Sam']);
    await expect(mergePlayers(iphone, ids[0]!, ids[1]!)).rejects.toThrow('same game');
    expect(await iphone.backups.count()).toBe(0); // refused before anything changed
  });
});

describe('schema migration v1 → v2', () => {
  it('keeps all data and adds the backups store', async () => {
    const name = `migrate-${crypto.randomUUID()}`;
    const v1 = new Dexie(name);
    v1.version(1).stores({
      players: 'id, name, updatedAt',
      matches: 'id, gameKey, status, startedAt, updatedAt',
      matchPlayers: 'id, matchId, playerId, updatedAt',
      rounds: 'id, matchId, [matchId+number], updatedAt',
      turnLogs: 'id, matchId, updatedAt',
      settings: 'id',
    });
    await v1.table('players').add({ id: 'p1', name: 'Alex', createdAt: 1, updatedAt: 1, deletedAt: null });
    v1.close();
    const v2 = new ScoreDb(name);
    await v2.open();
    expect(v2.verno).toBe(2);
    expect((await v2.players.get('p1'))!.name).toBe('Alex');
    expect(await v2.backups.count()).toBe(0);
    await v2.delete();
  });
});
