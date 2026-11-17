import { describe, expect, it } from 'vitest';
import { resultLine } from './summary';
import type { MatchBundle } from '../db/repos/matches';

const seat = (name: string, isWinner: boolean) => ({ mp: { isWinner }, player: { name } }) as unknown as MatchBundle['seats'][0];
const bundle = (...seats: MatchBundle['seats']) => ({ match: {}, seats }) as unknown as MatchBundle;

describe('resultLine', () => {
  it('names the winner', () => {
    expect(resultLine(bundle(seat('Sam', true), seat('Alex', false)))).toBe('Sam won · 2 players');
  });
  it('names a shared win (A-6)', () => {
    expect(resultLine(bundle(seat('Alex', true), seat('Sam', true), seat('Jo', false)))).toBe('Shared win · Alex and Sam');
    expect(resultLine(bundle(seat('A', true), seat('B', true), seat('C', true)))).toBe('Shared win · A, B and C');
  });
});
