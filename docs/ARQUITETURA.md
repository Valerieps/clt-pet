# Arquitetura

O desenho técnico que o código não mostra sozinho.

- **Entra aqui:** as invariantes (o que precisa ser sempre verdade), o modelo de dados, o fluxo de
  eventos e as migrações.
- **Não entra aqui:** um passeio pelos arquivos (o código mostra), o porquê de cada decisão (`adr/`),
  o que falta construir (`ROADMAP.md`) e as regras de produto (`spec/`).

## Visão geral

- **App:** web app (Vite + React + TypeScript), instalável (PWA). Fala só com a própria origem.
- **Servidor:** um Cloudflare Worker serve os arquivos do app, a API em `/api`, a conexão ao vivo e
  o cron. Todos os dados do grupo ficam num único Durable Object, `Group`, com SQLite. Ver ADR-004.
- **Login:** Google, pelo fluxo de código OAuth no Worker, com cookie de sessão. Ver ADR-005.

```
app (celular) ──POST /api/query|command──► Worker ──RPC──► Group (Durable Object, SQLite)
     ▲                                       ▲                    │
     └──────── WebSocket /api/live ──────────┘                    │ "mudou: members, invites…"
                                             cron 5 min ──► tick  ▼
                                                     todos os apps abertos refazem a consulta
```

## Camadas

`domain` ← `application` ← `infrastructure` e `ui`, no app e no servidor.

- `src/domain/`: regras puras e os textos da interface (`strings.ts`). O app e o servidor usam o
  mesmo código.
- `src/application/api-contract.ts`: os nomes, entradas e saídas das consultas e dos comandos. É só
  tipo; o servidor importa com `import type`.
- `server/application/`: os casos de uso do servidor. Síncronos, dependem só das portas `Sql`,
  `Clock` e `IdGenerator`; os testes rodam sobre `node:sqlite`.
- `server/infrastructure/` e `server/entry/`: Cloudflare, Google, cookies. Finos.
- A interface chama `Backend` e `LiveUpdates` (portas em `src/application/ports.ts`), nunca a rede
  direto.

## Invariantes

- Só o servidor grava. O app não tem acesso ao banco; toda escrita é um comando que o `Group`
  confere (sessão, papel, regra) e grava numa transação só.
- Um comando roda sozinho: o Durable Object processa uma chamada por vez, e tudo o que o comando
  causa entra junto ou não entra.
- Papéis são conferidos no servidor, nunca só na interface.
- Sempre existe pelo menos um admin.
- A sessão vale só enquanto o membro está ativo. Remover alguém apaga as sessões dele e fecha os
  WebSockets abertos (o comando devolve `disconnect`), então o acesso acaba na hora.
- Um comando devolve os tópicos (`Topic`) que mudou; o `Group` avisa todos os apps abertos, que
  refazem as consultas desses tópicos.

## Modelo de dados

| Tabela | Campos principais | Observação |
| --- | --- | --- |
| `members` | `id`, `google_sub`, `email`, `name`, `photo_url`, `roles` (JSON), `active` | Removido fica com `active = 0`; um convite novo traz o mesmo membro de volta |
| `sessions` | `token_hash`, `member_id`, `expires_at` | Só o SHA-256 do token; o cron apaga as vencidas |
| `invites` | `email`, `invited_by`, `state` (`pending`, `accepted`, `revoked`) | Um por e-mail |
| `pets` | `id`, `name`, `species`, `breed`, `birth_date`, `birth_estimated`, `sex`, `neutered`, `microchip`, `food_kind`, `food_brand`, `food_daily`, `allergies_answered`, `weight_alert_percent`, `tutor_member_id`, `tutor_email`, `serious_mode`, `vet_name`, `vet_phone`, `clinic_name`, `clinic_phone`, `clinic_address`, `plan_name`, `plan_number` (Cartão SOS), `retired_at` | Os três pets nascem numa migração; `tutor_email` liga o pet ao membro: o login preenche `tutor_member_id`, e trocar o responsável grava os dois |
| `pet_tags` | `pet_id`, `tag` | Sem uso: as tags de personalidade saíram do app. A tabela fica até uma migração removê-la |
| `pet_photos` | `pet_id`, `image` (JPEG em base64), `updated_at` | Uma foto por pet; `updated_at` é a versão no endereço da imagem (ADR-009) |
| `pet_allergies` | `pet_id`, `kind` (`drug`, `food`), `description` | Em vermelho no perfil e no Cartão SOS |
| `weights` | `id`, `pet_id`, `grams`, `on_date`, `member_id`, `created_at` | Quem pesou fica no registro |
| `vaccinations` | `pet_id`, `vaccine`, `applied_on`, `next_due_on`, `batch`, `maker`, `vet`, `member_id` | `next_due_on` vem do protocolo e é editável |
| `medications` | `pet_id`, `name`, `dose`, `frequency`, `start_on`, `end_on`, `member_id` | `end_on` nulo é uso contínuo; `frequency` é uma de seis chaves fixas |
| `push_subscriptions` | `endpoint`, `member_id`, `p256dh`, `auth` | Um por aparelho; o endpoint só pode ser de uma origem de ADR-008 |
| `reminders_sent` | `pet_id`, `item`, `due_on`, `stage` (`30d`, `7d`, `due`, `escalated`), `sent_at` | Evita avisar duas vezes |
| `care_records` | `pet_id`, `category` (`parasite`, `hygiene`), `item`, `done_on`, `interval_days`, `note`, `member_id` | O próximo prazo é `done_on` + `interval_days`, calculado, nunca guardado |
| `plans` | `pet_id`, `kind` (`vaccine`, `parasite`, `hygiene`, `visit`), `item`, `due_on`, `interval_days`, `dose` (só `parasite`), `member_id` | O prazo planejado (`spec/prazos.md`). Enquanto existe, decide a data do item; `vaccine.add` e `care.add` apagam o do mesmo item; `visit.add` de uma consulta já feita com o mesmo assunto empurra o `due_on` do `visit` e o mantém |
| `conditions` | `pet_id`, `name`, `grave`, `since`, `notes`, `resolved_on`, `member_id` | `resolved_on` nulo é condição ativa |
| `visits` | `pet_id`, `kind` (`consulta`, `exame`, `laudo`), `on_date`, `title`, `vet`, `notes`, `return_on`, `member_id` | `return_on` vira lembrete |
| `diary` | `pet_id`, `on_date`, `text`, `member_id` | |
| `meals` | `pet_id`, `at` (HH:MM), `amount`, `note` | |
| `sitter_links` | `token`, `label`, `pet_ids` (JSON), `note`, `expires_on`, `revoked_at`, `member_id` | O token é a credencial do pet sitter (ADR-010) |

Em `pets`, a tutoria emprestada usa `tutor_until`, `tutor_return_member_id` e `tutor_return_email`;
`retired_at` aposenta o pet, e toda consulta das features filtra `retired_at IS NULL`.

## Fluxo de eventos

O cron de 5 minutos chama `GroupService.tick`. Primeiro ele devolve as tutorias emprestadas cujo dia
chegou (e avisa os apps abertos com o tópico `pets`). Depois vêm os lembretes: cada feature com prazo
registra uma `ReminderSource` (vacinas, medicações, retornos de consulta), que diz o item, o
prazo e a aba da página do pet que o aviso abre. Às 9h de Brasília, o `tick` grava em `reminders_sent` o estágio devido (30 dias, 7 dias,
no dia, 24 h depois para o reserva) e envia o push, tudo na mesma transação. Um estágio já gravado não
é enviado de novo. A frase vem de `src/domain` (voz-dos-pets.md), nunca do servidor.

## A página do pet sitter

A única leitura sem sessão. `GET /api/temporario/<token>` (e `.../foto/<petId>`) vai direto ao
`Group`, que só responde se o link existe, não foi desativado e não venceu (no dia de Brasília), e
devolve só os campos de `SitterManualView`. No app, `/temporario/<token>` é desenhado antes do login.
Ver ADR-010.

## Migrações

`MIGRATIONS` em `server/application/schema.ts` é uma lista numerada; o `Group` aplica as que faltam
ao iniciar, cada uma numa transação, e registra em `schema_migrations`. Uma migração publicada nunca
muda: a mudança seguinte é uma migração nova. Remover uma coluna leva duas versões: primeiro o código
para de usar, depois a coluna sai. A classe do Durable Object tem suas próprias migrações no
`wrangler.jsonc` (`tag`), que também só crescem.
