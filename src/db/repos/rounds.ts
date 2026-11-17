import type { ScoreDb } from '../schema';
import { newRecord, softDelete, touch } from '../record';
import type { Round, RoundEntry } from '../../domain/types';

export async function listRounds(db: ScoreDb, matchId: string): Promise<Round[]> {
  return (await db.rounds.where('matchId').equals(matchId).toArray())
    .filter((r) => r.deletedAt === null)
    .sort((a, b) => a.number - b.number);
}

/** The round being entered: saved on every tap so nothing is lost (R-7). */
export async function saveDraft(
  db: ScoreDb,
  matchId: string,
  entries: RoundEntry[],
  dealerPlayerId: string | null = null,
  now: number = Date.now(),
): Promise<Round> {
  return db.transaction('rw', db.rounds, async () => {
    const rounds = await listRounds(db, matchId);
    const draft = rounds.find((r) => !r.confirmed);
    if (draft) {
      const next = touch(draft, { entries, dealerPlayerId }, now);
      await db.rounds.put(next);
      return next;
    }
    const number = (rounds[rounds.length - 1]?.number ?? 0) + 1;
    const r: Round = newRecord({ matchId, number, dealerPlayerId, entries, confirmed: false }, now);
    await db.rounds.add(r);
    return r;
  });
}

/** FR-9 AC-2: Confirm Round adds it to the totals. */
export async function confirmDraft(db: ScoreDb, matchId: string, entries: RoundEntry[], now: number = Date.now()): Promise<void> {
  await db.transaction('rw', db.rounds, async () => {
    const draft = await saveDraft(db, matchId, entries, null, now);
    await db.rounds.put(touch(draft, { confirmed: true }, now));
  });
}

/**
 * FR-5 AC-4 for rounds games: the most recent entry is the last confirmed
 * round. Undo reopens it for entry (the current blank draft is dropped).
 */
export async function reopenLastRound(db: ScoreDb, matchId: string, now: number = Date.now()): Promise<void> {
  await db.transaction('rw', db.rounds, async () => {
    const rounds = await listRounds(db, matchId);
    const last = [...rounds].reverse().find((r) => r.confirmed);
    if (!last) return;
    for (const d of rounds.filter((r) => !r.confirmed)) await db.rounds.put(softDelete(d, now));
    await db.rounds.put(touch(last, { confirmed: false }, now));
  });
}

/** FR-5 AC-4: any past round can be opened and edited. */
export async function updateRound(db: ScoreDb, roundId: string, entries: RoundEntry[], now: number = Date.now()): Promise<void> {
  await db.transaction('rw', db.rounds, async () => {
    const r = await db.rounds.get(roundId);
    if (!r || r.deletedAt !== null) throw new Error('Round not found');
    await db.rounds.put(touch(r, { entries }, now));
  });
}
