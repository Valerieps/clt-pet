// The single entry to the group's data. The Durable Object calls it; every method is synchronous,
// so a command runs alone and inside one transaction (ADR-004).
import type { ApiResult, CommandName, Commands, QueryName, Queries, SitterManualView, Topic } from '../../src/application/api-contract';
import { failure, QueryError, type CommandResult, type Context } from './context';
import { addCare, careReminders, listCare, removeCare } from './care';
import {
  addCondition,
  addVisit,
  listConditions,
  listVisits,
  removeCondition,
  removeVisit,
  resolveCondition,
  visitReminders,
} from './health';
import { addDiary, addMeal, listDiary, listMeals, removeDiary, removeMeal } from './routine';
import { createSitterLink, listSitterLinks, revokeSitterLink, sitterManual, sitterPhoto } from './sitter';
import { createInvite, listInvites, revokeInvite } from './invites';
import {
  listMembers,
  me,
  memberForSession,
  removeMember,
  rename,
  setRoles,
  signIn,
  signOut,
  type GoogleProfile,
  type Member,
  type SignInResult,
} from './members';
import type { Clock, IdGenerator, Sql } from './ports';
import {
  addWeight,
  createPet,
  lendTutoria,
  linkTutor,
  listPets,
  listRetiredPets,
  photoOf,
  removeWeight,
  retirePet,
  returnTutorias,
  setEmergency,
  setPhoto,
  setTags,
  setTutor,
  updatePet,
} from './pets';
import { dropDevices, pushInfo, subscribe, unsubscribe } from './push';
import { planReminders, type PushMessage, type ReminderSource } from './reminders';
import { migrate } from './schema';
import { addMedication, listMedications, removeMedication } from './medications';
import { addVaccination, listVaccinations, removeVaccination, vaccineReminders } from './vaccines';

/** The features with due dates register here. */
const REMINDER_SOURCES: readonly ReminderSource[] = [vaccineReminders, careReminders, visitReminders];

type Input = Record<string, unknown>;

type Handler<T> = (ctx: Context, actor: Member, input: Input) => T;

/** Every query the API answers. A handler returns null when the actor may not see it. */
const QUERIES: { [N in QueryName]: Handler<Queries[N]['output'] | QueryError | null> } = {
  me: (_ctx, actor) => me(actor),
  members: (ctx) => listMembers(ctx),
  invites: (ctx, actor) => listInvites(ctx, actor),
  pets: (ctx) => listPets(ctx),
  retiredPets: (ctx) => listRetiredPets(ctx),
  push: (ctx) => pushInfo(ctx),
  vaccinations: (ctx) => listVaccinations(ctx),
  care: (ctx) => listCare(ctx),
  conditions: (ctx) => listConditions(ctx),
  visits: (ctx) => listVisits(ctx),
  diary: (ctx) => listDiary(ctx),
  meals: (ctx) => listMeals(ctx),
  sitterLinks: (ctx) => listSitterLinks(ctx),
  medications: (ctx) => listMedications(ctx),
};

/** Every command the API runs; each checks the actor's role itself. */
const COMMANDS: { [N in CommandName]: Handler<CommandResult<Commands[N]['output']>> } = {
  'invite.create': createInvite,
  'invite.revoke': revokeInvite,
  'member.setRoles': setRoles,
  'member.remove': removeMember,
  'member.rename': rename,
  'pet.update': updatePet,
  'pet.setEmergency': setEmergency,
  'pet.setTutor': setTutor,
  'pet.create': createPet,
  'pet.retire': retirePet,
  'pet.lendTutoria': lendTutoria,
  'pet.setPhoto': setPhoto,
  'pet.setTags': setTags,
  'push.subscribe': subscribe,
  'push.unsubscribe': unsubscribe,
  'weight.add': addWeight,
  'weight.remove': removeWeight,
  'vaccine.add': addVaccination,
  'vaccine.remove': removeVaccination,
  'care.add': addCare,
  'care.remove': removeCare,
  'condition.add': addCondition,
  'condition.resolve': resolveCondition,
  'condition.remove': removeCondition,
  'visit.add': addVisit,
  'visit.remove': removeVisit,
  'diary.add': addDiary,
  'diary.remove': removeDiary,
  'meal.add': addMeal,
  'meal.remove': removeMeal,
  'sitter.create': createSitterLink,
  'sitter.revoke': revokeSitterLink,
  'medication.add': addMedication,
  'medication.remove': removeMedication,
};

export class GroupService {
  private readonly ctx: Context;

  /** `sources` are the features with due dates; `vapidPublicKey` is null where push is not set up. */
  constructor(
    sql: Sql,
    clock: Clock,
    ids: IdGenerator,
    private readonly sources: readonly ReminderSource[] = REMINDER_SOURCES,
    vapidPublicKey: string | null = null,
  ) {
    this.ctx = { sql, clock, ids, vapidPublicKey };
  }

  migrate(): void {
    migrate(this.ctx.sql);
  }

  signIn(profile: GoogleProfile, sessionHash: string, bootstrapAdminEmails: readonly string[]): SignInResult {
    const result = signIn(this.ctx, profile, sessionHash, bootstrapAdminEmails);
    if (result.ok) this.ctx.sql.transaction(() => linkTutor(this.ctx, result.memberId, profile.email));
    return result;
  }

  signOut(sessionHash: string): void {
    signOut(this.ctx, sessionHash);
  }

  memberForSession(sessionHash: string): Member | null {
    return memberForSession(this.ctx, sessionHash);
  }

  query(sessionHash: string, name: string, input: unknown): ApiResult<unknown> {
    const actor = this.memberForSession(sessionHash);
    if (!actor) return failure('unauthenticated');
    const handler = Object.hasOwn(QUERIES, name) ? QUERIES[name as QueryName] : undefined;
    if (!handler) return failure('not_found');
    const value = handler(this.ctx, actor, asInput(input));
    if (value instanceof QueryError) return failure(value.error);
    return value === null ? failure('forbidden') : { ok: true, value };
  }

  /** A chefe's photo (base64 JPEG) for a signed-in member; null when there is none. */
  photo(sessionHash: string, petId: string): string | null {
    return this.memberForSession(sessionHash) ? photoOf(this.ctx, petId) : null;
  }

  /** The pet sitter's page: no session, the token is the credential. Null for an unknown, revoked or expired link. */
  sitterManual(token: string): SitterManualView | null {
    return sitterManual(this.ctx, token);
  }

  sitterPhoto(token: string, petId: string): string | null {
    return sitterPhoto(this.ctx, token, petId);
  }

  command(sessionHash: string, name: string, input: unknown): CommandResult<unknown> {
    const actor = this.memberForSession(sessionHash);
    if (!actor) return failure('unauthenticated');
    const handler = Object.hasOwn(COMMANDS, name) ? COMMANDS[name as CommandName] : undefined;
    if (!handler) return failure('not_found');
    return this.ctx.sql.transaction(() => handler(this.ctx, actor, asInput(input)));
  }

  /**
   * Runs the time-based jobs that are due (ADR-004: one cron, every few minutes; each job decides
   * whether it is due). Returns the topics that changed, for the open apps, and the pushes the
   * caller must send now: their stages are already recorded, so each goes out once.
   */
  tick(): { changed: Topic[]; pushes: PushMessage[] } {
    this.ctx.sql.run('DELETE FROM sessions WHERE expires_at <= ?', this.ctx.clock.now().toISOString());
    const returned = this.ctx.sql.transaction(() => returnTutorias(this.ctx));
    const pushes = this.ctx.sql.transaction(() => planReminders(this.ctx, this.sources));
    return { changed: returned ? ['pets'] : [], pushes };
  }

  /** Forgets devices a push service reported as gone. */
  dropDevices(endpoints: readonly string[]): void {
    this.ctx.sql.transaction(() => dropDevices(this.ctx, endpoints));
  }
}

function asInput(input: unknown): Input {
  return typeof input === 'object' && input !== null && !Array.isArray(input) ? (input as Input) : {};
}
