# Matriz de testes por risco

Issue original: #520  
Roadmap: #290 — Fase 1, itens 11–12  
Baseline auditado em #520: `e37c5f275ec60c9af1b4967311f2e0a771818a7d`  
Atualização de ownership/IDOR: #528, baseline `0900e45db099aeff58d48350f5ec79077ba111eb`

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
| Login / reset / signup / MFA | crítico de segurança | anti-enumeração, input bounded, reset de uso único, revogação após senha e challenge/TOTP restritos ao usuário correto | testes de auth, `app/lib/security/__tests__/mfa-challenge.test.ts`, `mfa-persistence.integration.test.ts` | coberto |
| Ownership CRUD compartilhado | crítico de segurança | recursos privados sempre limitados ao usuário autenticado | `app/lib/api/__tests__/base-crud-handler-ownership.test.ts` | coberto |
| Saldo de conta | crítico financeiro | somente `COMPLETED`; receita soma e despesa subtrai por conta | `app/lib/accounts/__tests__/account-balance.test.ts`, `account-balance.integration.test.ts` | coberto |
| Totais de calendário | crítico financeiro | somente operações concluídas normais entram nos totais | `app/lib/calendar/__tests__/completed-totals.test.ts` | coberto |
| CRUD normal de transação | crítico financeiro + segurança | lifecycle normal direto; `type` deriva da categoria; relações foreign são rejeitadas em create/update; delete opera apenas no registro owned | `transaction-crud-lifecycle.integration.test.ts`, `relation-ownership.integration.test.ts`, `base-crud-handler-ownership.test.ts` | coberto |
| Concluir transação pendente | crítico financeiro + segurança | somente `NORMAL`, `PENDING` e owned muda para `COMPLETED`; foreign não revela existência | `app/lib/transactions/__tests__/transaction-crud-complete.test.ts` | coberto |
| Guards de transfer/reconciliation | crítico financeiro | pernas de transferência e reconciliadas não aceitam mutation isolada | `transaction-transfer-guards.integration.test.ts`, `reconciliation.integration.test.ts` | coberto |
| Importação CSV/OFX | crítico financeiro + segurança | parse em centavos, ownership de conta/categoria, preview sem write, confirmação sem partial write e reimport idempotente | `app/lib/transactions/import/__tests__/parser.test.ts`, `transaction-import.integration.test.ts` | coberto |
| Regras de importação | crítico de segurança + integração | CRUD tenant-scoped e preview aplica somente regras do usuário autenticado | `import-rule-crud.integration.test.ts`, `rule-preview-handler.integration.test.ts` | coberto |
| Recorrências | crítico financeiro + segurança | datas/intervalos determinísticos, relações owned, persistência de série e rollback atômico | `logical-recurrence.test.ts`, `monthly-recurrence.test.ts`, `flexible-series.integration.test.ts`, `monthly-series.integration.test.ts`, `relation-ownership.integration.test.ts` | coberto |
| Parcelas | crítico financeiro + segurança | distribuição em centavos, série INSTALLMENT, conta/categoria owned, categoria EXPENSE e rollback | `installments.test.ts`, `installment-series.integration.test.ts`, `relation-ownership.integration.test.ts` | coberto |
| Limites mensais | crítico financeiro + segurança | limite/realizado isolados por moeda e usuário; categoria foreign rejeitada | `category-monthly-limit-schema.test.ts`, `category-monthly-limits.integration.test.ts` | coberto |
| Dashboard mensal | crítico financeiro + integração | agregações mensais coerentes com status/moeda/limites | `app/lib/dashboard/__tests__/monthly-dashboard.integration.test.ts` | coberto |
| Exportação | crítico de segurança + integração | snapshot/CSV seguro e somente dados do usuário autenticado | `app/lib/export/__tests__/user-data-export.test.ts`, `app/api/user/export/route.integration.test.ts` | coberto |
| Transferências | crítico financeiro + segurança | duas contas owned, duas pernas no mesmo tenant, saldos coerentes e lifecycle atômico | `app/lib/transfers/__tests__/create-transfer.integration.test.ts`, `lifecycle-transfer.integration.test.ts` | coberto |
| Reconciliação | crítico financeiro + segurança | mutation/read isolados por usuário e estado/auditoria consistentes | `reconciliation.integration.test.ts`, `reconciliation-confirm.integration.test.ts` | coberto |
| Forecast | crítico financeiro + segurança | projeção considera apenas contas/transações owned, ativas e da moeda selecionada | `app/lib/forecast/__tests__/forecast.integration.test.ts` | coberto |
| Mutation atômica de séries | crítico financeiro | falha intermediária não deixa série/ocorrências parcialmente persistidas | `monthly-series.integration.test.ts`, `installment-series.integration.test.ts`, `flexible-series.integration.test.ts` | coberto |
| Mutation atômica de importação | crítico financeiro + segurança | referência estrangeira rejeitada sem writes parciais | `app/lib/transactions/import/__tests__/transaction-import.integration.test.ts` | coberto |

## Atualizações dos findings

### #521 — lifecycle normal do CRUD de transação — concluído

O finding original de #520 foi fechado por uma regressão integrada direta `create → update → delete` em `transaction-crud-lifecycle.integration.test.ts`. O teste também comprova que `type` continua derivado server-side da categoria.

A auditoria #528 ampliou a prova de ownership relacional com `relation-ownership.integration.test.ts`, cobrindo conta/categoria estrangeiras em create/update e categoria estrangeira nas famílias de série.

### #529 — regra de importação estrangeira no preview — concluído

`rule-preview-handler.integration.test.ts` prova que uma regra de outro usuário não é aplicada nem inferida, mesmo quando teria prioridade maior e casaria com o item. A regra própria equivalente continua sendo aplicada e o preview permanece sem writes financeiros.

### #530 — relações estrangeiras em transactions/séries — concluído

`relation-ownership.integration.test.ts` concentra a prova de que IDs relacionais foreign são rejeitados antes de qualquer persistência parcial no CRUD normal, recorrências mensais/flexíveis e parcelamentos.

## O que não virou issue

- não foi criada meta percentual de coverage; isso não adicionaria evidência sobre as regras financeiras/security acima;
- não foi promovido E2E para contratos cobertos de forma mais determinística por testes unitários/integrados;
- a auditoria #528 não encontrou vulnerabilidade de runtime que exigisse mudança de autorização: #529 e #530 foram gaps de regressão direta, fechados com testes.

## Regra para manutenção

Ao adicionar ou alterar uma invariante financeira/security:

1. preferir teste unitário quando a regra for pura;
2. usar integração real com Prisma quando o risco estiver em ownership, constraint, transaction ou persistência;
3. para ID/relação client-controlled, incluir cenário multiusuário direto e revalidar `userId` no servidor;
4. usar E2E apenas quando o risco relevante estiver na integração completa do browser;
5. atualizar esta matriz quando surgir um novo fluxo crítico ou a evidência indicada deixar de representar o contrato.

## Estado de #520

#520 e #521 estão concluídas. A atualização #528 mantém a matriz alinhada com as regressões adicionadas posteriormente por #529 e #530.

Para detalhes de ownership/IDOR por domínio, ver `docs/quality/ownership-idor-audit-528.md`.
