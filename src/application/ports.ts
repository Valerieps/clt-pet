// What the UI needs from the outside world. src/infrastructure/ implements it; the UI receives it
// through ServicesProvider and never makes network calls itself.
import type { ApiResult, CommandName, Commands, QueryName, Queries, Topic } from './api-contract';

export interface Backend {
  query<N extends QueryName>(name: N, input: Queries[N]['input']): Promise<ApiResult<Queries[N]['output']>>;
  command<N extends CommandName>(name: N, input: Commands[N]['input']): Promise<ApiResult<Commands[N]['output']>>;
  signOut(): Promise<void>;
  /** The test sign-in without Google; the server accepts it only on localhost (ADR-007). */
  devSignIn(email: string, name: string): Promise<ApiResult<null>>;
  /** The address the browser navigates to for "Entrar com Google". */
  readonly signInUrl: string;
}

export type LiveStatus = 'connecting' | 'online' | 'offline';

export interface LiveUpdates {
  /** Calls `onChange` with the topics that changed; also with every topic after a reconnect. */
  subscribe(onChange: (topics: readonly Topic[]) => void): () => void;
  onStatus(listener: (status: LiveStatus) => void): () => void;
  start(): void;
  stop(): void;
}

/** This device's push state. `unsupported`: no service worker or push here (an iPhone before the app is on the home screen). */
export type PushState = 'unsupported' | 'denied' | 'off' | 'on';

export interface PushSubscriptionKeys {
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
}

export interface PushDevice {
  state(): Promise<PushState>;
  /** Asks permission and subscribes with the server's public key; null when it did not work. */
  enable(publicKey: string): Promise<PushSubscriptionKeys | null>;
  /** Unsubscribes this device; returns the endpoint it had, or null. */
  disable(): Promise<string | null>;
}
