// The base phrase library (docs/spec/voz-dos-chefes.md, "Biblioteca base"): one phrase per chefe and
// per event, shared by both tutors. Variables: {nome}, {item}, {dias}, {funcionario}.

export type VoiceEvent = 'dueSoon' | 'overdue' | 'dailyDose' | 'weightStale' | 'allGood';

export const VOICE_EVENTS: readonly VoiceEvent[] = ['dueSoon', 'overdue', 'dailyDose', 'weightStale', 'allGood'];

export type PhraseSet = Readonly<Record<VoiceEvent, readonly string[]>>;

/** Keyed by the chefe's id: the three chefes that start registered (docs/spec/chefes.md). */
export const BASE_PHRASES: Readonly<Record<string, PhraseSet>> = {
  'pet-berenice': {
    dueSoon: ['A Juíza Suprema notou que {item} vence em {dias} dias. Seu contrato está sob análise, {funcionario}.'],
    overdue: ['Advertência formal emitida. A Berenice está te encarando desde que {item} venceu, há {dias} dias.'],
    dailyDose: ['Hora do remédio, {funcionario}. A Berenice aceitará com dignidade. Ou não.'],
    weightStale: ['A Berenice exige uma pesagem oficial. Já faz {dias} dias, e ela não aceita estimativas.'],
    allGood: ['A Berenice analisou seu desempenho e decidiu não te demitir hoje.'],
  },
  'pet-panda': {
    dueSoon: ['O Panda abriu um olho só para avisar: {item} vence em {dias} dias. Ele voltou a dormir confiando em você.'],
    overdue: ['O Panda perdeu a soneca nº 7 de preocupação: {item} está atrasado há {dias} dias.'],
    dailyDose: ['Hora do remédio do Panda. Dica dele: entregue durante a soneca, ele nem vai perceber.'],
    weightStale: ['O Panda interrompeu a soneca nº 14 apenas para lembrar que você não atualizou o peso dele.'],
    allGood: ['Tudo em dia. O Panda aprova e retoma a programação de sonecas.'],
  },
  'pet-pacoca': {
    dueSoon: ['A Paçoca convocou reunião de urgência: {item} vence em {dias} dias! Se resolver, depois tem festa.'],
    overdue: [
      'A Auditora de Petiscos encontrou uma irregularidade: {item} atrasado há {dias} dias. Seus petiscos estão suspensos (os dela, não).',
    ],
    dailyDose: ['Hora do remédio! A Paçoca topa qualquer coisa que venha embrulhada num petisco.'],
    weightStale: ['A Paçoca quer subir na balança. Faz {dias} dias, e ela jura que cresceu de tanto carisma.'],
    allGood: ['Tudo em dia! A Paçoca declarou festa oficial no corredor.'],
  },
};

/** Neutral wording: used in serious mode and wherever the humor is off. No chefe's voice. */
export const NEUTRAL_PHRASES: PhraseSet = {
  dueSoon: ['{item} de {nome} vence em {dias} dias.'],
  overdue: ['{item} de {nome} está atrasado há {dias} dias.'],
  dailyDose: ['Hora do remédio de {nome}.'],
  weightStale: ['O peso de {nome} não é atualizado há {dias} dias.'],
  allGood: ['Tudo em dia com {nome}.'],
};

/** A chefe with a serious or chronic condition: present, but with no dramatic nagging. */
export const GENTLE_PHRASES: PhraseSet = {
  ...NEUTRAL_PHRASES,
  dailyDose: ['{nome} agradece o cuidado com o remédio de hoje.'],
  allGood: ['{nome} agradece o cuidado de vocês.'],
};
