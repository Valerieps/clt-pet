// The Sql port over node:sqlite, for tests. Same SQLite engine the Durable Object uses.
import { DatabaseSync } from 'node:sqlite';
import type { Clock, IdGenerator, Sql, SqlValue } from '../application/ports';

/** The Durable Object's SQLite allows at most 5 terms in a compound SELECT; node:sqlite allows 500. */
export const MAX_COMPOUND_SELECT = 5;

/** Throws as the Durable Object does on a statement it would refuse but node:sqlite accepts. */
export function checkDurableObjectLimits(query: string): void {
  const terms = (query.match(/\b(UNION|INTERSECT|EXCEPT)\b/gi)?.length ?? 0) + 1;
  if (terms > MAX_COMPOUND_SELECT) throw new Error('too many terms in compound SELECT: SQLITE_ERROR');
}

export function memorySql(): Sql {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  let depth = 0;
  const prepare = (query: string) => {
    checkDurableObjectLimits(query);
    return db.prepare(query);
  };
  return {
    all: <T>(query: string, ...bindings: SqlValue[]) => prepare(query).all(...bindings) as T[],
    run: (query, ...bindings) => {
      prepare(query).run(...bindings);
    },
    transaction: (fn) => {
      if (depth > 0) return fn();
      depth++;
      db.exec('BEGIN');
      try {
        const result = fn();
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      } finally {
        depth--;
      }
    },
  };
}

export function fixedClock(iso: string): Clock & { set(iso: string): void } {
  let now = new Date(iso);
  return { now: () => now, set: (next) => (now = new Date(next)) };
}

export function sequentialIds(): IdGenerator {
  let n = 0;
  return { next: () => `id-${++n}` };
}
