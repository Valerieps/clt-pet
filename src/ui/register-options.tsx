// The one list of what the + registers (docs/spec/navegacao.md): only acontecimentos. The speed dial
// and the Registrar drawer's menu both read it, so a name and its icon are the same everywhere.
import type { ReactNode } from 'react';
import { strings } from '../domain/strings';
import { DropIcon, NoteIcon, ScaleIcon, ShieldIcon, StethoscopeIcon, VaccineIcon } from './parts';

export type RegisterStep = 'vaccine' | 'weight' | 'parasite' | 'hygiene' | 'visit' | 'diary';

export interface RegisterOption {
  readonly step: RegisterStep;
  /** The drawer's hash: /chefes/<id>/registrar#<hash>. */
  readonly hash: string;
  readonly label: string;
  readonly icon: ReactNode;
}

const t = strings.register;

export const REGISTER_OPTIONS: readonly RegisterOption[] = [
  { step: 'vaccine', hash: 'vacina', label: t.vaccine, icon: <VaccineIcon /> },
  { step: 'weight', hash: 'peso', label: t.weight, icon: <ScaleIcon /> },
  { step: 'parasite', hash: 'antiparasitario', label: t.parasite, icon: <ShieldIcon /> },
  { step: 'hygiene', hash: 'higiene', label: t.hygiene, icon: <DropIcon /> },
  { step: 'visit', hash: 'consulta', label: t.visit, icon: <StethoscopeIcon /> },
  { step: 'diary', hash: 'diario', label: t.diary, icon: <NoteIcon /> },
];

/**
 * The form a drawer hash opens, or null for the menu. `cuidado` is the old "care" link and opens the
 * Antiparasitário form; `medicacao` (medication left the + until phase 3) and unknown hashes get the menu.
 */
export function stepOfHash(hash: string): RegisterStep | null {
  const key = hash.replace(/^#/, '');
  if (key === 'cuidado') return 'parasite';
  return REGISTER_OPTIONS.find((o) => o.hash === key)?.step ?? null;
}
