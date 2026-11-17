import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ScoreDb } from '../schema';
import { createPlayer } from './players';
import {
  appendEvent,
  cancelMatch,
  createMatch,
  finalizeMatch,
  getMatchBundle,
  listInProgress,
  listRecentFinished,
  pauseMatch,
  resumeMatch,
  setNotes,
  saveFinishedEdit,
  undoLastEvent,
} from './matches';

let db: ScoreDb;
beforeEach(() => {
  db = new ScoreDb(`matches-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await db.delete();
});

async function twoPlayerGame() {
  const alex = await createPlayer(db, { name: 'Alex', emoji: '🦊', color: 'red', hideFromStats: false });
  const match = await createMatch(
    db,
    'parcheesi',
    [
      { playerId: alex.id, emoji: '🦊', color: 'red' },
      { playerId: null, guestName: 'Pat', emoji: '🙂', color: 'blue' },
    ],
    {},
    5000,
  );
  return { alex, match };
}

describe('matches repo', () => {
  it('starts a game with seats in turn order and the timer running (FR-3)', async () => {
    const { alex, match } = await twoPlayerGame();
    expect(match).toMatchObject({ status: 'inProgress', startedAt: 5000, pausedDurationMs: 0, log: [] });
    const b = (await getMatchBundle(db, match.id))!;
    expect(b.seats.map((s) => s.player.name)).toEqual(['Alex', 'Pat']);
    expect(b.seats[0]!.player.id).toBe(alex.id);
    expect(b.seats.map((s) => s.mp.color)).toEqual(['red', 'blue']);
  });

  it('saves guests as hidden guest profiles (FR-2 AC-3)', async () => {
    const { match } = await twoPlayerGame();
    const b = (await getMatchBundle(db, match.id))!;
    expect(b.seats[1]!.player).toMatchObject({ isGuest: true, hideFromStats: true, name: 'Pat' });
  });

  it('refuses two players with one color (FR-4 AC-3)', async () => {
    await expect(
      createMatch(db, 'parcheesi', [
        { playerId: null, emoji: '🙂', color: 'red' },
        { playerId: null, emoji: '🙂', color: 'red' },
      ]),
    ).rejects.toThrow('share a color');
  });

  it('appends and undoes entries', async () => {
    const { alex, match } = await twoPlayerGame();
    await appendEvent(db, match.id, { type: 'pawns', playerId: alex.id, delta: 1 }, 6000);
    await appendEvent(db, match.id, { type: 'pawns', playerId: alex.id, delta: 1 }, 7000);
    expect((await db.matches.get(match.id))!.log.map((e) => e.at)).toEqual([6000, 7000]);
    await undoLastEvent(db, match.id);
    expect((await db.matches.get(match.id))!.log).toHaveLength(1);
  });

  it('cancel discards the game (FR-5 AC-3)', async () => {
    const { match } = await twoPlayerGame();
    await cancelMatch(db, match.id);
    expect(await getMatchBundle(db, match.id)).toBeNull();
    expect(await listInProgress(db)).toEqual([]);
    expect((await db.matches.get(match.id))!.status).toBe('cancelled');
  });

  it('finalize saves placements and marks the game finished (FR-12 AC-2)', async () => {
    const { match } = await twoPlayerGame();
    const b = (await getMatchBundle(db, match.id))!;
    await finalizeMatch(
      db,
      match.id,
      b.seats.map((s, i) => ({
        matchPlayerId: s.mp.id,
        placement: i + 1,
        finalScore: null,
        marginPastTarget: null,
        isWinner: i === 0,
        details: { pawnsHome: i === 0 ? 4 : 1 },
      })),
      9000,
    );
    const after = (await getMatchBundle(db, match.id))!;
    expect(after.match).toMatchObject({ status: 'finished', endedAt: 9000 });
    expect(after.seats.map((s) => [s.mp.placement, s.mp.isWinner, s.mp.details])).toEqual([
      [1, true, { pawnsHome: 4 }],
      [2, false, { pawnsHome: 1 }],
    ]);
    expect(await listInProgress(db)).toEqual([]);
  });
});

describe('game lifecycle (FR-5)', () => {
  it('pause stops the clock and the paused time is left out (AC-1)', async () => {
    const { match } = await twoPlayerGame(); // started at 5000
    await pauseMatch(db, match.id, 65_000);
    await pauseMatch(db, match.id, 70_000); // already paused: no change
    await resumeMatch(db, match.id, 125_000);
    await pauseMatch(db, match.id, 185_000);
    await resumeMatch(db, match.id, 205_000);
    const m = (await db.matches.get(match.id))!;
    expect(m.pausedAt).toBeNull();
    expect(m.pausedDurationMs).toBe(80_000);
    const { elapsedMs } = await import('../../domain/timer');
    expect(elapsedMs(m, 305_000)).toBe(300_000 - 80_000);
  });

  it('keeps notes (AC-6)', async () => {
    const { match } = await twoPlayerGame();
    await setNotes(db, match.id, 'Doubles roll again');
    expect((await db.matches.get(match.id))!.notes).toBe('Doubles roll again');
  });

  it('lists recent finished games, newest first, skipping cancelled', async () => {
    const a = (await twoPlayerGame()).match;
    const b = await createMatch(db, 'parcheesi', [{ playerId: null, emoji: '🙂', color: 'red' }], {}, 6000);
    const c = await createMatch(db, 'parcheesi', [{ playerId: null, emoji: '🙂', color: 'red' }], {}, 7000);
    await finalizeMatch(db, a.id, [], 10_000);
    await finalizeMatch(db, b.id, [], 20_000);
    await cancelMatch(db, c.id);
    expect((await listRecentFinished(db, 5)).map((x) => x.match.id)).toEqual([b.id, a.id]);
    expect(await listRecentFinished(db, 1)).toHaveLength(1);
  });
});

describe('editing a finished game (FR-12 AC-2, M5)', () => {
  it('changes it in place and it stays finished', async () => {
    const { alex, match } = await twoPlayerGame();
    const b = (await getMatchBundle(db, match.id))!;
    const seat = (i: number, placement: number) => ({
      matchPlayerId: b.seats[i]!.mp.id, placement, finalScore: null, marginPastTarget: null, isWinner: placement === 1, details: {},
    });
    await finalizeMatch(db, match.id, [seat(0, 2), seat(1, 1)], 9000, 10_000);
    const log = [{ type: 'pawns' as const, playerId: alex.id, delta: 1 as const, at: 9000 }];
    await saveFinishedEdit(db, match.id, { log }, [seat(0, 1), seat(1, 2)], 20_000);
    const after = (await getMatchBundle(db, match.id))!;
    expect(after.match).toMatchObject({ status: 'finished', endedAt: 9000, log });
    expect(after.match.updatedAt).toBe(20_000);
    expect(after.seats.map((s) => [s.mp.placement, s.mp.isWinner])).toEqual([[1, true], [2, false]]);
  });

  it('refuses games that are not finished', async () => {
    const { match } = await twoPlayerGame();
    await expect(saveFinishedEdit(db, match.id, {}, [])).rejects.toThrow('Only a finished game');
  });
});
