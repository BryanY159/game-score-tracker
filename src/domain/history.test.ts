import { describe, expect, it } from 'vitest';
import { filterHistory, groupByPeriod } from './history';
import type { MatchBundle } from '../db/repos/matches';

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 20).getTime();
const game = (id: string, gameKey: string, endedAt: number, playerIds: string[]) =>
  ({
    match: { id, gameKey, endedAt, updatedAt: endedAt },
    seats: playerIds.map((p) => ({ player: { id: p }, mp: {} })),
  }) as unknown as MatchBundle;

const now = at(2026, 11, 17);
const games = [
  game('a', 'parcheesi', at(2026, 11, 17), ['alex', 'sam']),
  game('b', 'monopoly', at(2026, 11, 12), ['sam', 'riley']),
  game('c', 'parcheesi', at(2026, 11, 2), ['alex', 'riley']),
  game('d', 'parcheesi', at(2026, 10, 30), ['jo', 'sam']),
  game('e', 'parcheesi', at(2025, 11, 30), ['alex', 'jo']),
];

describe('history (FR-13 AC-1)', () => {
  it('filters by game and by player', () => {
    const ids = (f: Parameters<typeof filterHistory>[1]) => filterHistory(games, f).map((g) => g.match.id);
    expect(ids({ gameKey: null, playerId: null })).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(ids({ gameKey: 'monopoly', playerId: null })).toEqual(['b']);
    expect(ids({ gameKey: null, playerId: 'riley' })).toEqual(['b', 'c']);
    expect(ids({ gameKey: 'parcheesi', playerId: 'alex' })).toEqual(['a', 'c', 'e']);
  });

  it('groups newest first by period', () => {
    const groups = groupByPeriod([...games].reverse(), now);
    expect(groups.map((g) => [g.label, g.items.map((i) => i.match.id)])).toEqual([
      ['This week', ['a', 'b']],
      ['Earlier in November', ['c']],
      ['October 2026', ['d']],
      ['November 2025', ['e']],
    ]);
  });
});
