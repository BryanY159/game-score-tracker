import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ScoreDb } from '../schema';
import { createMatch } from './matches';
import { confirmDraft, listRounds, reopenLastRound, saveDraft, updateRound } from './rounds';
import { blitzEntry } from '../../games/dutchBlitz/scoring';

let db: ScoreDb;
beforeEach(() => {
  db = new ScoreDb(`rounds-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await db.delete();
});

const game = () =>
  createMatch(db, 'dutchBlitz', [
    { playerId: null, emoji: '🙂', color: 'red', target: 75 },
    { playerId: null, emoji: '🙂', color: 'blue', target: 90 },
  ]);

describe('rounds repo (FR-9, FR-5 AC-4)', () => {
  it('saves the draft on every change, then confirms it', async () => {
    const m = await game();
    await saveDraft(db, m.id, [blitzEntry('a', { dutch: 3, blitz: 0 })]);
    await saveDraft(db, m.id, [blitzEntry('a', { dutch: 4, blitz: 0 })]);
    let rounds = await listRounds(db, m.id);
    expect(rounds).toHaveLength(1);
    expect(rounds[0]).toMatchObject({ number: 1, confirmed: false });
    await confirmDraft(db, m.id, [blitzEntry('a', { dutch: 5, blitz: 0 })]);
    await saveDraft(db, m.id, []);
    rounds = await listRounds(db, m.id);
    expect(rounds.map((r) => [r.number, r.confirmed, r.entries[0]?.score ?? null])).toEqual([
      [1, true, 5],
      [2, false, null],
    ]);
  });

  it('stores targets per player (FR-3 AC-2)', async () => {
    const m = await game();
    const mps = await db.matchPlayers.where('matchId').equals(m.id).sortBy('seatOrder');
    expect(mps.map((x) => x.target)).toEqual([75, 90]);
  });

  it('undo reopens the last confirmed round and drops the blank draft', async () => {
    const m = await game();
    await confirmDraft(db, m.id, [blitzEntry('a', { dutch: 5, blitz: 0 })]);
    await confirmDraft(db, m.id, [blitzEntry('a', { dutch: 7, blitz: 1 })]);
    await saveDraft(db, m.id, []);
    await reopenLastRound(db, m.id);
    const rounds = await listRounds(db, m.id);
    expect(rounds.map((r) => [r.number, r.confirmed])).toEqual([
      [1, true],
      [2, false],
    ]);
    expect(rounds[1]!.entries[0]!.score).toBe(5);
  });

  it('edits a past round', async () => {
    const m = await game();
    await confirmDraft(db, m.id, [blitzEntry('a', { dutch: 5, blitz: 0 })]);
    const [r] = await listRounds(db, m.id);
    await updateRound(db, r!.id, [blitzEntry('a', { dutch: 9, blitz: 1 })]);
    expect((await listRounds(db, m.id))[0]!.entries[0]!.score).toBe(7);
  });
});
