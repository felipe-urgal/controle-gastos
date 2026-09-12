# Baseline técnico pós-Orbit

Data da coleta: **2026-09-12**.  
Issue: **#481**.  
Roadmap técnica: **#290**.

Este snapshot preserva `docs/quality/ux-performance-baseline.md` como histórico. Os números abaixo representam o estado pós-Orbit e **não sobrescrevem** as medições anteriores.

## Revisão e ambiente

Código da aplicação medido:

`9ff7f12a9d4d283a9c5e564284e5876dbb26e161`

O runner de medição executou no head temporário:

`f4a40a0f2cdd6f28a3239cc6cfa0b532bc08fba1`

Esse head difere do código da aplicação somente por arquivos temporários de coleta (`.github/workflows/performance-baseline-481.yml` e gatilho do runner). Nenhuma otimização ou alteração funcional foi incluída na medição.

Ambiente:

- GitHub Actions `ubuntu-24.04`;
- Node `v24.20.0`;
- pnpm `11.24.0`;
- PostgreSQL `17-alpine` efêmero;
- Next.js `16.3.4`;
- build de produção local via `next build` / `next start`;
- sessão autenticada de teste isolada;
- Lighthouse em perfil mobile pelo harness versionado;
- Chromium/Google Chrome disponível no runner.

Run de evidência: **34705895136**.  
Artifact: `performance-baseline-481`, ID **10302040155**, retenção de 14 dias.

## Frontend budget e bundle

`pnpm check:frontend-budget`:

| Métrica | Histórico inicial | Pós-Orbit | Limite atual |
| --- | ---: | ---: | ---: |
| JS total em `.next/static/chunks` | 1.019,4 KiB | **1.302,6 KiB** | 5.120 KiB |
| Maior chunk | 227,8 KiB | **227,7 KiB** | 700 KiB |
| Asset público individual | — | dentro do budget | 500 KiB |

O JS total cresceu **283,2 KiB (+27,8%)** em relação ao baseline de bundle histórico. O maior chunk permaneceu praticamente estável e todos os limites atuais passaram.

Cinco maiores chunks da coleta atual:

| Chunk | Tamanho |
| --- | ---: |
| `.next/static/chunks/1spqk2bci2j4e.js` | 227,7 KiB |
| `.next/static/chunks/1rqiwl9cxyutx.js` | 162,4 KiB |
| `.next/static/chunks/3xr5c1m34hdes.js` | 135,4 KiB |
| `.next/static/chunks/0cz1d0mv5g_q7.js` | 110,0 KiB |
| `.next/static/chunks/0x56f6463x6kn.js` | 95,1 KiB |

Resultado: **Frontend budget OK**.

### Drift do bundle analyzer

`pnpm analyze` terminou com sucesso, mas **não gerou relatório**. O `@next/bundle-analyzer` registrou:

> The Next Bundle Analyzer is not compatible with Turbopack builds, no report will be generated.

O comando atual, portanto, produz falso positivo para análise de bundle no toolchain vigente. Follow-up: **#482**.

Até esse tooling ser corrigido, este snapshot usa a saída objetiva do frontend budget para tamanhos de chunks, sem inventar atribuição por rota/módulo.

## Lighthouse pós-Orbit

Build de produção local, PostgreSQL efêmero e sessão autenticada isolada.

| Rota | Performance | Accessibility | Best Practices | LCP (ms) | CLS | TBT (ms) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 93 | 100 | 96 | 3.242 | 0,000 | 31 |
| `/login` | 93 | 100 | 96 | 3.175 | 0,000 | 13 |
| `/dashboard` | 92 | 100 | 100 | 3.399 | 0,000 | 61 |
| `/contas` | 88 | 100 | 100 | 3.926 | 0,000 | 35 |
| `/transacoes` | 89 | 100 | 100 | 3.844 | 0,000 | 46 |
| `/calendario` | **85** | 100 | 100 | 3.534 | **0,153** | 23 |
| `/categorias` | 88 | 100 | 100 | 3.938 | 0,000 | 30 |
| `/transacoes/importar` | 92 | 100 | 100 | 3.300 | 0,063 | 54 |

Accessibility ficou em **100 nas oito rotas** desta amostra. Best Practices ficou em 100 nas rotas autenticadas; home/login mantêm 96 como no histórico.

### Comparação com a fotografia pós-redesign v2

A comparação serve como sinal de tendência, não como benchmark A/B estrito: os heads, layout e conjunto de funcionalidades mudaram.

| Rota | Performance antes → agora | LCP antes → agora | CLS antes → agora | TBT antes → agora |
| --- | --- | --- | --- | --- |
| `/` | 94 → 93 | 3.154 → 3.242 ms | 0,000 → 0,000 | 42 → 31 ms |
| `/login` | 93 → 93 | 3.188 → 3.175 ms | 0,000 → 0,000 | 33 → 13 ms |
| `/contas` | 92 → 88 | 3.316 → 3.926 ms | 0,005 → 0,000 | 46 → 35 ms |
| `/transacoes` | 91 → 89 | 3.362 → 3.844 ms | 0,001 → 0,000 | 138 → 46 ms |
| `/calendario` | 91 → 85 | 3.456 → 3.534 ms | 0,003 → **0,153** | 69 → 23 ms |

Dashboard, Categorias e Importação não pertenciam à mesma tabela histórica consolidada e por isso não recebem comparação artificial.

### Finding de estabilidade visual do Calendário

O relatório de `/calendario` encontrou dois layout shifts. Praticamente todo o CLS (`~0,1498` de `0,153`) foi atribuído ao workspace principal:

```text
div.min-h-screen > main#main-content > div.orbit-page-container > section.grid
```

Esse nó corresponde à grade com mini-calendário, timeline financeira e próximos compromissos em `orbit-calendar.tsx`.

A coleta não presume a causa. Loading, hidratação e chegada dos dados precisam ser reproduzidos de forma focada. Follow-up: **#484**.

## Requests de aplicação no primeiro carregamento

Medição via Playwright/Chromium no mesmo build de produção. A contagem `Requests app` inclui documento/chunks/assets do mesmo origin; `API requests` considera somente `/api/*`.

| Rota | Requests app | API requests | Endpoints únicos |
| --- | ---: | ---: | --- |
| `/dashboard` | 42 | 5 | `/api/dashboard`, `/api/forecast`, `/api/user` |
| `/transacoes` | 49 | 7 | `/api/accounts`, `/api/categories`, `/api/transactions`, `/api/user` |
| `/calendario` | 43 | 4 | `/api/accounts`, `/api/transactions`, `/api/user` |
| `/transacoes/importar` | 46 | 5 | `/api/accounts`, `/api/categories`, `/api/user` |

### Duplicações observadas

A inspeção dos requests registrou:

- Dashboard: `/api/dashboard` **2x** e `/api/forecast` **2x**;
- Transações: `/api/accounts` **2x**, `/api/categories` **2x** e `/api/transactions` **2x**;
- Calendário: `/api/accounts` **2x**;
- Importação: `/api/accounts` **2x** e `/api/categories` **2x**.

`/api/user` ocorreu uma vez por rota na amostra.

Os segundos requests iniciaram depois dos primeiros, então são leituras HTTP efetivamente repetidas, não apenas uma contagem de assets. A causa raiz não foi inferida neste baseline. Follow-up: **#483**.

## Mapa de queries críticas

Este mapa é uma inspeção estática das operações Prisma nos fluxos medidos. Não é um profiler SQL nem uma medição de duração individual das queries.

### Dashboard — `/api/dashboard`

`getMonthlyDashboardForUser` concentra as leituras em um `Promise.all`, evitando N+1 aparente no fluxo principal. O recorte inclui, em lote:

1. contas ativas da moeda;
2. `groupBy` de saldo realizado por conta/tipo;
3. agregação mensal de receitas;
4. agregação mensal de despesas;
5. agregação de despesas por categoria;
6. categorias/limites necessários ao resumo.

A composição é paralela no servidor. O principal finding aqui não é N+1, mas o **request HTTP duplicado** observado no browser.

### Forecast — `/api/forecast`

O fluxo atual possui três estágios determinísticos:

1. `account.findMany` das contas ativas na moeda;
2. `transaction.groupBy` para derivar os saldos dessas contas;
3. `transaction.findMany` dos `PENDING` relevantes.

Não foi identificado N+1; as contas entram como conjunto (`in: accountIds`). Como o endpoint foi chamado 2x no carregamento medido do Dashboard, esse trabalho também é repetido até a #483 ser tratada.

### Transações — `/api/transactions`

O `baseCrudHandler` executa `findMany + count` em paralelo. Depois, quando há summary, a configuração de Transações executa uma segunda etapa com:

- `transaction.groupBy` para os agregados;
- `account.findMany` para resolver as moedas/contas do summary.

Isso forma **duas fases** (`items/count` → `summary`) e não um N+1. Não há evidência suficiente neste baseline para refatorar essa sequência isoladamente; o efeito mais claro é que o endpoint inteiro foi chamado 2x na amostra.

### Calendário

O Calendário reutiliza `/api/transactions?year=...&month=...` e `/api/accounts`.

O hook protege a busca de transações com `isFetchingTransactions`, e na amostra `/api/transactions` ocorreu uma única vez. `/api/accounts`, porém, ocorreu 2x e entra no follow-up #483.

A query de transações herda o mesmo padrão batched do CRUD/summary descrito acima. Nenhum N+1 foi confirmado.

### Importação

No carregamento inicial, a rota consulta contas e categorias; ambas foram duplicadas na amostra.

No fluxo de preview, `transaction-import.ts` usa operações em lote:

- `account.findFirst` para ownership/estado;
- `transaction.findMany` com `importFingerprint in [...]` para detectar duplicatas.

Na confirmação, dentro de transação Prisma:

- valida a conta;
- busca categorias selecionadas com `id in [...]`;
- busca fingerprints existentes com `in [...]`;
- grava itens novos com `createMany`.

Os loops de validação são em memória; não há query por item no caminho inspecionado. Nenhum N+1 foi confirmado.

## Findings

| Severidade | Finding | Ação |
| --- | --- | --- |
| P2 | `pnpm analyze` não produz relatório com Turbopack e ainda retorna sucesso | #482 |
| P2 | fetches iniciais duplicados em Dashboard, Transações, Calendário e Importação | #483 |
| P2 | `/calendario` registrou CLS 0,153; workspace principal concentra ~0,1498 | #484 |
| P3 | JS total cresceu 27,8% vs. snapshot histórico, mas permanece com ampla margem no budget e maior chunk estável | acompanhar após #482; sem otimização especulativa |
| P3 | `/contas` e `/transacoes` tiveram queda lab de Performance/LCP vs. 2026-08-30, com TBT melhor | observar em próximos baselines; sem issue isolada nesta amostra |

Nenhum P0/P1 foi identificado nesta coleta.

## Limitações

- usuário de teste foi criado em banco efêmero e não representa histórico financeiro volumoso;
- Lighthouse é lab e uma execução não substitui dados de campo;
- a comparação histórica cruza versões/layouts diferentes;
- o bundle analyzer atual não gerou decomposição por módulo/rota;
- contagem de requests mede carregamento inicial, não jornadas completas após mutations;
- o mapa Prisma é estático e não contém `EXPLAIN ANALYZE` nem tempos SQL;
- nenhum índice foi recomendado apenas por inspeção, pois faltam volume e query plan representativos.

## Decisão

O baseline pós-Orbit está coletado e reproduzível. A #481 permanece deliberadamente **sem otimização**. Os três findings com ação concreta foram separados nas issues #482, #483 e #484.

O workflow Lighthouse permanente passa a cobrir também `/categorias` e `/transacoes/importar`, para que essas superfícies não voltem a ficar fora das fotografias autenticadas.

## Referências

- #290 — roadmap técnica;
- #342 — QA final Orbit;
- #481 — coleta deste snapshot;
- #482 — bundle analyzer/Turbopack;
- #483 — fetches iniciais duplicados;
- #484 — CLS do Calendário;
- `docs/quality/ux-performance-baseline.md` — histórico;
- `scripts/check-frontend-budget.mjs`;
- `.github/workflows/lighthouse.yml`;
- `scripts/summarize-lighthouse.mjs`;
- `AGENTS.md`.
