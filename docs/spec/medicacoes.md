# Medicações

As medicações de cada pet: o que toma, quanto, com que frequência e por quanto tempo.

- **Entra aqui:** cadastrar, listar e apagar medicações.
- **Não entra aqui:** "dose dada", trava anti-duplicidade, estoque, horários exatos e lembretes
  (fase 3), e vermífugos e antipulgas (fase 2, em `vacinas.md` quando chegar a vez).

## Em aberto

- [ ] Na fase 3, a frequência vira horários exatos (ex.: 8h e 20h) para os lembretes? Hoje ela é
  só um texto escolhido entre seis opções.

## Cadastro

- Eu cadastro uma medicação para um pet: nome do remédio, dose, frequência, data de início e,
  se quiser, data de fim. Sem data de fim, é uso contínuo. *(1)*
- A dose é um texto livre ("1 comprimido", "0,5 ml"). A frequência é uma de seis: 1x, 2x ou 3x ao
  dia, a cada 12 horas, a cada 8 horas, ou quando precisar. *(1)*
- A data de início começa em hoje e pode ser passada ou futura. A data de fim não pode ser antes
  do início. *(1)*
- Uma medicação vale para um pet só. *(1)*
  *Por quê:* a dose costuma variar com o peso e a espécie.
- Qualquer funcionário cadastra e apaga; cada linha mostra quem cadastrou. *(1)*

## Onde aparece

- Na página do pet, a medicação se chama **Tratamento** e fica na aba Saúde, na seção
  Tratamentos: os em uso primeiro e, dobrados embaixo, os encerrados (a data de fim já passou). *(2)*
- Eu cadastro um tratamento pelo botão "+ Novo tratamento", no fim da seção. Até a fase 3, ele não
  entra pelo + (`navegacao.md`, "Acontecimento e ficha"). *(2)*
  *Por quê:* um tratamento é uma ficha, que vale até mudar; a "dose dada" da fase 3 é que será o
  acontecimento.
- O botão Apagar só aparece depois de tocar no lápis da aba. *(1)*
- O fim de um tratamento com data de fim aparece no "A seguir" da página do pet nos 7 dias antes
  do último dia (`navegacao.md`, "Exige e A seguir"). *(2)*
