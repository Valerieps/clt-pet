// Navigation rules (docs/spec/navegacao.md): who gets which tones, where a swipe leads. Pure: the UI passes what it knows.

/** The three tones of the design (tokens.css). A pet gets one by its place in the list, cycling when there are more. */
const AURAS = ['aura-ber', 'aura-pan', 'aura-pac'] as const;
export const auraClass = (index: number): (typeof AURAS)[number] => AURAS[((index % AURAS.length) + AURAS.length) % AURAS.length]!;

/** The letter inside a pet's or member's round face. */
export const initialOf = (name: string): string => ([...name.trim()][0] ?? '?').toLocaleUpperCase('pt-BR');

/** "Segunda, 2 de novembro": the weekday without "-feira", capitalized. */
export function dateLabel(now: Date): string {
  const text = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  const label = text.replace('-feira', '');
  return label.charAt(0).toLocaleUpperCase('pt-BR') + label.slice(1);
}

export const SWIPE_MIN_DISTANCE = 60;
export const SWIPE_MAX_DRIFT = 40;

/**
 * The path a horizontal swipe leads to, or null. `order` is the main screens left to right (the
 * Próximas Ações, then each pet); swiping left goes to the next, right to the previous.
 */
export function swipeTarget(order: readonly string[], current: string, dx: number, dy: number): string | null {
  const index = order.indexOf(current);
  if (index < 0 || Math.abs(dx) < SWIPE_MIN_DISTANCE || Math.abs(dy) > SWIPE_MAX_DRIFT) return null;
  return order[dx < 0 ? index + 1 : index - 1] ?? null;
}

/**
 * The pages lived under /chefes before they moved to /pets: a push already on a phone, or a saved
 * link, still opens the right page. Any other path is returned as it is.
 */
export function currentPath(path: string): string {
  return path === '/chefes' || path.startsWith('/chefes/') ? `/pets${path.slice('/chefes'.length)}` : path;
}

/** The three tabs of a pet's page (docs/spec/navegacao.md). */
export type PetTab = 'agendamentos' | 'ficha' | 'perfil';
export const PET_TABS: readonly PetTab[] = ['agendamentos', 'ficha', 'perfil'];

/**
 * The tab a link's hash opens. The old hashes (of earlier tabs) keep working, because push
 * notifications and the home screen already sent them; a section's hash opens the tab that holds it.
 */
const TAB_OF_HASH: Readonly<Record<string, PetTab>> = {
  agendamentos: 'agendamentos',
  prazos: 'agendamentos',
  historico: 'agendamentos',
  vacinas: 'agendamentos',
  cuidados: 'agendamentos',
  antiparasitarios: 'agendamentos',
  medicacoes: 'agendamentos',
  tratamentos: 'agendamentos',
  higiene: 'agendamentos',
  consultas: 'agendamentos',
  ficha: 'ficha',
  saude: 'ficha',
  condicoes: 'ficha',
  diario: 'ficha',
  peso: 'ficha',
  perfil: 'perfil',
  alimentacao: 'perfil',
  rotina: 'perfil',
  tutoria: 'perfil',
};
export const tabOfHash = (hash: string): PetTab | null => TAB_OF_HASH[hash.replace(/^#/, '')] ?? null;
