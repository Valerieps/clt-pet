// The greeting of Próximas Ações (docs/spec/proximas-acoes.md): by the hour of the device's clock.
export function greetingFor(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}
