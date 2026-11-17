import { player } from './players';
import { match, NOW } from './matches';
import type { BackupFile } from '../../src/domain/backup/format';

/**
 * The "iPad": its own Alex (a different profile with the same name), plus Pat,
 * and two finished Parcheesi games. Synthetic data only.
 */
const IPAD_ALEX = player('Alex', '🦁', 'orange');
const PAT = player('Pat', '🐸', 'green');

function done(endedAt: number) {
  const g = match('parcheesi', [{ player: IPAD_ALEX, color: 'red' }, { player: PAT, color: 'blue' }], { status: 'finished', startedAt: endedAt - 30 * 60_000, endedAt });
  g.matchPlayers.forEach((mp, i) => {
    mp.placement = i + 1;
    mp.isWinner = i === 0;
    mp.details = { pawnsHome: i === 0 ? 4 : 2, tripleDoublets: 0 };
  });
  return g;
}
const games = [done(NOW - 3 * 86400_000), done(NOW - 2 * 86400_000)];

export const IPAD_FILE: BackupFile = {
  app: 'game-score-tracker',
  schemaVersion: 1,
  exportedAt: NOW - 3600_000,
  tables: {
    players: [IPAD_ALEX, PAT],
    matches: games.flatMap((g) => g.matches),
    matchPlayers: games.flatMap((g) => g.matchPlayers),
    rounds: [],
    turnLogs: [],
    settings: [],
  },
};
