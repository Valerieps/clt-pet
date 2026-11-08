# Spec

O que o app faz. É a fonte da verdade: quando outro documento diverge daqui, vale o spec.

- **Entra aqui:** o que o app é, para quem, as fases e qual arquivo de `spec/` cobre cada feature.
- **Não entra aqui:** as regras em si (ficam em `spec/`), o que falta construir (`ROADMAP.md`) e
  como o app é construído (`ARQUITETURA.md` e `adr/`).

## O app

O CLT Pet (Consolidação das Leis do Tutor) é o app privado em que eu e o Cesar cuidamos da saúde e
da rotina dos nossos três pets, a Berenice, o Panda e a Paçoca. Eu abro o app para nunca perder uma
vacina, um vermífugo ou uma dose de remédio e para ter tudo à mão numa emergência. Cada pet "fala"
comigo pelo app, com voz própria, e eu sou a funcionária de alto prestígio (sem remuneração) a
serviço dos chefes peludos da casa.

Só nós dois usamos: não há cadastro aberto nem mais de um grupo. O app é um PWA instalado na tela
inicial do celular de cada um, com notificação push.

## Fases

Cada fase precisa ser usável sozinha. Cada regra em `spec/` diz de que fase vale, como *(1)*.

| Fase | O que entra |
| --- | --- |
| 1 (MVP) | Perfil dos chefes, peso, Cartão SOS, carteirinha de vacinação, lembretes por push e o Mural da Chefia com a voz de cada chefe |
| 2 | Parasitas e vermífugos, condições de saúde, consultas, exames e laudos, diário do chefe, alimentação, higiene, Manual do Funcionário Temporário (link por pet sitter) |
| 3 | Central de notificações com horário de silêncio, medicação diária com trava anti-duplicidade e estoque, Dossiê para o Conselho Médico (PDF) |
| 4 | Ideias sem prioridade: ler a carteirinha física e exames por foto, Avaliação de Desempenho, Funcionário do Mês, aniversários, escore de condição corporal |

As fases 3 e 4 ganham seus arquivos em `spec/` quando chegar a vez delas. Gastos ficam fora do app.

## Arquivos

| Arquivo | O que cobre |
| --- | --- |
| [spec/acesso-e-membros.md](spec/acesso-e-membros.md) | Login com Google, convites, papéis e membros |
| [spec/chefes.md](spec/chefes.md) | Perfil dos chefes, tutoria, alergias, alimentação, peso e os dados iniciais |
| [spec/voz-dos-chefes.md](spec/voz-dos-chefes.md) | Tom de voz, tags de personalidade e a biblioteca de frases |
| [spec/cartao-sos.md](spec/cartao-sos.md) | O Cartão de Saúde: dados de emergência a dois toques |
| [spec/vacinas.md](spec/vacinas.md) | Carteirinha de vacinação, protocolos e status |
| [spec/medicacoes.md](spec/medicacoes.md) | Tratamentos (medicações): remédio, dose, frequência e período |
| [spec/lembretes.md](spec/lembretes.md) | Push, prazos e escalonamento para o funcionário reserva |
| [spec/mural.md](spec/mural.md) | O Mural da Chefia, a tela inicial |
| [spec/navegacao.md](spec/navegacao.md) | Os dois níveis, a fileira de rostos, a aura de cada chefe, as abas da página do chefe, o "Exige" e o + |
| [spec/cuidados.md](spec/cuidados.md) | Parasitas e higiene: registro, modelos, prazo e status (fase 2) |
| [spec/prazos.md](spec/prazos.md) | O planejamento de vacinas, medicações e higiene antes do primeiro registro, e a aba Prazos (fase 2) |
| [spec/saude.md](spec/saude.md) | Condições de saúde, consultas, exames e laudos, e o "algo estranho hoje" (fase 2) |
| [spec/manual-temporario.md](spec/manual-temporario.md) | O link de uma página só para o pet sitter (fase 2) |
| [spec/_modelo.md](spec/_modelo.md) | Modelo para um arquivo de feature novo |

Os termos estão definidos em [GLOSSARIO.md](GLOSSARIO.md).
