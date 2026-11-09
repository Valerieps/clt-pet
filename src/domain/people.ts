// How a member is named on screen. The sign-in gives names in any case ("valeria souza",
// "CESAR GAMBOA MACHADO"); the app shows the first name, capitalized.

/** "valeria souza" -> "Valeria"; "CESAR GAMBOA MACHADO" -> "Cesar"; "ÉRICA lima" -> "Érica". */
export function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? '';
  return first
    .toLocaleLowerCase('pt-BR')
    .split('-')
    .map((part) => part.charAt(0).toLocaleUpperCase('pt-BR') + part.slice(1))
    .join('-');
}
