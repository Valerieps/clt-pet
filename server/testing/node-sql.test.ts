import { describe, expect, it } from 'vitest';
import { memorySql } from './node-sql';

describe('memorySql', () => {
  it('refuses a compound SELECT the Durable Object would refuse (more than 5 terms)', () => {
    const sql = memorySql();
    const terms = (n: number) => Array.from({ length: n }, (_, i) => `SELECT ${i}`).join(' UNION ALL ');
    expect(sql.all(terms(5))).toHaveLength(5);
    expect(() => sql.all(terms(6))).toThrow(/too many terms in compound SELECT/);
  });
});
