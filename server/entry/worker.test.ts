import { describe, expect, it, vi } from 'vitest';

// The Workers runtime module does not exist in node: stub only what worker.ts needs.
vi.mock('cloudflare:workers', () => ({
  WorkerEntrypoint: class {
    constructor(
      readonly ctx: unknown,
      readonly env: unknown,
    ) {}
  },
  DurableObject: class {},
}));
vi.mock('./group-object', () => ({ Group: class {}, SESSION_HASH_HEADER: 'x-app-session-hash' }));

import worker, { Cron, runCron } from './worker';

function fakeEnv() {
  const tick = vi.fn(async () => {});
  const env = { GROUP: { idFromName: () => 'id', get: () => ({ tick }) } };
  return { env: env as never, tick };
}

const ctx = {} as ExecutionContext;

describe('cron entry points', () => {
  it('runCron ticks the group', async () => {
    const { env, tick } = fakeEnv();
    await runCron(env, ctx);
    expect(tick).toHaveBeenCalledTimes(1);
  });

  it('scheduled() does the same as runCron', async () => {
    const { env, tick } = fakeEnv();
    await worker.scheduled!({} as ScheduledController, env, ctx);
    expect(tick).toHaveBeenCalledTimes(1);
  });

  it('Cron.tick (RPC) does the same as runCron', async () => {
    const { env, tick } = fakeEnv();
    await new Cron(ctx, env).tick();
    expect(tick).toHaveBeenCalledTimes(1);
  });
});
