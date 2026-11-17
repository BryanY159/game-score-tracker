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
