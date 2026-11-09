// How a deadline is said to a person: "amanhã", "em 12 meses", "há 3 dias", "anual". Pure; the one
// place that decides days, months or years, so every screen says it the same way.

const DAYS_PER_MONTH = 30.4375;
const DAYS_PER_YEAR = 365.25;
/** Below this many days the span is said in days. */
export const DAYS_LIMIT = 60;
/** Up to this many months the span is said in months; beyond it, in years. */
export const MONTHS_LIMIT = 23;

/** "3 dias", "5 meses", "2 anos": a span of days in the largest unit that reads naturally. */
export function spanText(days: number): string {
  const n = Math.max(0, Math.round(days));
  if (n < DAYS_LIMIT) return `${n} ${n === 1 ? 'dia' : 'dias'}`;
  const months = Math.round(n / DAYS_PER_MONTH);
  if (months <= MONTHS_LIMIT) return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  const years = Math.round(n / DAYS_PER_YEAR);
  return `${years} ${years === 1 ? 'ano' : 'anos'}`;
}

/** "hoje", "amanhã", "em 12 meses", "ontem", "há 3 dias". `days` is how far the date is, always >= 0. */
export function dueLabel(overdue: boolean, days: number): string {
  if (days <= 0) return 'hoje';
  if (days === 1) return overdue ? 'ontem' : 'amanhã';
  return overdue ? `há ${spanText(days)}` : `em ${spanText(days)}`;
}

/** "todo dia", "mensal", "a cada 3 meses", "anual", "a cada 2 anos"; days otherwise ("a cada 14 dias"). */
export function intervalLabel(days: number): string {
  if (days === 1) return 'todo dia';
  if (days === 365 || days === 366 || days === 360) return 'anual';
  if (days === 30) return 'mensal';
  if (days > 365 && days % 365 === 0) return `a cada ${days / 365} anos`;
  if (days % 30 === 0) return `a cada ${days / 30} meses`;
  return `a cada ${days} dias`;
}
