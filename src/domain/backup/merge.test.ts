import { describe, expect, it } from 'vitest';
import { planMerge, sameNamePairs, sameRecord } from './merge';
import type { BackupTables } from './format';
import type { Match, Player } from '../types';

const player = (id: string, name: string, updatedAt = 1, extra: Partial<Player> = {}): Player => ({
  id, name, emoji: '🦊', color: 'red', hideFromStats: false, isGuest: false, createdAt: 1, updatedAt, deletedAt: null, ...extra,
});
const matchRow = (id: string, updatedAt = 1, extra: Partial<Match> = {}): Match => ({
  id, gameKey: 'parcheesi', status: 'finished', startedAt: 0, endedAt: 1, pausedDurationMs: 0, pausedAt: null, settings: {}, notes: '', endedEarly: false, log: [],
  createdAt: 1, updatedAt, deletedAt: null, ...extra,
});
const tables = (p: Partial<BackupTables>): Omit<BackupTables, 'settings'> => ({ players: [], matches: [], matchPlayers: [], rounds: [], turnLogs: [], ...p });

describe('merge plan (FR-16 AC-1, AC-2)', () => {
  it('adds what is not here and counts new games and players', () => {
    const p = planMerge(tables({ players: [player('a', 'Alex')] }), tables({ players: [player('a', 'Alex'), player('b', 'Sam'), player('g', 'Guest', 1, { isGuest: true })], matches: [matchRow('m1'), matchRow('m2', 1, { status: 'inProgress' })] }));
    expect(p.add.players.map((r) => r.id)).toEqual(['b', 'g']);
    expect(p.add.matches).toHaveLength(2);
    expect(p.counts).toMatchObject({ newPlayers: 1, newGames: 1, added: 4, unchanged: 1, conflictsTakingIncoming: 0, conflictsKeepingLocal: 0 });
  });

  it('skips records that are already here (matched by id)', () => {
    const p = planMerge(tables({ matches: [matchRow('m1')] }), tables({ matches: [matchRow('m1')] }));
    expect(p.add.matches).toEqual([]);
    expect(p.update.matches).toEqual([]);
  });

  it('where both devices edited a record, the newer updatedAt wins, either way', () => {
    const here = tables({ players: [player('a', 'Alex', 5), player('b', 'Sam', 9)] });
    const there = tables({ players: [player('a', 'Alexander', 7), player('b', 'Samuel', 3)] });
    const p = planMerge(here, there);
    expect(p.update.players.map((r) => (r as Player).name)).toEqual(['Alexander']);
    expect(p.counts).toMatchObject({ conflictsTakingIncoming: 1, conflictsKeepingLocal: 1 });
  });

  it('an exact updatedAt tie keeps this device copy (no flip-flop)', () => {
    const p = planMerge(tables({ players: [player('a', 'Alex', 5)] }), tables({ players: [player('a', 'Al', 5)] }));
    expect(p.update.players).toEqual([]);
    expect(p.counts.conflictsKeepingLocal).toBe(1);
  });

  it('deletions carry over: a newer soft delete replaces the live record', () => {
    const p = planMerge(tables({ matches: [matchRow('m1', 5)] }), tables({ matches: [matchRow('m1', 8, { deletedAt: 8, status: 'cancelled' })] }));
    expect(p.update.matches[0]).toMatchObject({ deletedAt: 8 });
  });

  it('a deleted record here is not brought back by an older live copy', () => {
    const p = planMerge(tables({ matches: [matchRow('m1', 8, { deletedAt: 8 })] }), tables({ matches: [matchRow('m1', 5)] }));
    expect(p.update.matches).toEqual([]);
  });

  it('compares records regardless of key order', () => {
    expect(sameRecord({ a: 1, b: [1, { c: 2, d: 3 }] }, { b: [1, { d: 3, c: 2 }], a: 1 })).toBe(true);
    expect(sameRecord({ a: 1 }, { a: 2 })).toBe(false);
  });
});

describe('same-name players (AC-4)', () => {
  it('pairs saved players with the same name, ignoring case, guests and deleted players', () => {
    const ps = [player('a', 'Alex'), player('b', 'alex'), player('c', 'Sam'), player('d', 'Sam', 1, { isGuest: true }), player('e', 'ALEX', 1, { deletedAt: 1 })];
    expect(sameNamePairs(ps).map(([x, y]) => [x.id, y.id])).toEqual([['a', 'b']]);
  });
});
