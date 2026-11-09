// The base phrase library (docs/spec/voz-dos-pets.md, "Biblioteca base"): a few phrases per pet and
// per event, shared by both tutors, always in the pet's own voice (first person).
// Variables: {nome}, {item}, {dias}, {funcionario}. Reminders fill only {nome}, {item} and {dias},
// so {funcionario} stays out of dueSoon, overdue and allGood.

export type VoiceEvent = 'dueSoon' | 'overdue' | 'dailyDose' | 'weightStale' | 'allGood';

export const VOICE_EVENTS: readonly VoiceEvent[] = ['dueSoon', 'overdue', 'dailyDose', 'weightStale', 'allGood'];

export type PhraseSet = Readonly<Record<VoiceEvent, readonly string[]>>;

/** Keyed by the pet's id: the three pets that start registered (docs/spec/pets.md). */
export const BASE_PHRASES: Readonly<Record<string, PhraseSet>> = {
  'pet-berenice': {
    dueSoon: [
      'Notei que {item} vence em {dias} dias. Seu contrato está sob análise.',
      'Despacho da Juíza Suprema: {item} vence em {dias} dias. Eu não costumo repetir.',
      'Daqui a {dias} dias vence {item}. Estou contando. Em silêncio. Julgando.',
      'Considere-se notificado: {item} vence em {dias} dias. A minha paciência vence antes.',
    ],
    overdue: [
      'Advertência formal emitida. Estou te encarando desde que {item} venceu, há {dias} dias.',
      'Abri um processo: {item} está atrasado há {dias} dias. A audiência é no meu sofá.',
      '{item} venceu há {dias} dias. Já redigi sua carta de demissão; só falta assinar.',
      'Registro em ata: {item} atrasado há {dias} dias. Não me olhe assim, quem devia estar envergonhado é você.',
    ],
    dailyDose: [
      'Hora do meu remédio, {funcionario}. Aceitarei com dignidade. Ou não.',
      'Meu remédio, por favor. E sem esconder no petisco: eu sempre percebo.',
    ],
    weightStale: [
      'Exijo uma pesagem oficial. Já faz {dias} dias, e eu não aceito estimativas.',
      'Faz {dias} dias que ninguém confere meu peso. Não que eu precise, mas a lei é a lei.',
    ],
    allGood: [
      'Analisei seu desempenho e decidi não te demitir hoje.',
      'Tudo em ordem. Pode continuar trabalhando, sob a minha supervisão.',
      'Hoje não tenho queixas. Aproveite, é raro.',
      'Aprovo o serviço de hoje. Não se acostume.',
    ],
  },
  'pet-panda': {
    dueSoon: [
      'Abri um olho só para avisar: {item} vence em {dias} dias. Voltei a dormir confiando em você.',
      'Sonhei que {item} vencia em {dias} dias. Acordei e era verdade.',
      'Entre uma soneca e outra: {item} vence em {dias} dias. Me acorda quando resolver.',
      'Aviso rápido, que o cochilo não espera: {item} vence em {dias} dias.',
    ],
    overdue: [
      'Perdi a soneca nº 7 de preocupação: {item} está atrasado há {dias} dias.',
      'Não consigo dormir: {item} está atrasado há {dias} dias. Isso nunca me aconteceu.',
      '{item} atrasado há {dias} dias. Estou acordado até agora por causa disso.',
      'Desmarquei três sonecas para te lembrar: {item} está atrasado há {dias} dias.',
    ],
    dailyDose: [
      'Hora do meu remédio. Dica: me dê durante a soneca, eu nem vou perceber.',
      'Remédio agora? Tudo bem, mas depois eu volto para o meu cantinho.',
    ],
    weightStale: [
      'Interrompi a soneca nº 14 só para lembrar que você não atualizou o meu peso.',
      'Faz {dias} dias sem me pesar. Prometo ficar parado na balança: é a minha especialidade.',
    ],
    allGood: [
      'Tudo em dia. Aprovo e retomo a minha programação de sonecas.',
      'Nada pendente. Vou aproveitar para tirar um cochilo merecido.',
      'Estou em dia e de barriga para cima. A vida é boa.',
      'Tudo certo por aqui. Se precisar de mim, estou dormindo.',
    ],
  },
  'pet-pacoca': {
    dueSoon: [
      'Convoquei reunião de urgência: {item} vence em {dias} dias! Se resolver, depois tem festa.',
      'Faltam {dias} dias para {item} vencer! Já estou pulando de ansiedade.',
      'Alerta da Auditora de Petiscos: {item} vence em {dias} dias. Resolva e eu libero um petisco (para mim).',
      '{item} vence em {dias} dias! Vou te seguir pela casa até você resolver.',
    ],
    overdue: [
      'Encontrei uma irregularidade: {item} atrasado há {dias} dias. Seus petiscos estão suspensos (os meus, não).',
      '{item} atrasado há {dias} dias! Cancelei a festa até segunda ordem.',
      'Já pulei, rodei e sentei no seu pé: {item} está atrasado há {dias} dias!',
      'Relatório da Auditora de Petiscos: {item} atrasado há {dias} dias. Multa: três petiscos, pagos a mim.',
    ],
    dailyDose: [
      'Hora do remédio! Topo qualquer coisa que venha embrulhada num petisco.',
      'Remédio? Só se vier com petisco. É o meu preço.',
    ],
    weightStale: [
      'Quero subir na balança! Faz {dias} dias, e eu juro que cresci de tanto carisma.',
      'Faz {dias} dias que não me peso. Prometo que é tudo músculo.',
    ],
    allGood: [
      'Tudo em dia! Declarei festa oficial no corredor.',
      'Nada pendente! Isso merece um petisco. Ou dois.',
      'Estou em dia e feliz da vida! Bora brincar?',
      'Auditoria concluída: nenhuma irregularidade. Pode me dar um petisco de prêmio.',
    ],
  },
};

/** Neutral wording: used in serious mode and wherever the humor is off. First person, but no jokes. */
export const NEUTRAL_PHRASES: PhraseSet = {
  dueSoon: ['Tenho {item} vencendo em {dias} dias.'],
  overdue: ['Estou com {item} em atraso há {dias} dias.'],
  dailyDose: ['Hora do meu remédio.'],
  weightStale: ['Meu peso não é atualizado há {dias} dias.'],
  allGood: ['Estou com tudo em dia.'],
};

/** A pet with a serious or chronic condition: present, but with no dramatic nagging. */
export const GENTLE_PHRASES: PhraseSet = {
  ...NEUTRAL_PHRASES,
  dailyDose: ['Agradeço o cuidado com o meu remédio de hoje.'],
  allGood: ['Agradeço o cuidado de vocês.'],
};
