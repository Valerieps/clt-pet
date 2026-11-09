# Voz dos pets

Nos avisos do celular, cada pet pode falar comigo na própria voz, com afeto e bom humor, mas nunca
onde a informação é clínica ou urgente. As telas do app não usam frases: são informação direta.

- **Entra aqui:** o tom de voz por contexto, a biblioteca de frases de cada pet e o modo sério.
- **Não entra aqui:** quando uma notificação é enviada (`lembretes.md`). A tela inicial não usa
  frases (`proximas-acoes.md`).

## Em aberto

- [ ] As frases por funcionário (as que só o Cesar vê, por exemplo) entram já na fase 1 ou na 2? Por
  ora só a biblioteca base compartilhada vale.

## Tom

- Afeto e bom humor nos avisos do celular (lembretes) e nas conquistas, na voz do pet. A tela
  inicial é só informativa, sem frases (`proximas-acoes.md`). *(1)*
- O pet sempre fala na primeira pessoa, comigo, inclusive no modo sério e no tom sem cobrança
  ("Estou com tudo em dia"). *(1)*
  *Por quê:* cada aviso é uma mensagem do pet; na terceira pessoa a frase não parecia dita por ele.
- Tom neutro e objetivo no Cartão SOS, nos contatos de emergência, nos diagnósticos, nas condições,
  nos exames e no relatório PDF. Essa regra vale acima de qualquer frase. *(1)*
- Condição grave ou crônica ativa: o pet pode aparecer, mas sem cobrança dramática ("Agradeço o
  cuidado com o meu remédio de hoje"). *(1)*
- Pet aposentado: tom afetuoso, nunca engraçado ("{nome} — com a gente de {ano de chegada} a {ano}"). *(2)*
- O modo sério é um interruptor por pet que desliga o humor, por exemplo numa internação. *(1)*

## Frases

- Cada pet tem as próprias frases, escritas à mão com as piadas da casa, para cada tipo de evento:
  vence em breve, atrasado, dose do dia, peso desatualizado e tudo em dia. *(1)*
- O app sorteia uma frase do pet e não repete a mesma em sequência. *(1)*
- As frases usam `{nome}`, `{item}`, `{dias}` e `{funcionario}`. *(1)*
- As frases ficam guardadas para os avisos do celular: hoje os lembretes de vencimento
  (`lembretes.md`) já as usam, e os próximos avisos podem usá-las também. *(1)*
  *Por quê:* as tags de personalidade saíram do app; as frases ficam, porque são o que dá carinho
  aos avisos.

## Biblioteca base

Algumas frases por pet e por evento, compartilhadas pelos dois, sempre na primeira pessoa. O app
preenche as variáveis. `{funcionario}` só aparece na dose do dia. *(1)*

### Berenice

- **Vence em breve:** Notei que {item} vence em {dias} dias. Seu contrato está sob análise. ·
  Despacho da Juíza Suprema: {item} vence em {dias} dias. Eu não costumo repetir. · Daqui a {dias}
  dias vence {item}. Estou contando. Em silêncio. Julgando. · Considere-se notificado: {item} vence
  em {dias} dias. A minha paciência vence antes.
- **Atrasado (Advertência):** Advertência formal emitida. Estou te encarando desde que {item}
  venceu, há {dias} dias. · Abri um processo: {item} está atrasado há {dias} dias. A audiência é no
  meu sofá. · {item} venceu há {dias} dias. Já redigi sua carta de demissão; só falta assinar. ·
  Registro em ata: {item} atrasado há {dias} dias. Não me olhe assim, quem devia estar envergonhado é você.
- **Dose do dia:** Hora do meu remédio, {funcionario}. Aceitarei com dignidade. Ou não. · Meu
  remédio, por favor. E sem esconder no petisco: eu sempre percebo.
- **Peso desatualizado:** Exijo uma pesagem oficial. Já faz {dias} dias, e eu não aceito
  estimativas. · Faz {dias} dias que ninguém confere meu peso. Não que eu precise, mas a lei é a lei.
- **Tudo em dia:** Analisei seu desempenho e decidi não te demitir hoje. · Tudo em ordem. Pode
  continuar trabalhando, sob a minha supervisão. · Hoje não tenho queixas. Aproveite, é raro. ·
  Aprovo o serviço de hoje. Não se acostume.

### Panda

- **Vence em breve:** Abri um olho só para avisar: {item} vence em {dias} dias. Voltei a dormir
  confiando em você. · Sonhei que {item} vencia em {dias} dias. Acordei e era verdade. · Entre uma
  soneca e outra: {item} vence em {dias} dias. Me acorda quando resolver. · Aviso rápido, que o
  cochilo não espera: {item} vence em {dias} dias.
- **Atrasado (Advertência):** Perdi a soneca nº 7 de preocupação: {item} está atrasado há {dias}
  dias. · Não consigo dormir: {item} está atrasado há {dias} dias. Isso nunca me aconteceu. · {item}
  atrasado há {dias} dias. Estou acordado até agora por causa disso. · Desmarquei três sonecas para
  te lembrar: {item} está atrasado há {dias} dias.
- **Dose do dia:** Hora do meu remédio. Dica: me dê durante a soneca, eu nem vou perceber. ·
  Remédio agora? Tudo bem, mas depois eu volto para o meu cantinho.
- **Peso desatualizado:** Interrompi a soneca nº 14 só para lembrar que você não atualizou o meu
  peso. · Faz {dias} dias sem me pesar. Prometo ficar parado na balança: é a minha especialidade.
- **Tudo em dia:** Tudo em dia. Aprovo e retomo a minha programação de sonecas. · Nada pendente.
  Vou aproveitar para tirar um cochilo merecido. · Estou em dia e de barriga para cima. A vida é
  boa. · Tudo certo por aqui. Se precisar de mim, estou dormindo.

### Paçoca

- **Vence em breve:** Convoquei reunião de urgência: {item} vence em {dias} dias! Se resolver,
  depois tem festa. · Faltam {dias} dias para {item} vencer! Já estou pulando de ansiedade. · Alerta
  da Auditora de Petiscos: {item} vence em {dias} dias. Resolva e eu libero um petisco (para mim). ·
  {item} vence em {dias} dias! Vou te seguir pela casa até você resolver.
- **Atrasado (Advertência):** Encontrei uma irregularidade: {item} atrasado há {dias} dias. Seus
  petiscos estão suspensos (os meus, não). · {item} atrasado há {dias} dias! Cancelei a festa até
  segunda ordem. · Já pulei, rodei e sentei no seu pé: {item} está atrasado há {dias} dias! ·
  Relatório da Auditora de Petiscos: {item} atrasado há {dias} dias. Multa: três petiscos, pagos a mim.
- **Dose do dia:** Hora do remédio! Topo qualquer coisa que venha embrulhada num petisco. ·
  Remédio? Só se vier com petisco. É o meu preço.
- **Peso desatualizado:** Quero subir na balança! Faz {dias} dias, e eu juro que cresci de tanto
  carisma. · Faz {dias} dias que não me peso. Prometo que é tudo músculo.
- **Tudo em dia:** Tudo em dia! Declarei festa oficial no corredor. · Nada pendente! Isso merece um
  petisco. Ou dois. · Estou em dia e feliz da vida! Bora brincar? · Auditoria concluída: nenhuma
  irregularidade. Pode me dar um petisco de prêmio.

### Modo sério (sem humor)

- **Vence em breve:** Tenho {item} vencendo em {dias} dias.
- **Atrasado:** Estou com {item} em atraso há {dias} dias.
- **Dose do dia:** Hora do meu remédio. (Com condição grave: Agradeço o cuidado com o meu remédio de hoje.)
- **Peso desatualizado:** Meu peso não é atualizado há {dias} dias.
- **Tudo em dia:** Estou com tudo em dia. (Com condição grave: Agradeço o cuidado de vocês.)

Nenhuma dessas frases aparece no Cartão SOS, em condições graves nem no relatório. *(1)*
