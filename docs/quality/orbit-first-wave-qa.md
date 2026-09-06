# QA — Primeira onda Orbit

Status: **rodada corretiva integrada em `main`; gates técnicos concluídos; QA visual/acessível pós-integração permanece aberta na #342**.

Issue de coordenação: #342.

## Regra de aceite

Os protótipos explicitamente aprovados são especificações visuais normativas. A implementação deve reproduzir hierarquia, ordem, agrupamentos, proporções, densidade, superfícies, interações e comportamento responsivo usando contratos reais do produto.

CI verde não substitui execução em navegador/dispositivo. Da mesma forma, protótipo não autoriza inventar feature, dado ou semântica financeira.

Uma diferença só é aceitável quando houver incompatibilidade concreta com domínio, contrato funcional, segurança, privacidade ou acessibilidade e ela estiver documentada.

## Histórico da rodada

Auditoria estática inicial: 06/09/2026 sobre `main` em:

`e52e4b28f5ca5bc6e77ffd4c1f435e327192f790`

A auditoria abriu cinco correções P1:

- #354 / PR #363 — Dashboard;
- #355 / PR #361 — Transações + shell/sidebar;
- #356 / PR #362 — Contas;
- #357 / PR #360 — Calendário;
- #358 / PR #364 — Categorias/Limites.

O PR #359 formalizou que o protótipo Orbit aprovado é **especificação visual normativa**, não referência aproximada.

## Estado integrado final

Revision final da rodada corretiva em `main`:

`438646caa1f2eff6d4abfaad6946e35b15355ac4`

| Escopo | PR | Merge commit | Estado |
| --- | ---: | --- | --- |
| Especificação/docs | #359 | `730a18c67b1bfb335a6db7e925855c582b9049bc` | ✅ integrado |
| Calendário | #360 | `7e9fc68914f4f9abaa58c2a03e7afe1868f83ec4` | ✅ integrado |
| Transações | #361 | `e3e8bd367afaaedc5ce37375c9e8c0f515124060` | ✅ integrado |
| Contas | #362 | `f86beb4bce4209b09d33074b21d685d9d5500c26` | ✅ integrado |
| Dashboard | #363 | `ef1b53484cdaf25de08c59b646f1d8767f8e7470` | ✅ integrado |
| Categorias | #364 | `438646caa1f2eff6d4abfaad6946e35b15355ac4` | ✅ integrado |

As corretivas #354–#358 foram encerradas como **implementação técnica concluída**. A validação visual real permanece centralizada na #342.

## Gates técnicos executados

Os cinco PRs de código passaram `pnpm check` e auto code review antes do merge. Findings técnicos encontrados durante a rodada foram corrigidos antes da integração.

### Dashboard

- navegação interna e Mapa do mês restaurados como composição principal;
- mobile usa composição própria;
- Forecast passou a usar apenas contrato real (`/api/forecast`, service, hook e tipos), sem materializar ocorrências;
- saldo projetado, atenção e próximos compromissos usam dados reais;
- lifecycle do modal de Forecast cobre foco, `Escape`, scroll lock e restauração de foco;
- `showValues`, moedas e navegação read-only foram preservados.

### Transações

- topo/resumo/Inbox/Histórico foram reorganizados conforme a referência aprovada;
- detalhe contextual desktop e sheets mobile preservam o workspace;
- seleção do Histórico deixou de depender de efeito síncrono;
- lifecycle de dialogs foi estabilizado para foco, `Escape`, scroll lock e restauração de foco;
- `Importadas recentemente` permanece fora porque `importSource` não é exposto pelo `TransactionDTO` público; nenhuma heurística foi criada.

### Contas

- resumo, lista densa, master-detail desktop e detalhe mobile foram restaurados;
- `showValues=false` cobre saldo, detalhe e movimentações recentes;
- seleção é derivada e não executa write;
- o domínio só possui `CREDIT_DEBIT` e `INVESTMENT`; a UI usa `Bancos e carteiras` em vez de inventar distinção entre banco/carteira;
- Transferências continuam sem UI enquanto os guardrails da #284 não autorizarem o fluxo.

### Calendário

- mini-calendário voltou a ser contexto e a timeline a superfície principal;
- clicar no dia apenas seleciona/atualiza a timeline;
- clicar em evento/compromisso abre o detalhe;
- navegação continua read-only e `showValues` foi preservado.

### Categorias/Limites

- Spending Map e atenção voltaram a ser superfície principal;
- Receitas permanecem acessíveis sem contaminar agregados de despesas/limites;
- administração completa ficou em camada secundária;
- findings de TypeScript/efeitos foram corrigidos;
- cliente HTTP omite query params `null`/`undefined` em vez de serializá-los.

## Invariantes preservadas

- `COMPLETED` continua sendo o único realizado;
- `PENDING` e `CANCELLED` não entram silenciosamente no realizado;
- saldos permanecem derivados das transações elegíveis;
- BRL/USD/EUR não são somados nem convertidos implicitamente;
- `showValues=false` cobre as novas superfícies monetárias;
- navegação/seleção não executa write;
- diferenças do protótipo não são preenchidas com heurísticas ou dados fictícios.

## Matriz visual pós-integração — pendente

A integração técnica não produz, por si só, evidência visual. Nenhuma célula abaixo deve ser marcada como validada apenas por inspeção estática ou CI.

Revision alvo inicial da QA visual:

`438646caa1f2eff6d4abfaad6946e35b15355ac4`

| Rota | 320px | 360/390px | 768px | desktop | dark/light | showValues | teclado/foco | lado a lado | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | pendente |
| Transações | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | pendente |
| Contas | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | pendente |
| Calendário | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | pendente |
| Categorias | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | pendente |

Também validar:

- comparação protótipo × implementação por rota;
- zoom/reflow 200%;
- valores e nomes longos;
- loading/error/empty quando reproduzíveis;
- `prefers-reduced-motion`;
- touch targets críticos;
- nenhuma informação financeira dependente somente de cor/geometria;
- nenhuma regressão nas ações existentes.

## Deployment e evidência de produção

O contrato operacional vigente continua sendo o do PR #315:

- `vercel.json` mantém `git.deploymentEnabled=false`;
- merge no GitHub não implica deployment automático;
- promoção é explícita via Dev Dashboard/API;
- sequência esperada: `check → migrate` quando aplicável `→ provider-deploy → verify`.

Portanto, a #342 só deve registrar produção como validada após promoção explícita da revision alvo e health/verify correspondente.

## Critério de encerramento da #342

A #342 permanece aberta após o merge técnico. Ela só deve ser encerrada quando:

- a revision integrada alvo (ou sucessora explicitamente registrada) estiver promovida e saudável;
- a matriz visual/acessível tiver evidência real;
- houver comparação lado a lado por rota/breakpoint relevante;
- nenhum finding P0/P1 conhecido ficar sem correção ou issue explícita;
- este documento refletir a decisão final de aceite.

Qualquer finding visual novo deve ser aberto como issue filha da #342, com severidade e evidência, em vez de reabrir silenciosamente uma das corretivas técnicas já concluídas.
