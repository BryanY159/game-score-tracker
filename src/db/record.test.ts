import { describe, expect, it } from 'vitest';
import { isLive, newRecord, softDelete, touch } from './record';

describe('record helpers (NFR-5)', () => {
  it('newRecord sets a uuid and timestamps', () => {
    const r = newRecord({ name: 'Alex' }, 1000);
    expect(r.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(r).toMatchObject({ name: 'Alex', createdAt: 1000, updatedAt: 1000, deletedAt: null });
  });

  it('gives every record a unique id', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newRecord({}).id));
    expect(ids.size).toBe(200);
  });

  it('touch applies changes and bumps updatedAt', () => {
    const r = newRecord({ name: 'Alex' }, 1000);
    const t = touch(r, { name: 'Sam' }, 2000);
    expect(t).toMatchObject({ name: 'Sam', createdAt: 1000, updatedAt: 2000, id: r.id });
  });

  it('touch always moves updatedAt forward, even if the clock did not', () => {
    const r = newRecord({}, 5000);
    expect(touch(r, {}, 4000).updatedAt).toBe(5001);
  });

  it('softDelete sets deletedAt and updatedAt', () => {
    const r = newRecord({}, 1000);
    const d = softDelete(r, 3000);
    expect(d.deletedAt).toBe(3000);
    expect(d.updatedAt).toBe(3000);
    expect(isLive(r)).toBe(true);
    expect(isLive(d)).toBe(false);
  });
});
