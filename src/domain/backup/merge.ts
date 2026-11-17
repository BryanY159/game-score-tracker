import type { BaseRecord, Player } from '../types';
import type { BackupTables } from './format';

/**
 * FR-16 merge: per record, by id.
 *  - not here: added;
 *  - here and identical: skipped;
 *  - here and different: the newer `updatedAt` wins. A tie keeps this
 *    device's copy, so a merge can never flip-flop;
 *  - deletions carry over, because a soft delete is just a newer version
 *    with `deletedAt` set.
 * Settings are left alone: they're this device's preferences, not game data.
 * Running the same merge twice changes nothing the second time.
 */
export const MERGED_TABLES = ['players', 'matches', 'matchPlayers', 'rounds', 'turnLogs'] as const;
export type MergedTable = (typeof MERGED_TABLES)[number];

export interface MergePlan {
  add: Record<MergedTable, BaseRecord[]>;
  update: Record<MergedTable, BaseRecord[]>;
  counts: {
    newGames: number;
    newPlayers: number;
    /** Same record on both devices, edited on both; the incoming copy is newer and replaces this one. */
    conflictsTakingIncoming: number;
    /** Same record on both, edited on both; this device's copy is newer (or equal) and is kept. */
    conflictsKeepingLocal: number;
    added: number;
    unchanged: number;
  };
}

/** Stable comparison of two records (key order doesn't matter). */
export function sameRecord(a: unknown, b: unknown): boolean {
  return stable(a) === stable(b);
}
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object')
    return `{${Object.keys(v as object)
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  return JSON.stringify(v);
}

export function planMerge(local: Pick<BackupTables, MergedTable>, incoming: Pick<BackupTables, MergedTable>): MergePlan {
  const add = {} as MergePlan['add'];
  const update = {} as MergePlan['update'];
  const counts = { newGames: 0, newPlayers: 0, conflictsTakingIncoming: 0, conflictsKeepingLocal: 0, added: 0, unchanged: 0 };
  for (const t of MERGED_TABLES) {
    const here = new Map<string, BaseRecord>((local[t] as BaseRecord[]).map((r) => [r.id, r]));
    add[t] = [];
    update[t] = [];
    for (const r of incoming[t] as BaseRecord[]) {
      const mine = here.get(r.id);
      if (!mine) {
        add[t].push(r);
        counts.added++;
        if (t === 'matches' && (r as unknown as { status: string }).status === 'finished' && r.deletedAt === null) counts.newGames++;
        if (t === 'players' && !(r as unknown as Player).isGuest && r.deletedAt === null) counts.newPlayers++;
      } else if (sameRecord(mine, r)) {
        counts.unchanged++;
      } else if (r.updatedAt > mine.updatedAt) {
        update[t].push(r);
        counts.conflictsTakingIncoming++;
      } else {
        counts.conflictsKeepingLocal++;
      }
    }
  }
  return { add, update, counts };
}

/** AC-4: saved players with the same name but different ids, after a merge ("Merge these?"). */
export function sameNamePairs(players: Player[]): [Player, Player][] {
  const live = players.filter((p) => p.deletedAt === null && !p.isGuest);
  const pairs: [Player, Player][] = [];
  for (let i = 0; i < live.length; i++)
    for (let j = i + 1; j < live.length; j++)
      if (live[i]!.name.localeCompare(live[j]!.name, undefined, { sensitivity: 'base' }) === 0) pairs.push([live[i]!, live[j]!]);
  return pairs;
}
