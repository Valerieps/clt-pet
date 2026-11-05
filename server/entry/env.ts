import type { Group } from './group-object';

/** Bindings and settings from wrangler.jsonc; secrets are set with `wrangler secret put`. */
export interface Env {
  readonly ASSETS: Fetcher;
  readonly GROUP: DurableObjectNamespace<Group>;
  readonly GOOGLE_CLIENT_ID: string;
  readonly GOOGLE_CLIENT_SECRET: string;
  /** Public VAPID key (base64url, 65 bytes) that the apps subscribe with (ADR-008). */
  readonly VAPID_PUBLIC_KEY: string;
  /** Secret: the VAPID private scalar (base64url, 32 bytes). Without it push is off. */
  readonly VAPID_PRIVATE_KEY?: string;
  /** Who the push services can contact: a mailto: or https: address. */
  readonly VAPID_SUBJECT: string;
  /** Comma-separated. Only used while the group has no admin at all. */
  readonly BOOTSTRAP_ADMIN_EMAILS: string;
  /** "1" turns on the test sign-in on localhost (ADR-007). Only ever set in `.dev.vars`. */
  readonly DEV_SIGN_IN?: string;
}
