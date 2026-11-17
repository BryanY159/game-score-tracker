import { describe, expect, it, vi } from 'vitest';

vi.mock('virtual:pwa-register', () => ({ registerSW: () => () => Promise.resolve() }));
const { isSafeToReload } = await import('./register');

describe('update reload guard (plan R-4)', () => {
  it('reloads on tab screens', () => {
    expect(isSafeToReload('')).toBe(true);
    expect(isSafeToReload('#/')).toBe(true);
    expect(isSafeToReload('#/history')).toBe(true);
  });
  it('waits while a game screen is open', () => {
    expect(isSafeToReload('#/play/abc')).toBe(false);
  });
});
