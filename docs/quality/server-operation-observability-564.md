# Observabilidade de operações caras

Issue: #564  
Roadmap: #290 — Fase 3, Performance, item 35

## Objetivo

Registrar duração total e cardinalidade técnica segura das operações que podem crescer com o volume financeiro, reutilizando os Runtime Logs existentes.

Não existe APM novo, persistência de métricas no PostgreSQL nem instrumentação por query neste recorte.

## Contrato

Todo evento terminal usa `logServerOperation`, que deriva o nível pelo status HTTP e adiciona `durationMs`:

- 2xx: `info`;
- 4xx: `warn`;
- 5xx: `error`.

O erro interno de 5xx continua passando por `sanitizeError`: mensagem bruta não é registrada; somente nome e stack sanitizada.

## Eventos

| Evento | Contexto de sucesso |
| --- | --- |
| `user_data_export` | formato + counts de account/category/transaction |
| `monthly_dashboard` | moeda + counts de account/category/limit |
| `financial_forecast` | moeda + horizonte + counts de account/upcoming/overdue |
| `transaction_import_preview` | counts de item/rule/valid/invalid/duplicate |
| `transaction_import_confirm` | counts de selected/created/duplicate |

## Privacidade

O contexto foi deliberadamente limitado a cardinalidade.

Não registrar:

- identidade do usuário;
- IDs de entidade;
- nome/descrição;
- valores financeiros;
- saldos;
- nome do arquivo;
- payload;
- token;
- e-mail/IP bruto.

## Uso

A relação `durationMs × count` serve para identificar crescimento de custo sem expor o conteúdo financeiro.

Exemplos:

- export lento apenas com `transactionCount` alto → investigar volume/chunking antes de fila;
- Forecast lento com poucas contas/itens → investigar query/algoritmo;
- import preview crescendo com `itemCount`/ `ruleCount` → medir parsing/rules antes de otimizar;
- Dashboard lento com cardinalidade pequena → obter query plan antes de propor índice.

Nenhuma dessas correlações é conclusão automática. Elas indicam onde medir em seguida.

## Limite deste recorte

Não instrumentamos toda rota autenticada nem cada query Prisma. Transferências e reconciliação já possuem regressões fortes de consistência; entram em timing detalhado somente se logs/incidentes apontarem necessidade.

O item 36 da roadmap (métricas de banco) continua condicionado a gargalo medido.
