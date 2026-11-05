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
| Cartão SOS | 1 | `spec/cartao-sos.md` | A dois toques de qualquer tela |
| Carteirinha de vacinação | 1 | `spec/vacinas.md` | Protocolos por espécie e registro em grupo; ao nascer, entra em `REMINDER_SOURCES` (`group-service.ts`) para os lembretes por push avisarem as datas de reforço |
| Mural da Chefia | 1 | `spec/mural.md` | Troca a tela `Home` de exemplo |
| Fases 2, 3 e 4 | 2 a 4 | `SPEC.md` | Cada uma ganha seus arquivos em `spec/` na vez dela |

## O código ainda não segue o spec

Nada por enquanto.

## Adiado

- Frases por funcionário (só o Cesar ou só eu vemos) — decidir se entram na fase 1 ou na 2.

## Revisar as lacunas que o agente decidiu

- [ ] `spec/lembretes.md`: o aviso chega às 9h, no fuso de Brasília.
- [ ] `spec/chefes.md`: só nome e espécie são obrigatórios no cadastro; os tutores são ligados pelos
  e-mails `souza.pereira.valeria@gmail.com` e `csrgamboa@gmail.com`.
- [ ] `spec/mural.md`: "Exige atenção" quando há vacina atrasada ou a vencer em 30 dias, ou alergia em
  branco.
- [ ] `spec/vacinas.md`: só a vacina e a data são obrigatórias no registro.
- [ ] `spec/acesso-e-membros.md`: eu e o Cesar somos os dois admins.
- [ ] `spec/chefes.md`: o peso aceita de 100 g a 150 kg, nunca com data futura (no horário de
  Brasília); o aviso de variação compara o peso mais recente com os dos 60 dias anteriores e o
  limite vai de 1% a 50% por chefe; as alergias contam como preenchidas depois do primeiro
  salvamento do perfil; qualquer funcionário pode apagar um registro de peso.
- [ ] `spec/chefes.md`: a foto é encolhida pelo app (640 px) e guardada no próprio banco do grupo
  (ADR-009); as tags têm no máximo 6 por chefe e 40 letras cada.
