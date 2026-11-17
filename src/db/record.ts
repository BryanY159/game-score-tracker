import type { BaseRecord } from '../domain/types';

/** Every write goes through these helpers so NFR-5 fields are never forgotten. */

export function newId(): string {
  return crypto.randomUUID();
}

export function newRecord<T extends object>(fields: T, now: number = Date.now()): T & BaseRecord {
  return { ...fields, id: newId(), createdAt: now, updatedAt: now, deletedAt: null };
}

export function touch<T extends BaseRecord>(record: T, changes: Partial<Omit<T, keyof BaseRecord>> = {}, now: number = Date.now()): T {
  return { ...record, ...changes, updatedAt: Math.max(now, record.updatedAt + 1) };
}

export function softDelete<T extends BaseRecord>(record: T, now: number = Date.now()): T {
  const at = Math.max(now, record.updatedAt + 1);
  return { ...record, deletedAt: at, updatedAt: at };
}

export function isLive(record: BaseRecord): boolean {
  return record.deletedAt === null;
}
