import { describe, expect, it } from 'vitest';
import { celebrationFor, leadChange, standings } from './motion';

describe('lead change (FR-19 AC-2)', () => {
  it('fires when someone new leads alone', () => {
    expect(leadChange(['alex'], ['sam'])).toBe('sam');
    expect(leadChange(['alex', 'sam'], ['sam'])).toBe('sam'); // breaking a tie for first
  });
  it('does not fire for the same leader, a tie, or the first round', () => {
    expect(leadChange(['alex'], ['alex'])).toBeNull();
    expect(leadChange(['alex'], ['alex', 'sam'])).toBeNull();
    expect(leadChange(null, ['alex'])).toBeNull();
    expect(leadChange([], ['alex'])).toBeNull();
  });
});

describe('standings for rounds games', () => {
  it('orders by margin past own target, then total, then seat', () => {
    const s = standings([
      { playerId: 'alex', total: 212, target: 250 },
      { playerId: 'sam', total: 176, target: 200 },
      { playerId: 'jo', total: 190, target: 200 },
      { playerId: 'riley', total: 190, target: 200 },
    ]);
    expect(s.order).toEqual(['jo', 'riley', 'sam', 'alex']);
    expect(s.leaders).toEqual(['jo', 'riley']);
  });
  it('nobody leads before anyone has scored', () => {
    expect(standings([{ playerId: 'a', total: 0, target: 75 }, { playerId: 'b', total: 0, target: 75 }]).leaders).toEqual([]);
  });
});

describe('celebrations', () => {
  it('has one for each moment in AC-2', () => {
    expect(celebrationFor('flip7', 'Jo').text).toBe('Flip 7! Jo +15');
    expect(celebrationFor('leadChange', 'Sam').emoji).toBe('👑');
    expect(celebrationFor('finalRound', 'Alex').text).toContain('Final round!');
    expect(celebrationFor('bankrupt', 'Riley').text).toBe('Riley is bankrupt');
    expect(celebrationFor('allPawnsHome', 'Sam').text).toBe('Sam: all 4 pawns home!');
  });
});
