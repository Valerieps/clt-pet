// The contract between the app and the server: query and command names, inputs and outputs.
// Types only. The server imports it with `import type`, so nothing here runs on either side.
import type { CareCategory } from '../domain/care/care';
import type { PrazoKind } from '../domain/prazos';
import type { Role } from '../domain/group/roles';
import type { VisitKind } from '../domain/health/health';
import type { Emergency } from '../domain/pets/emergency';
import type { Frequency } from '../domain/medications/medication';
import type { PetProfile, Species } from '../domain/pets/pet';

export interface MemberView {
  readonly id: string;
  readonly name: string;
  readonly photoUrl: string | null;
  readonly roles: readonly Role[];
}

/** A row of the members screen: the e-mail only reaches admins. */
export interface MemberListItem extends MemberView {
  readonly email?: string;
}

export interface MeView extends MemberView {
  readonly email: string;
}

export type InviteState = 'pending' | 'accepted' | 'revoked';

export interface InviteView {
  readonly email: string;
  readonly state: InviteState;
  readonly invitedByName: string;
  readonly createdAt: string;
  readonly acceptedAt: string | null;
}

export interface WeightEntryView {
  readonly id: string;
  readonly grams: number;
  /** YYYY-MM-DD. */
  readonly onDate: string;
  readonly byName: string;
}

export interface PetView {
  readonly id: string;
  readonly species: Species;
  readonly profile: PetProfile;
  /** Changes whenever the photo does (it is part of the image's address); null without a photo. */
  readonly photoVersion: string | null;
  /** False until someone saves the allergies once, so the screen can say "nenhuma alergia informada". */
  readonly allergiesAnswered: boolean;
  /** The per-pet switch that turns the humor off (docs/spec/voz-dos-pets.md). */
  readonly seriousMode: boolean;
  readonly weightAlertPercent: number;
  readonly emergency: Emergency;
  readonly tutorMemberId: string | null;
  readonly tutorEmail: string;
  readonly tutorName: string | null;
  /** While the tutoria is lent: the day it goes back (docs/spec/pets.md, "Tutoria"). */
  readonly tutorUntil: string | null;
  /** Who takes the tutoria back on `tutorUntil`. */
  readonly tutorReturnName: string | null;
  /** YYYY-MM-DD: when the pet was registered in the app (its "chegada"). */
  readonly arrivedOn: string;
  /** Oldest first. */
  readonly weights: readonly WeightEntryView[];
  /** The newest thing registered for this pet (weight, vaccine, medication, care, visit, diary): who and when (ISO). */
  readonly lastRecord: LastRecordView | null;
}

export interface LastRecordView {
  readonly byName: string;
  /** What was registered: "Peso", the vaccine's name, the medication, the care item, the visit title. */
  readonly what: string;
  /** ISO timestamp of when it was saved, not the day it refers to. */
  readonly at: string;
}

/** What the app needs to subscribe this device to push. */
export interface PushInfo {
  /** The VAPID public key (base64url); null where the server has no push set up. */
  readonly publicKey: string | null;
}

export interface VaccinationView {
  readonly id: string;
  readonly petId: string;
  readonly vaccine: string;
  /** YYYY-MM-DD. */
  readonly appliedOn: string;
  readonly intervalDays: number;
  readonly lot: string | null;
  readonly maker: string | null;
  readonly vet: string | null;
  readonly byName: string;
}

/** A pet that left (docs/spec/pets.md, "Aposentadoria"); its history stays in the database. */
export interface RetiredPetView {
  readonly id: string;
  readonly name: string;
  readonly species: Species;
  readonly arrivedOn: string;
  readonly retiredOn: string;
}

/** A parasite or hygiene record (docs/spec/cuidados.md). */
export interface CareView {
  readonly id: string;
  readonly petId: string;
  readonly category: CareCategory;
  readonly item: string;
  /** YYYY-MM-DD. */
  readonly doneOn: string;
  readonly intervalDays: number;
  readonly note: string | null;
  readonly byName: string;
}

/** A planned prazo (docs/spec/prazos.md): the next date of an item, before or instead of a record. */
export interface PlanView {
  readonly id: string;
  readonly petId: string;
  readonly kind: PrazoKind;
  readonly item: string;
  /** YYYY-MM-DD. */
  readonly dueOn: string;
  readonly intervalDays: number;
  /** A planned medication's dose; null otherwise. */
  readonly dose: string | null;
  readonly byName: string;
}

export interface ConditionView {
  readonly id: string;
  readonly petId: string;
  readonly name: string;
  readonly grave: boolean;
  readonly since: string | null;
  readonly notes: string | null;
  /** Null while the condition is active. */
  readonly resolvedOn: string | null;
  readonly byName: string;
}

export interface VisitView {
  readonly id: string;
  readonly petId: string;
  readonly kind: VisitKind;
  readonly onDate: string;
  readonly title: string;
  readonly vet: string | null;
  readonly notes: string | null;
  readonly returnOn: string | null;
  readonly byName: string;
}

export interface DiaryEntryView {
  readonly id: string;
  readonly petId: string;
  readonly onDate: string;
  readonly text: string;
  readonly byName: string;
}

export interface MealView {
  readonly id: string;
  readonly petId: string;
  /** HH:MM. */
  readonly at: string;
  readonly amount: string | null;
  readonly note: string | null;
}

/** A pet sitter's link, as the members see it. The token is part of the address they hand over. */
export interface SitterLinkView {
  readonly id: string;
  readonly label: string;
  readonly petIds: readonly string[];
  readonly note: string | null;
  /** The last day the link opens. */
  readonly expiresOn: string;
  readonly expired: boolean;
  readonly token: string;
  readonly byName: string;
}

/** What the sitter's page shows about one pet (docs/spec/manual-temporario.md). */
export interface SitterPetView {
  readonly id: string;
  readonly name: string;
  readonly species: Species;
  readonly photoVersion: string | null;
  readonly microchip: string | null;
  readonly allergies: PetProfile['allergies'];
  readonly graveConditions: readonly { readonly name: string; readonly notes: string | null }[];
  readonly food: { readonly kind: PetProfile['foodKind']; readonly brand: string | null; readonly daily: string | null };
  readonly meals: readonly MealView[];
  readonly emergency: Emergency;
}

export interface SitterManualView {
  readonly label: string;
  readonly note: string | null;
  readonly expiresOn: string;
  /** The tutors' names, to call. */
  readonly tutors: readonly string[];
  readonly pets: readonly SitterPetView[];
}

/** Where the sitter's page reads from; the token is the credential (no sign-in). */
export const sitterManualPath = (token: string) => `/api/temporario/${token}`;
export const sitterPhotoPath = (token: string, petId: string, version: string) =>
  `/api/temporario/${token}/foto/${petId}?v=${encodeURIComponent(version)}`;
/** The page the sitter opens. */
export const sitterPagePath = (token: string) => `/temporario/${token}`;

export interface MedicationView {
  readonly id: string;
  readonly petId: string;
  readonly name: string;
  readonly dose: string;
  readonly frequency: Frequency;
  /** YYYY-MM-DD. */
  readonly startOn: string;
  /** YYYY-MM-DD; null is continuous use. */
  readonly endOn: string | null;
  readonly byName: string;
}

/** Where a pet's photo is served (GET, signed-in members only). */
export const petPhotoPath = (petId: string, version: string) => `/api/pets/${petId}/photo?v=${encodeURIComponent(version)}`;

/** Largest accepted photo, as base64 text (about 300 kB of JPEG); the app shrinks pictures far below it. */
export const PHOTO_MAX_BASE64 = 400_000;

/** The fields `pet.update` takes besides the profile's own. */
export type PetUpdate = { petId: string; weightAlertPercent: number } & PetProfile;

/** Reads: `POST /api/query/<name>`. They never change anything. */
export interface Queries {
  /** The pets that are not retired, with weights. */
  pets: { input: Record<string, never>; output: PetView[] };
  /** Every dose registered for the pets that are not retired, oldest application first. */
  vaccinations: { input: Record<string, never>; output: VaccinationView[] };
  /** Newest retirement first. */
  retiredPets: { input: Record<string, never>; output: RetiredPetView[] };
  /** Parasite and hygiene records of the pets that are not retired, oldest first. */
  care: { input: Record<string, never>; output: CareView[] };
  /** The planned prazos of the pets that are not retired, soonest first. */
  plans: { input: Record<string, never>; output: PlanView[] };
  /** Every condition, active and resolved. */
  conditions: { input: Record<string, never>; output: ConditionView[] };
  /** Consultas, exames and laudos, oldest first. */
  visits: { input: Record<string, never>; output: VisitView[] };
  diary: { input: Record<string, never>; output: DiaryEntryView[] };
  /** By time of day. */
  meals: { input: Record<string, never>; output: MealView[] };
  /** The links not revoked, newest first. */
  sitterLinks: { input: Record<string, never>; output: SitterLinkView[] };
  /** Every medication registered for the pets that are not retired, oldest start first. */
  medications: { input: Record<string, never>; output: MedicationView[] };
  me: { input: Record<string, never>; output: MeView };
  push: { input: Record<string, never>; output: PushInfo };
  members: { input: Record<string, never>; output: MemberListItem[] };
  /** Admins only. */
  invites: { input: Record<string, never>; output: InviteView[] };
}

/** Writes: `POST /api/command/<name>`. Each runs alone, in one transaction. */
export interface Commands {
  'invite.create': { input: { email: string }; output: InviteView };
  'invite.revoke': { input: { email: string }; output: null };
  'member.setRoles': { input: { memberId: string; roles: Role[] }; output: MemberView };
  /** Admins; never oneself, so the last admin stays. */
  'member.remove': { input: { memberId: string }; output: null };
  'member.rename': { input: { name: string }; output: MeView };
  /** Any member edits any pet's profile, allergies and weight limit. */
  'pet.update': { input: PetUpdate; output: PetView };
  /** Any member edits the vet, 24 h clinic and health plan shown on the Cartão SOS. */
  'pet.setEmergency': { input: { petId: string } & Emergency; output: PetView };
  /** The Exame Admissional: a new pet, with only the name and species; the actor is its tutor. */
  'pet.create': { input: { name: string; species: Species }; output: PetView };
  /** Retires a pet (death or adoption): it leaves Próximas Ações; its history stays. */
  'pet.retire': { input: { petId: string }; output: null };
  /** Lends the tutoria to `memberId` until `until` (a future date); the current tutor takes it back that day. */
  'pet.lendTutoria': { input: { petId: string; memberId: string; until: string }; output: PetView };
  /** Makes `memberId` the tutor responsável; the other members stay as reservas. Ends a lent tutoria. */
  'pet.setTutor': { input: { petId: string; memberId: string }; output: PetView };
  /** `image` is a base64 JPEG (at most PHOTO_MAX_BASE64 characters); null takes the photo away. */
  'pet.setPhoto': { input: { petId: string; image: string | null }; output: PetView };
  /** Saves this device's push subscription (the endpoint must be a push service of ADR-008). */
  'push.subscribe': { input: { endpoint: string; p256dh: string; auth: string }; output: null };
  'push.unsubscribe': { input: { endpoint: string }; output: null };
  'weight.add': { input: { petId: string; grams: number; onDate: string }; output: PetView };
  'weight.remove': { input: { weightId: string }; output: PetView };
  /** One dose for every pet in `petIds`; only `vaccine` and `appliedOn` are required. */
  'vaccine.add': {
    input: {
      petIds: string[];
      vaccine: string;
      appliedOn: string;
      intervalDays?: number;
      lot?: string | null;
      maker?: string | null;
      vet?: string | null;
    };
    output: VaccinationView[];
  };
  'vaccine.remove': { input: { vaccinationId: string }; output: null };
  /** One parasite or hygiene record for every pet in `petIds`; the interval defaults to 365 days. */
  'care.add': {
    input: { petIds: string[]; category: CareCategory; item: string; doneOn: string; intervalDays?: number; note?: string | null };
    output: CareView[];
  };
  'care.remove': { input: { careId: string }; output: null };
  /**
   * Plans an item's next date for every pet in `petIds`, replacing that item's earlier plan. A record
   * of the same item (`vaccine.add`, `care.add`) removes the plan: from then on the record decides.
   * A routine consulta (`visit`) stays: a consulta done with the same subject moves it forward.
   */
  'plan.add': { input: { petIds: string[]; kind: PrazoKind; item: string; dueOn: string; intervalDays: number; dose?: string | null }; output: PlanView[] };
  'plan.remove': { input: { planId: string }; output: null };
  'condition.add': { input: { petId: string; name: string; grave?: boolean; since?: string | null; notes?: string | null }; output: ConditionView };
  /** `resolvedOn` null reopens the condition; omitted means today. */
  'condition.resolve': { input: { conditionId: string; resolvedOn?: string | null }; output: ConditionView };
  'condition.remove': { input: { conditionId: string }; output: null };
  'visit.add': {
    input: { petId: string; kind: VisitKind; onDate: string; title: string; vet?: string | null; notes?: string | null; returnOn?: string | null };
    output: VisitView;
  };
  'visit.remove': { input: { visitId: string }; output: null };
  /** `onDate` defaults to today. */
  'diary.add': { input: { petId: string; text: string; onDate?: string }; output: DiaryEntryView };
  'diary.remove': { input: { entryId: string }; output: null };
  'meal.add': { input: { petId: string; at: string; amount?: string | null; note?: string | null }; output: MealView };
  'meal.remove': { input: { mealId: string }; output: null };
  /** The link lasts `days` days (1 to 90, default 7), counting today. */
  'sitter.create': { input: { label: string; petIds: string[]; note?: string | null; days?: number }; output: SitterLinkView };
  'sitter.revoke': { input: { linkId: string }; output: null };
  /** One medication for one pet; `endOn` empty or missing is continuous use. */
  'medication.add': {
    input: { petId: string; name: string; dose: string; frequency: Frequency; startOn: string; endOn?: string | null };
    output: MedicationView;
  };
  'medication.remove': { input: { medicationId: string }; output: null };
}

export type QueryName = keyof Queries;
export type CommandName = keyof Commands;

/** What a live message says changed; the screens that show it refetch. */
export type Topic =
  | 'me'
  | 'members'
  | 'invites'
  | 'pets'
  | 'vaccinations'
  | 'medications'
  | 'care'
  | 'plans'
  | 'conditions'
  | 'visits'
  | 'diary'
  | 'meals'
  | 'sitter';

export interface LiveMessage {
  readonly type: 'changed';
  readonly topics: readonly Topic[];
}

export type ApiError = 'unauthenticated' | 'forbidden' | 'not_found' | 'invalid' | 'conflict' | 'last_admin' | 'unavailable';

export type ApiResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: ApiError };
