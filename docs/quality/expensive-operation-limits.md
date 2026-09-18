# Limites de operações caras

Issue: #544  
Roadmap: #290 — Fase 2, Segurança, item 16  
Baseline: `a8b29b64eadd8b0ba334f88ea6d1a8b341cf649a`

## Objetivo

Registrar e aplicar limites explícitos nas operações que podem amplificar CPU, memória, banco ou tamanho de resposta. O objetivo é impedir consultas/processamentos sem teto sem introduzir truncamento silencioso nem infraestrutura adicional.

## Matriz

| Operação | Contrato | Implementação | Estado |
| --- | --- | --- | --- |
| paginação solicitada | máximo 100 itens por `pageSize` ou `limit` | `app/lib/api/base-crud-handler.ts` | coberto |
| listagem não paginada opt-in | máximo 1000 registros; acima disso retorna `PAGINATION_REQUIRED` | `limit: true` no CRUD de transactions | #544 |
| exportação completa | 10 solicitações/usuário em 1 h; bloqueio 1 h; sem truncamento | limiter PostgreSQL antes do snapshot | #544 |
| importação | arquivo <= 2 MB; <= 1000 itens; 30 operações/usuário em 15 min | parser + policy de rate limit | coberto |
| forecast | horizonte permitido somente 30, 60 ou 90 dias | `forecastQuerySchema` | coberto |
| recorrência mensal | máximo 60 ocorrências | `MAX_MONTHLY_OCCURRENCES` | coberto |
| recorrência flexível | máximo 60 ocorrências | `MAX_RECURRENCE_OCCURRENCES` | coberto |
| parcelamento | máximo 60 parcelas | reutiliza `MAX_MONTHLY_OCCURRENCES` | coberto |
| batches financeiros atuais | importação <= 1000; séries <= 60; transferência possui cardinalidade fixa de 2 pernas | contratos dos próprios fluxos | coberto |

## Decisões

### Listagem sem paginação

`transactions` mantém o comportamento não paginado usado por algumas superfícies atuais, mas a consulta passa a ter teto absoluto de 1000. Se o total filtrado exceder esse número, a API falha explicitamente com `400 / PAGINATION_REQUIRED`; não devolve os primeiros 1000 como se fossem o conjunto completo.

A padronização de paginação default, tamanho default, UX e ordenação estável entre listas permanece no item 23 da roadmap. O item 16 apenas remove a possibilidade de uma consulta opt-in crescer sem teto.

### Exportação

Exportação é uma leitura excepcionalmente cara: materializa contas, categorias e todas as transações em um snapshot `RepeatableRead`. Por isso recebe rate limit dedicado de 10/hora por usuário autenticado.

O resultado permitido continua completo. Não foi introduzido limite de linhas que pudesse produzir portabilidade parcial. Se volume real passar a exceder limites de runtime, a estratégia de chunking/processamento assíncrono pertence ao item 37 e deve ser adotada após medição.

### Leituras comuns

GETs comuns continuam sem contador PostgreSQL persistido. Forecast usa horizonte fechado; listagens usam limites de contrato; não há motivo para transformar toda leitura autenticada em write de controle.

## Evidência

Regressões cobrem:

- teto paginado de 100;
- teto não paginado de 1000 e erro explícito acima dele;
- parâmetros do limiter de exportação;
- `429 + Retry-After` antes do snapshot;
- ausência de mudança nos limites já existentes de importação/forecast/séries.
