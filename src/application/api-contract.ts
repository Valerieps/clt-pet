// The contract between the app and the server: query and command names, inputs and outputs.
// Types only. The server imports it with `import type`, so nothing here runs on either side.
import type { Role } from '../domain/group/roles';
import type { Emergency } from '../domain/pets/emergency';
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
  readonly tags: readonly string[];
  /** Changes whenever the photo does (it is part of the image's address); null without a photo. */
  readonly photoVersion: string | null;
  /** False until someone saves the allergies once, so the screen can say "nenhuma alergia informada". */
  readonly allergiesAnswered: boolean;
  readonly weightAlertPercent: number;
  readonly emergency: Emergency;
  readonly tutorMemberId: string | null;
  readonly tutorEmail: string;
  readonly tutorName: string | null;
  /** Oldest first. */
  readonly weights: readonly WeightEntryView[];
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

/** Where a chefe's photo is served (GET, signed-in members only). */
export const petPhotoPath = (petId: string, version: string) => `/api/pets/${petId}/photo?v=${encodeURIComponent(version)}`;

/** Largest accepted photo, as base64 text (about 300 kB of JPEG); the app shrinks pictures far below it. */
export const PHOTO_MAX_BASE64 = 400_000;

/** The fields `pet.update` takes besides the profile's own. */
export type PetUpdate = { petId: string; weightAlertPercent: number } & PetProfile;

/** Reads: `POST /api/query/<name>`. They never change anything. */
export interface Queries {
  /** The chefes that are not retired, with weights. */
  pets: { input: Record<string, never>; output: PetView[] };
  /** Every dose registered for the chefes that are not retired, oldest application first. */
  vaccinations: { input: Record<string, never>; output: VaccinationView[] };
  me: { input: Record<string, never>; output: MeView };
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
  /** Any member edits any chefe's profile, allergies and weight limit. */
  'pet.update': { input: PetUpdate; output: PetView };
  /** Any member edits the vet, 24 h clinic and health plan shown on the Cartão SOS. */
  'pet.setEmergency': { input: { petId: string } & Emergency; output: PetView };
  /** Makes `memberId` the tutor responsável; the other members stay as reservas. */
  'pet.setTutor': { input: { petId: string; memberId: string }; output: PetView };
  /** `image` is a base64 JPEG (at most PHOTO_MAX_BASE64 characters); null takes the photo away. */
  'pet.setPhoto': { input: { petId: string; image: string | null }; output: PetView };
  /** Replaces the personality tags (docs/spec/voz-dos-chefes.md). */
  'pet.setTags': { input: { petId: string; tags: string[] }; output: PetView };
  'weight.add': { input: { petId: string; grams: number; onDate: string }; output: PetView };
  'weight.remove': { input: { weightId: string }; output: PetView };
  /** One dose for every chefe in `petIds`; only `vaccine` and `appliedOn` are required. */
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
}

export type QueryName = keyof Queries;
export type CommandName = keyof Commands;

/** What a live message says changed; the screens that show it refetch. */
export type Topic = 'me' | 'members' | 'invites' | 'pets' | 'vaccinations';

export interface LiveMessage {
  readonly type: 'changed';
  readonly topics: readonly Topic[];
}

export type ApiError = 'unauthenticated' | 'forbidden' | 'not_found' | 'invalid' | 'conflict' | 'last_admin' | 'unavailable';

export type ApiResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: ApiError };
