import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ScoreDb } from '../schema';
import { appendTurn, deleteTurnLog, editTurn, getTurnLog, undoTurn } from './turnLogs';

let db: ScoreDb;
beforeEach(() => {
  db = new ScoreDb(`turns-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await db.delete();
});

describe('turn log (FR-7)', () => {
  it('records, undoes and edits turns', async () => {
    await appendTurn(db, 'm', { playerId: 'a', action: 'route', routeLength: 4 }, 100);
    await appendTurn(db, 'm', { playerId: 'b', action: 'drawTrains' }, 200);
    await appendTurn(db, 'm', { playerId: 'c', action: 'drawTickets' }, 300);
    await undoTurn(db, 'm');
    await editTurn(db, 'm', 1, { action: 'route', routeLength: 2 });
    await editTurn(db, 'm', 0, { action: 'drawTrains' });
    expect((await getTurnLog(db, 'm'))!.entries).toEqual([
      { playerId: 'a', action: 'drawTrains', routeLength: undefined, at: 100 },
      { playerId: 'b', action: 'route', routeLength: 2, at: 200 },
    ]);
  });

  it('is deleted on finalize (AC-8), as a soft delete', async () => {
    await appendTurn(db, 'm', { playerId: 'a', action: 'drawTrains' });
    await deleteTurnLog(db, 'm');
    expect(await getTurnLog(db, 'm')).toBeNull();
    const [row] = await db.turnLogs.toArray();
    expect(row).toMatchObject({ entries: [], deletedAt: expect.any(Number) });
  });
});
