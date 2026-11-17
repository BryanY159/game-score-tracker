import { db, TABLES } from '../db/schema';

type Seed = Partial<Record<(typeof TABLES)[number], unknown[]>>;

declare global {
  interface Window {
    __test?: {
      reset: () => Promise<void>;
      seed: (data: Seed) => Promise<void>;
      ready: boolean;
    };
  }
}

/** Synthetic data only (CLAUDE.md: never commit user data). */
export function installTestHooks() {
  window.__test = {
    ready: true,
    async reset() {
      await db.transaction('rw', db.tables, async () => {
        await Promise.all(db.tables.map((t) => t.clear()));
      });
    },
    async seed(data) {
      await db.transaction('rw', db.tables, async () => {
        for (const [name, rows] of Object.entries(data)) {
          if (rows?.length) await db.table(name).bulkPut(rows);
        }
      });
    },
  };
}
