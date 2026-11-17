import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ScoreDb } from '../schema';
import { newRecord } from '../record';
import {
  createPlayer,
  deletePlayer,
  gamesPlayedByPlayer,
  listPlayers,
  PlayerValidationError,
  suggestColor,
  updatePlayer,
  type PlayerInput,
} from './players';
import type { Match, MatchPlayer } from '../../domain/types';

let db: ScoreDb;
beforeEach(() => {
  db = new ScoreDb(`players-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await db.delete();
});

const alex: PlayerInput = { name: 'Alex', emoji: '🦊', color: 'red', hideFromStats: false };

describe('players repo (FR-2)', () => {
  it('creates a sync-ready profile', async () => {
    const p = await createPlayer(db, { ...alex, name: '  Alex   Smith ' });
    expect(p).toMatchObject({ name: 'Alex Smith', emoji: '🦊', color: 'red', isGuest: false, deletedAt: null });
    expect(p.id).toBeTruthy();
    expect(await db.players.get(p.id)).toEqual(p);
  });

  it('rejects empty, too long and duplicate names', async () => {
    await createPlayer(db, alex);
    await expect(createPlayer(db, { ...alex, name: '   ' })).rejects.toBeInstanceOf(PlayerValidationError);
    await expect(createPlayer(db, { ...alex, name: 'x'.repeat(25) })).rejects.toThrow('24 characters');
    await expect(createPlayer(db, { ...alex, name: 'ALEX' })).rejects.toThrow('already has this name');
  });

  it('edits a profile and bumps updatedAt', async () => {
    const p = await createPlayer(db, alex);
    const u = await updatePlayer(db, p.id, { ...alex, name: 'Alexa', color: 'teal', hideFromStats: true });
    expect(u).toMatchObject({ id: p.id, name: 'Alexa', color: 'teal', hideFromStats: true, createdAt: p.createdAt });
    expect(u.updatedAt).toBeGreaterThan(p.updatedAt);
  });

  it('keeps the same name valid when editing yourself', async () => {
    const p = await createPlayer(db, alex);
    await expect(updatePlayer(db, p.id, { ...alex, emoji: '🐢' })).resolves.toMatchObject({ emoji: '🐢' });
  });

  it('soft-deletes: hidden from the list but the record stays for history', async () => {
    const p = await createPlayer(db, alex);
    await deletePlayer(db, p.id);
    expect(await listPlayers(db)).toEqual([]);
    const stored = await db.players.get(p.id);
    expect(stored?.deletedAt).not.toBeNull();
    expect(stored?.name).toBe('Alex');
    // The name is free again once deleted.
    await expect(createPlayer(db, alex)).resolves.toBeTruthy();
  });

  it('lists saved players only, sorted by name', async () => {
    await createPlayer(db, { ...alex, name: 'sam' });
    await createPlayer(db, { ...alex, name: 'Alex' });
    await db.players.add(newRecord({ name: 'Guest', emoji: '🙂', color: 'blue' as const, hideFromStats: false, isGuest: true }));
    expect((await listPlayers(db)).map((p) => p.name)).toEqual(['Alex', 'sam']);
  });

  it('suggests the first unused palette color', () => {
    expect(suggestColor([])).toBe('red');
    expect(suggestColor([{ color: 'red' }, { color: 'green' }])).toBe('blue');
  });

  it('counts finished games per player', async () => {
    const p = await createPlayer(db, alex);
    const mk = (status: Match['status']) =>
      newRecord<Omit<Match, keyof import('../../domain/types').BaseRecord>>({
        gameKey: 'parcheesi', status, startedAt: 0, endedAt: 0, pausedDurationMs: 0, pausedAt: null,
        settings: {}, notes: '', endedEarly: false,
      });
    const finished = mk('finished');
    const inProgress = mk('inProgress');
    await db.matches.bulkAdd([finished, inProgress]);
    const seat = (matchId: string) =>
      newRecord<Omit<MatchPlayer, keyof import('../../domain/types').BaseRecord>>({
        matchId, playerId: p.id, seatOrder: 0, color: 'red', target: null, finalScore: null,
        placement: 1, marginPastTarget: null, isWinner: true, details: {},
      });
    await db.matchPlayers.bulkAdd([seat(finished.id), seat(inProgress.id)]);
    expect((await gamesPlayedByPlayer(db)).get(p.id)).toBe(1);
  });
});
