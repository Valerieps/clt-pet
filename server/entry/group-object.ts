// The one Durable Object that holds the whole group (ADR-004): its SQLite database, and the live
// WebSocket connections of every open app. Calls are processed one at a time, so each command
// runs alone; its writes commit in one transaction.
import { DurableObject } from 'cloudflare:workers';
import type { LiveMessage, Topic } from '../../src/application/api-contract';
import { GroupService } from '../application/group-service';
import type { GoogleProfile, SignInResult } from '../application/members';
import { durableObjectSql } from '../infrastructure/durable-object-sql';
import { sendWebPush } from '../infrastructure/web-push';
import type { Env } from './env';

export const SESSION_HASH_HEADER = 'x-app-session-hash';

export class Group extends DurableObject<Env> {
  private readonly service: GroupService;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.service = new GroupService(
      durableObjectSql(ctx.storage),
      { now: () => new Date() },
      { next: () => crypto.randomUUID() },
      undefined,
      env.VAPID_PRIVATE_KEY ? env.VAPID_PUBLIC_KEY : null,
    );
    void ctx.blockConcurrencyWhile(async () => this.service.migrate());
  }

  signIn(profile: GoogleProfile, sessionHash: string, bootstrapAdminEmails: string[]): SignInResult {
    return this.service.signIn(profile, sessionHash, bootstrapAdminEmails);
  }

  signOut(sessionHash: string): void {
    this.service.signOut(sessionHash);
  }

  query(sessionHash: string, name: string, input: unknown) {
    return this.service.query(sessionHash, name, input);
  }

  photo(sessionHash: string, petId: string): string | null {
    return this.service.photo(sessionHash, petId);
  }

  command(sessionHash: string, name: string, input: unknown) {
    const result = this.service.command(sessionHash, name, input);
    if (result.ok && result.changed.length > 0) this.broadcast(result.changed);
    // A removed member's open apps lose the live connection now; their sessions are already gone.
    if (result.ok) for (const memberId of result.disconnect ?? []) this.disconnect(memberId);
    return result;
  }

  async tick(): Promise<void> {
    const { changed, pushes } = this.service.tick();
    if (changed.length > 0) this.broadcast(changed);
    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = this.env;
    if (pushes.length === 0 || !VAPID_PRIVATE_KEY) return;
    const vapid = { publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY, subject: VAPID_SUBJECT };
    const results = await Promise.all(pushes.map(async (push) => ({ push, result: await sendWebPush(push, vapid) })));
    // 404 and 410 mean the device unsubscribed or was reset: forget it.
    this.service.dropDevices(results.filter(({ result }) => result === 'gone').map(({ push }) => push.endpoint));
  }

  /** Live connection: the Worker already checked the origin and passes the session hash. */
  override async fetch(request: Request): Promise<Response> {
    const member = this.service.memberForSession(request.headers.get(SESSION_HASH_HEADER) ?? '');
    if (!member) return new Response(null, { status: 401 });
    const pair = new WebSocketPair();
    // Hibernation API: idle connections cost nothing; the tag finds a member's sockets.
    this.ctx.acceptWebSocket(pair[1], [member.id]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  override webSocketMessage(): void {
    // The app never sends anything but keep-alives; commands go through HTTP.
  }

  override webSocketClose(ws: WebSocket, code: number): void {
    ws.close(code === 1005 ? 1000 : code);
  }

  private disconnect(memberId: string): void {
    for (const ws of this.ctx.getWebSockets(memberId)) {
      try {
        ws.close(4401, 'removed');
      } catch {
        // Already closing.
      }
    }
  }

  private broadcast(topics: readonly Topic[]): void {
    const message: LiveMessage = { type: 'changed', topics };
    const text = JSON.stringify(message);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(text);
      } catch {
        // A closing socket; the app reconnects and refetches on its own.
      }
    }
  }
}
