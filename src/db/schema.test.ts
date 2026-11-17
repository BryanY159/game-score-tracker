import { afterEach, describe, expect, it } from 'vitest';
import { ScoreDb, TABLES } from './schema';
import { getSettings } from './repos/settings';

let db: ScoreDb;
afterEach(async () => {
  await db.delete();
});

describe('Dexie schema v1', () => {
  it('opens with every table', async () => {
    db = new ScoreDb('schema-test');
    await db.open();
    expect(db.tables.map((t) => t.name).sort()).toEqual([...TABLES].sort());
    expect(db.verno).toBe(1);
  });

  it('creates the Settings singleton with defaults once', async () => {
    db = new ScoreDb('settings-test');
    const a = await getSettings(db);
    const b = await getSettings(db);
    expect(a).toEqual(b);
    expect(a.statsMinGames).toBe(5);
    expect(await db.settings.count()).toBe(1);
  });
});

describe('readSettings', () => {
  it('returns defaults without writing when missing', async () => {
    const { readSettings } = await import('./repos/settings');
    db = new ScoreDb('read-settings-test');
    expect((await readSettings(db)).statsMinGames).toBe(5);
    expect(await db.settings.count()).toBe(0);
  });
});
