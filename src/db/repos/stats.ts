import type { ScoreDb } from '../schema';
import { readSettings } from './settings';
import { elapsedMs } from '../../domain/timer';
import type { GameRecord, StatPlayer } from '../../domain/stats';

/**
 * Everything Stats needs. Players in stats are saved profiles that aren't
 * deleted, guests or hidden from stats (FR-2 AC-2, AC-3); their games still
 * count for the other players.
 */
export async function loadStats(db: ScoreDb): Promise<{ records: GameRecord[]; players: StatPlayer[]; minGames: number }> {
  const [matches, mps, rounds, players, settings] = await Promise.all([
    db.matches.where('status').equals('finished').toArray(),
    db.matchPlayers.toArray(),
    db.rounds.toArray(),
    db.players.toArray(),
    readSettings(db),
  ]);
  const live = matches.filter((m) => m.deletedAt === null);
  const records: GameRecord[] = live.map((m) => ({
    matchId: m.id,
    gameKey: m.gameKey,
    endedAt: m.endedAt ?? m.updatedAt,
    lengthMs: elapsedMs(m),
    rounds: rounds.filter((r) => r.matchId === m.id && r.confirmed && r.deletedAt === null).length,
    seats: mps
      .filter((mp) => mp.matchId === m.id && mp.deletedAt === null)
      .map((mp) => ({
        playerId: mp.playerId,
        placement: mp.placement,
        isWinner: mp.isWinner,
        finalScore: mp.finalScore,
        marginPastTarget: mp.marginPastTarget,
        target: mp.target,
        details: mp.details,
      })),
  }));
  return {
    records,
    players: players
      .filter((p) => p.deletedAt === null && !p.isGuest && !p.hideFromStats)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({ id: p.id, name: p.name })),
    minGames: settings.statsMinGames,
  };
}
