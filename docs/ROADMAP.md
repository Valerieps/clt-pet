# Roadmap

O que ainda não está pronto.

- **Entra aqui:** o que falta construir, onde o código ainda não segue o spec, o que foi adiado de
  propósito e as lacunas do spec que o agente decidiu sozinho.
- **Não entra aqui:** o que já está pronto (quando uma linha fica pronta, ela sai daqui; o git e as
  issues fechadas guardam o histórico), bugs e débito técnico (issues do GitHub) e as regras (`spec/`).

## Falta construir

| Feature | Fase | Spec | Observação |
| --- | --- | --- | --- |
| Modo sério: o interruptor por chefe na tela do chefe | 1 | `spec/voz-dos-chefes.md` | A coluna `serious_mode` e a regra de tom (`src/domain/voice`) já existem; falta o comando, o interruptor e usar a frase nos lembretes e no Mural quando eles forem feitos |
| Tags novas com frases próprias | 2 | `spec/voz-dos-chefes.md`, "Tags e frases" | As frases ainda são fixas por chefe (`src/domain/voice/phrases.ts`); falta guardar tags e frases criadas por nós no banco e sorteá-las |
| "Desfazer" depois de resolver no card | 3 | `spec/navegacao.md`, "Fora da fase 2" | Depende de o card ganhar um "Feito" |
| Fases 3 e 4 | 3 e 4 | `SPEC.md` | Cada uma ganha seus arquivos em `spec/` na vez dela |

## O código ainda não segue o spec

Nada por enquanto.

## Adiado

- Frases por funcionário (só o Cesar ou só eu vemos) — decidir se entram na fase 1 ou na 2.

- Foto do selo da vacina (`spec/vacinas.md`, "Registro"): o registro já guarda lote, fabricante e
  veterinário; falta anexar a foto.
- "Atrasada" como "Advertência" na voz do chefe (`spec/vacinas.md`, "Status"): entra com a voz nos
  lembretes e no Mural.
- Anexar PDF ou foto a exames e laudos (`spec/saude.md`, "Em aberto"): hoje o resultado é texto;
  junto com a leitura por foto (fase 4) ou antes, se a Valéria quiser.

## Revisar as lacunas que o agente decidiu

- [ ] Fase 2, `spec/prazos.md`: a data planejada pode ser passada; qualquer registro do item apaga o
  planejamento, mesmo um registro antigo lançado depois; cada item tem "Mudar data"; dá para
  planejar para vários chefes de uma vez; o planejamento é por item, uma dose por vez.
- [ ] Fase 2, `spec/cuidados.md`: os modelos e intervalos de parasitas e higiene por espécie; "Vence
  logo" a um quarto do intervalo (de 1 a 30 dias); só parasitas exigem atenção no Mural e geram
  aviso, higiene não; a coleira repelente fica em Cuidados.
- [ ] Fase 2, `spec/saude.md`: só o nome é obrigatório numa condição; as graves vão para o Cartão de
  Saúde em vermelho e para o pet sitter; consulta pode ter data futura, exame e laudo não; o retorno
  gera aviso como uma vacina; resultado de exame em texto, sem anexo por enquanto.
- [ ] Fase 2, `spec/chefes.md` e `spec/saude.md`: refeições só com horário obrigatório e sem
  lembrete; "algo estranho hoje" até 500 letras, só na página do chefe (não no Mural).
- [ ] Fase 2, `spec/navegacao.md`, as quatro abas: o retorno de uma consulta vence logo 7 dias antes
  e sai do "Exige" quando há uma consulta registrada a partir de 7 dias antes dele; o fim de um
  tratamento entra no "A seguir" nos 7 dias antes do último dia; o "A seguir" mostra os dois próximos
  prazos; os nomes exatos do + ("Vacina dada", "Peso", "Antiparasitário dado", "Higiene feita",
  "Consulta ou exame", "Algo estranho hoje") e das seções; o menu da gaveta só aparece para um link
  sem formulário (o antigo `#cuidado` abre Antiparasitário dado, o antigo `#medicacao` cai no menu);
  "Algo estranho hoje" mostra as três anotações mais novas e dobra as outras; Consultas e exames
  mostra primeiro as agendadas e as com retorno em aberto; o lápis abre o histórico dobrado; as
  alergias aparecem como uma linha dos dados do Perfil.
- [ ] Fase 2, `spec/manual-temporario.md`: qualquer funcionário cria o link; prazo de 1 a 90 dias
  (7 por padrão); a página mostra só o nome dos tutores (sem telefone nem e-mail) e só lê; o token
  fica guardado para copiar o link de novo (ADR-010).
- [ ] Fase 2, `spec/chefes.md`: tutoria emprestada a partir de amanhã, volta sozinha no dia;
  aposentar fica no editar perfil; o ano de chegada é o ano em que o chefe entrou no app; o Exame
  Admissional pede só nome e espécie e quem cadastra vira o tutor.
- [ ] Fase 2, `spec/navegacao.md`: "Lembrar amanhã" vale só no aparelho e até o fim do dia; o aviso
  abre a aba do item.

- [ ] `spec/vacinas.md`: todo reforço começa em 365 dias (editável em cada registro); o status de cada
  vacina vem da última aplicação dela; o nome da vacina é livre, com os protocolos da espécie como
  sugestão.

- [ ] `spec/lembretes.md`: o aviso chega às 9h, no fuso de Brasília.
- [ ] `spec/chefes.md`: só nome e espécie são obrigatórios no cadastro; os tutores são ligados pelos
  e-mails `souza.pereira.valeria@gmail.com` e `csrgamboa@gmail.com`.
- [ ] `spec/mural.md`: "Exige atenção" quando há vacina atrasada ou a vencer em 30 dias, ou alergia em
  branco; os dois funcionários veem os próprios chefes primeiro; o formulário do nome e o aviso no
  celular ficam nas Configurações.
- [ ] `spec/navegacao.md`: as três auras (Berenice, Panda, Paçoca no desenho) são dadas na ordem em
  que os chefes aparecem, não pelas tags; o modo escuro continua, com as auras iguais; os formulários
  de vacina e peso ficam dentro da gaveta de Registrar (decidido pela Valéria).
- [ ] `spec/vacinas.md`: só a vacina e a data são obrigatórias no registro.
- [ ] `spec/acesso-e-membros.md`: eu e o Cesar somos os dois admins.
- [ ] `spec/chefes.md`: o peso aceita de 100 g a 150 kg, nunca com data futura (no horário de
  Brasília); o aviso de variação compara o peso mais recente com os dos 60 dias anteriores e o
  limite vai de 1% a 50% por chefe; as alergias contam como preenchidas depois do primeiro
  salvamento do perfil; qualquer funcionário pode apagar um registro de peso.
- [ ] `spec/chefes.md`: a foto é encolhida pelo app (640 px) e guardada no próprio banco do grupo
  (ADR-009); as tags têm no máximo 6 por chefe e 40 letras cada.
