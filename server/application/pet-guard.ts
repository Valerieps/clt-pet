import type { Context } from './context';

/** True when every id is a chefe that is not retired. */
export function petsExist(ctx: Context, ids: readonly string[]): boolean {
  return ids.every((id) => ctx.sql.all('SELECT 1 FROM pets WHERE id = ? AND retired_at IS NULL', id).length > 0);
}
