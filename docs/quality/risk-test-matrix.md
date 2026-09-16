# Matriz de testes por risco

Issue: #520  
Roadmap: #290 — Fase 1, itens 11–12  
Baseline auditado: `e37c5f275ec60c9af1b4967311f2e0a771818a7d`

## Objetivo

Esta matriz liga invariantes críticas do produto a regressões automatizadas diretas. Ela não mede qualidade por percentual bruto de cobertura: um fluxo é considerado coberto quando existe um teste determinístico que falha se a invariante relevante for quebrada.

Classificação:

- **crítico financeiro** — pode alterar saldo, valor, status, moeda, série ou atomicidade financeira;
- **crítico de segurança** — autenticação, autorização/ownership, credenciais, enumeração ou isolamento entre usuários;
- **integração** — contrato entre route/application/Prisma ou serviços internos;
- **UI/UX** — apresentação e interação sem alterar invariantes financeiras/security;
- **baixo risco** — formatting/utilidades sem efeito persistente crítico.

Status:

- **coberto** — há regressão direta para a invariante;
- **parcial** — há testes próximos, mas a invariante depende parcialmente de cobertura genérica/incidental;
- **gap** — não há regressão direta suficiente.

## Matriz prioritária

| Fluxo | Risco principal | Invariante auditada | Evidência direta | Status |
| --- | --- | --- | --- | --- |
| Auth / JWT / sessão | crítico de segurança | assinatura/issuer/audience/expiração, `authVersion`, sessão stale e usuário inativo rejeitados | `app/lib/auth/__tests__/auth-token.test.ts`, `app/lib/auth/__tests__/auth-session.test.ts` | coberto |
| Login / reset / signup / MFA | crítico de segurança | anti-enumeração, input bounded, reset de uso único, revogação após senha e challenge MFA restrito | `app/api/auth/__tests__/legacy-auth-input.test.ts`, testes de signup, `app/lib/security/__tests__/mfa-challenge.test.ts` | coberto |
| Ownership CRUD compartilhado | crítico de segurança | recursos privados sempre limitados ao usuário autenticado | `app/lib/api/__tests__/base-crud-handler-ownership.test.ts` | coberto |
| Saldo de conta | crítico financeiro | somente `COMPLETED`; receita soma e despesa subtrai por conta | `app/lib/accounts/__tests__/account-balance.test.ts`, `app/lib/accounts/__tests__/account-balance.integration.test.ts` | coberto |
| Totais de calendário | crítico financeiro | somente operações concluídas normais entram nos totais | `app/lib/calendar/__tests__/completed-totals.test.ts` | coberto |
| CRUD normal de transação | crítico financeiro + segurança | create deriva `type` da categoria do usuário; update/delete operam no registro normal correto | update específico em `transaction-date-update.integration.test.ts`; ownership genérico em `base-crud-handler-ownership.test.ts`; delete coberto em guards especiais, não no lifecycle normal | **parcial → #521** |
| Concluir transação pendente | crítico financeiro | somente `NORMAL`, `PENDING` e owned muda para `COMPLETED` | `app/lib/transactions/__tests__/transaction-crud-complete.test.ts` | coberto |
| Guards de transfer/reconciliation | crítico financeiro | pernas de transferência e reconciliadas não aceitam mutation isolada | `transaction-transfer-guards.integration.test.ts`, `reconciliation.integration.test.ts` | coberto |
| Importação CSV/OFX | crítico financeiro + segurança | parse em centavos, ownership de conta/categoria, preview sem write, confirmação sem partial write e reimport idempotente | `app/lib/transactions/import/__tests__/parser.test.ts`, `transaction-import.integration.test.ts` | coberto |
| Recorrências | crítico financeiro | datas/intervalos determinísticos, persistência de série e rollback atômico | `logical-recurrence.test.ts`, `monthly-recurrence.test.ts`, `flexible-series.integration.test.ts`, `monthly-series.integration.test.ts` | coberto |
| Parcelas | crítico financeiro | distribuição em centavos, série INSTALLMENT, regras de categoria/status e rollback | `installments.test.ts`, `installment-series.integration.test.ts` | coberto |
| Limites mensais | crítico financeiro | limite/realizado isolados por moeda e usuário | `app/lib/category-limits/__tests__/category-monthly-limit-schema.test.ts`, `category-monthly-limits.integration.test.ts` | coberto |
| Dashboard mensal | crítico financeiro + integração | agregações mensais coerentes com status/moeda/limites | `app/lib/dashboard/__tests__/monthly-dashboard.integration.test.ts` | coberto |
| Exportação | crítico de segurança + integração | snapshot/CSV seguro e rota exporta apenas dados do usuário autenticado | `app/lib/export/__tests__/user-data-export.test.ts`, `app/api/user/export/route.integration.test.ts` | coberto |
| Transferências | crítico financeiro + segurança | duas pernas pertencentes ao mesmo usuário, saldos coerentes e lifecycle atômico | `app/lib/transfers/__tests__/create-transfer.integration.test.ts`, `lifecycle-transfer.integration.test.ts` | coberto |
| Reconciliação | crítico financeiro | confirmar/desfazer mantém estado e auditoria consistentes | `reconciliation.integration.test.ts`, `reconciliation-confirm.integration.test.ts` | coberto |
| Mutation atômica de séries | crítico financeiro | falha intermediária não deixa série/ocorrências parcialmente persistidas | `monthly-series.integration.test.ts`, `installment-series.integration.test.ts` | coberto |
| Mutation atômica de importação | crítico financeiro + segurança | referência estrangeira rejeitada sem writes parciais | `app/lib/transactions/import/__tests__/transaction-import.integration.test.ts` | coberto |

## Finding material

### #521 — lifecycle normal do CRUD de transação

O caminho normal de CRUD é a única prioridade da roadmap em que create/update/delete não estão hoje reunidos em uma regressão integrada direta:

- `transactionCrud.beforeCreate` revalida conta ativa e categoria com `userId`, deriva `type` da categoria e persiste em transação;
- update possui cobertura direta de data e vários guards de casos especiais;
- delete possui cobertura de guards para transfer/reconciliation e ownership genérico do `baseCrudHandler`;
- falta uma caracterização curta do caminho feliz normal `create → update → delete` contra PostgreSQL.

Follow-up: #521.

## O que não virou issue

- não foi criada issue para auth, importação, séries, limites, dashboard, exportação ou atomicidade porque já há regressão direta suficiente para as invariantes prioritárias;
- não foi criada meta percentual de coverage; isso não adicionaria evidência sobre as regras financeiras/security acima;
- não foi promovido E2E para contratos que são cobertos de forma mais determinística por testes unitários/integrados.

## Regra para manutenção

Ao adicionar ou alterar uma invariante financeira/security:

1. preferir teste unitário quando a regra for pura;
2. usar integração real com Prisma quando o risco estiver em ownership, constraint, transaction ou persistência;
3. usar E2E apenas quando o risco relevante estiver na integração completa do browser;
4. atualizar esta matriz quando surgir um novo fluxo crítico ou a evidência indicada deixar de representar o contrato.

## Critério de conclusão de #520

#520 pode ser encerrada quando:

- esta matriz estiver integrada em `main`;
- #521 estiver concluída;
- o CI canônico do `main` final estiver verde.
