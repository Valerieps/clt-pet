# CLT Pet

Consolidação das Leis do Tutor: o app privado do casal para cuidar da saúde e da rotina de três pets, com a voz de cada chefe. Em produção em https://clt-pet.souza-pereira-valeria.workers.dev

## Rodar

```bash
cp .dev.vars.example .dev.vars
```

Ponha seu e-mail em `BOOTSTRAP_ADMIN_EMAILS` no `.dev.vars` e gere o `dist/` uma vez (o Worker
local precisa dele):

```bash
npm run build
```

Depois, em dois terminais:

```bash
npm run dev:api
```

```bash
npm run dev
```

Abra o endereço do `npm run dev` e entre pelo formulário "Entrar sem Google", que só existe neste
computador. `npm test` roda os testes; `npm run preview` serve o app como em produção.

## Ligar os avisos por push

Uma vez só. Gere o par de chaves VAPID (ADR-008):

```bash
npm run vapid
```

Cole a `VAPID_PUBLIC_KEY` em `wrangler.jsonc` (em `vars` e em `previews.vars`) e a `VAPID_PRIVATE_KEY` no
`.dev.vars`. Em produção a chave privada é um segredo:

```bash
npx wrangler secret put VAPID_PRIVATE_KEY
```

Sem a chave privada o app funciona normalmente, só sem os avisos. Em cada aparelho, abra o app e use
"Ativar avisos neste aparelho" na tela inicial (no iPhone, depois de pôr o app na tela inicial).

## Onde está cada coisa

- `CLAUDE.md`: instruções para o Claude Code e o mapa das docs.
- `docs/SPEC.md` e `docs/spec/`: o que o app faz.
- `docs/ROADMAP.md`: o que falta.
- `docs/ARQUITETURA.md` e `docs/adr/`: como o app é construído e por quê.
- `docs/SEGURANCA.md`: as regras de segurança.
