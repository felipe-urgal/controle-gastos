# Busca global

Contrato do `GET /api/search` e da telemetria. Código em `app/lib/search/`.

## Contrato

- Pesquisa por texto em transações (descrição, estabelecimento, alias, tag), contas, categorias, regras de importação, estabelecimentos, tags, modelos, dívidas e metas, sempre do usuário autenticado.
- **Não pesquisa nem retorna `amount`.** Busca por valor só poderá existir com contrato explícito que respeite `showValues` e não exponha valores em texto, acessibilidade ou logs; não ativar por padrão.
- Transações exibem o `kind` no subtítulo (`Transferência · Origem/Destino`, `Pagamento de fatura`, `Transação`).
- Destinos contextuais abrem o registro correto (`?merchantId=`, `?tagId=`, `?templateId=`, `?debtId=`, `?goalId=`, `?ruleId=`). IDs inexistentes, malformados ou de outro usuário resultam na página normal, sem editor aberto e sem revelar existência.

## Telemetria

Evento `global_search_request` com `status` (`ok` | `rate_limited` | `timeout` | `error`), `durationMs`, `queryLength` (normalizado), `fuzzyUsed`, contagem por grupo e `slow`. Timeout (cancelamento de statement `57014`, timeout de pool/conexão `P2024`/`P1008`, `TimeoutError`/`AbortError`) é distinto de erro genérico. O termo pesquisado nunca é registrado.

## Orçamento e medição de performance

Orçamento: **p95 ≤ 500 ms** (`GLOBAL_SEARCH_P95_BUDGET_MS`); alerta de lentidão em 750 ms.

Medição reproduzível (opt-in, não roda no `pnpm test`):

```bash
SEARCH_LOAD=1 pnpm exec vitest run app/lib/search/__tests__/global-search-load.integration.test.ts
```

Dataset: 6 usuários × 40.000 transações (240.000 linhas), 50 estabelecimentos e tag por usuário, `ANALYZE` antes da medição. A chamada exercita o handler completo (`getGlobalSearch`: schema, consulta, telemetria, serialização) com autenticação e rate limit substituídos; 20 amostras por padrão de consulta.

Ambiente da medição registrada: Postgres 17 (Docker `postgres:17-alpine`, configuração padrão), mesma máquina do cliente de teste, 8 vCPUs, 15 GB de RAM. Não representa a latência de rede/infra de produção: use-a como baseline relativo para detectar regressão.

### Resultado

| Versão da consulta fuzzy | p50 | p95 | máx | Orçamento |
|---|---|---|---|---|
| Subconsultas correlacionadas (2 por linha, reavaliadas na projeção) | 180 ms | **550 ms** | 651 ms | estourado |
| CTEs set-based + score calculado uma vez (atual) | 182 ms | **328 ms** | 338 ms | atendido |

Por padrão (atual, p95): exato 338 ms, prefixo 85 ms, contém 68 ms, typo 254 ms, tag 18 ms, sem resultado 253 ms. Os casos dominados por fuzzy são os mais caros, pois `word_similarity` é calculada sobre todas as transações do usuário.

### Ajuste de SQL

O plano original executava, para cada uma das 40 mil linhas, duas subconsultas correlacionadas (aliases e tags) no filtro e novamente na projeção. A consulta atual calcula os scores de alias (por estabelecimento) e de tag (por transação) uma vez em CTEs e o `GREATEST` uma única vez por linha. A semântica é idêntica e protegida por teste diferencial contra a forma correlacionada (`global-search-fuzzy-equivalence.integration.test.ts`). Nenhum índice novo foi necessário: o gargalo remanescente é o cálculo de `word_similarity` sobre as descrições do usuário.

Próximo passo, somente se o orçamento voltar a ser pressionado: pré-selecionar candidatos de descrição pelo índice trigram (`<%` com `pg_trgm.word_similarity_threshold = 0.35` na transação) e unir com os candidatos de estabelecimento/alias/tag.
