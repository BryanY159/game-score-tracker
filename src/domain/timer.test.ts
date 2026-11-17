import { describe, expect, it } from 'vitest';
import { elapsedMs, formatClock, formatLength } from './timer';

const base = { startedAt: 1_000_000, endedAt: null, pausedDurationMs: 0, pausedAt: null };

describe('game timer (FR-3 AC-4, FR-5 AC-1)', () => {
  it('counts from the start', () => {
    expect(elapsedMs(base, 1_000_000 + 90_000)).toBe(90_000);
  });
  it('leaves out paused time', () => {
    expect(elapsedMs({ ...base, pausedDurationMs: 30_000 }, 1_000_000 + 90_000)).toBe(60_000);
  });
  it('stands still while paused', () => {
    const paused = { ...base, pausedAt: 1_000_000 + 40_000 };
    expect(elapsedMs(paused, 1_000_000 + 999_000)).toBe(40_000);
  });
  it('stops at the end', () => {
    expect(elapsedMs({ ...base, endedAt: 1_000_000 + 60_000 }, 9_999_999_999)).toBe(60_000);
  });
  it('handles a clock jump after iOS suspends the app (R-6)', () => {
    expect(elapsedMs(base, 1_000_000 + 3 * 3600_000)).toBe(3 * 3600_000);
  });
  it('formats', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(1934_000)).toBe('32:14');
    expect(formatClock(3909_000)).toBe('1:05:09');
    expect(formatLength(48 * 60_000)).toBe('48 min');
    expect(formatLength(82 * 60_000)).toBe('1 h 22 min');
    expect(formatLength(120 * 60_000)).toBe('2 h');
  });
});
