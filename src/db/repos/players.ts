import type { ScoreDb } from '../schema';
import { newRecord, softDelete, touch } from '../record';
import { PALETTE } from '../../domain/colors';
import type { PaletteColor, Player } from '../../domain/types';

export type PlayerInput = Pick<Player, 'name' | 'emoji' | 'color' | 'hideFromStats'>;

export const MAX_NAME_LENGTH = 24;

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/** Saved profiles: not deleted, not guests, sorted by name (FR-2). */
export async function listPlayers(db: ScoreDb): Promise<Player[]> {
  const all = await db.players.toArray();
  return all
    .filter((p) => p.deletedAt === null && !p.isGuest)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export class PlayerValidationError extends Error {}

async function validate(db: ScoreDb, input: PlayerInput, selfId?: string): Promise<PlayerInput> {
  const name = normalizeName(input.name);
  if (!name) throw new PlayerValidationError('Enter a name');
  if (name.length > MAX_NAME_LENGTH) throw new PlayerValidationError(`Use ${MAX_NAME_LENGTH} characters or fewer`);
  if (!input.emoji) throw new PlayerValidationError('Pick an emoji');
  if (!PALETTE.includes(input.color)) throw new PlayerValidationError('Pick a color');
  const clash = (await listPlayers(db)).find(
    (p) => p.id !== selfId && p.name.localeCompare(name, undefined, { sensitivity: 'base' }) === 0,
  );
  if (clash) throw new PlayerValidationError('A player already has this name');
  return { ...input, name };
}

export async function createPlayer(db: ScoreDb, input: PlayerInput): Promise<Player> {
  const valid = await validate(db, input);
  const player: Player = newRecord({ ...valid, isGuest: false });
  await db.players.add(player);
  return player;
}

export async function updatePlayer(db: ScoreDb, id: string, input: PlayerInput): Promise<Player> {
  const existing = await db.players.get(id);
  if (!existing || existing.deletedAt !== null) throw new PlayerValidationError('Player not found');
  const valid = await validate(db, input, id);
  const updated = touch(existing, valid);
  await db.players.put(updated);
  return updated;
}

/** Soft delete: past games keep pointing at this record (FR-2 AC-1). */
export async function deletePlayer(db: ScoreDb, id: string): Promise<void> {
  const existing = await db.players.get(id);
  if (!existing || existing.deletedAt !== null) return;
  await db.players.put(softDelete(existing));
}

/** First palette color no saved player uses yet, so new profiles start distinct. */
export function suggestColor(players: Pick<Player, 'color'>[]): PaletteColor {
  const used = new Set(players.map((p) => p.color));
  return PALETTE.find((c) => !used.has(c)) ?? PALETTE[players.length % PALETTE.length]!;
}

/** Games played per player: finished matches only. */
export async function gamesPlayedByPlayer(db: ScoreDb): Promise<Map<string, number>> {
  const finished = new Set(
    (await db.matches.where('status').equals('finished').toArray()).filter((m) => m.deletedAt === null).map((m) => m.id),
  );
  const counts = new Map<string, number>();
  for (const mp of await db.matchPlayers.toArray()) {
    if (mp.deletedAt !== null || !finished.has(mp.matchId)) continue;
    counts.set(mp.playerId, (counts.get(mp.playerId) ?? 0) + 1);
  }
  return counts;
}
