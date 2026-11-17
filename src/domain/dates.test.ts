import { describe, expect, it } from 'vitest';
import { relativeDay } from './dates';

// Local dates, so the test works in any time zone.
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const now = at(2026, 11, 17, 21); // Tuesday

describe('relativeDay', () => {
  it('labels recent days', () => {
    expect(relativeDay(at(2026, 11, 17, 8), now)).toBe('Today');
    expect(relativeDay(at(2026, 11, 16, 23), now)).toBe('Yesterday');
    expect(relativeDay(at(2026, 11, 14), now)).toBe('Sat');
  });
  it('uses the date after a week', () => {
    expect(relativeDay(at(2026, 11, 10), now)).toBe('Nov 10');
    expect(relativeDay(at(2025, 12, 31), now)).toBe('Dec 31, 2025');
  });
});
