# Auditoria de ownership/IDOR por domínio

Issue: #528  
Roadmap: #290 — Fase 1, Segurança, item 2  
Complementa: #304 — ownership do CRUD compartilhado  
Baseline final de cobertura: `0900e45db099aeff58d48350f5ec79077ba111eb`

## Objetivo

Confirmar que IDs e relações recebidos do cliente nunca substituem a identidade autenticada e que recursos privados permanecem isolados por usuário também nos fluxos customizados que não dependem apenas do CRUD compartilhado.

A auditoria considera um fluxo **coberto** quando existem, em conjunto:

1. escopo server-side por `userId` derivado da autenticação; e
2. regressão direta multiusuário/IDOR para a relação ou recurso crítico.

`parcial` significa que o código estava escopado corretamente, mas faltava uma regressão direta relevante. `gap` significaria comportamento que permitisse atravessar ownership; nenhum gap de runtime foi confirmado nesta auditoria.

## Resultado executivo

A implementação auditada já aplicava ownership corretamente. Foram encontrados dois gaps de **evidência automatizada**, não vulnerabilidades confirmadas:

- #529 — faltava provar que o preview de importação não aplicava regra pertencente a outro usuário;
- #530 — faltava concentrar prova direta de `accountId`/`categoryId` estrangeiros no CRUD normal e de categoria estrangeira nas famílias de série.

Os dois follow-ups foram concluídos como mudanças test-only, sem alteração de runtime.

## Matriz por domínio

| Domínio / fluxo | Relação controlada pelo cliente | Controle server-side | Evidência direta | Estado final |
| --- | --- | --- | --- | --- |
| CRUD compartilhado de conta/categoria/recursos privados | `id` do recurso | `baseCrudHandler` vincula create ao usuário e usa `{ id, userId }` em read/update/delete | `app/lib/api/__tests__/base-crud-handler-ownership.test.ts` (#304) | coberto |
| Transação normal — create/update/delete | `transactionId`, `accountId`, `categoryId` | `transactionCrud` revalida conta/categoria com `userId`; update/delete usam recurso owned | `transaction-crud-lifecycle.integration.test.ts`, `relation-ownership.integration.test.ts` (#521, #530) | coberto |
| Concluir transação pendente | `transactionId` | `updateMany` exige `id + userId + NORMAL + PENDING`; ausência/foreign retorna o mesmo 404 | `transaction-crud-complete.test.ts` | coberto |
| Recorrência mensal | `accountId`, `categoryId` | conta/categoria buscadas dentro da transação com `userId`; série/ocorrências recebem `userId` autenticado | `monthly-series.integration.test.ts`, `relation-ownership.integration.test.ts` (#530) | coberto |
| Recorrência flexível | `accountId`, `categoryId` | conta/categoria buscadas com `userId`; nenhuma série é persistida antes da validação | `flexible-series.integration.test.ts`, `relation-ownership.integration.test.ts` (#289, #530) | coberto |
| Parcelamento | `accountId`, `categoryId` | conta/categoria buscadas com `userId`; categoria ainda precisa ser `EXPENSE` | `installment-series.integration.test.ts`, `relation-ownership.integration.test.ts` (#530) | coberto |
| Limites mensais | `categoryId` | categoria é revalidada para o usuário autenticado; leitura/escrita incluem `userId` | `category-monthly-limits.integration.test.ts` | coberto |
| Importação CSV/OFX — preview/confirm | `accountId`, `categoryId` | conta/categorias são revalidadas por `userId`; confirmação é atômica | `transaction-import.integration.test.ts` | coberto |
| Regras de importação — CRUD | `ruleId`, `accountId`, `categoryId` | CRUD e relações permanecem tenant-scoped | `import-rule-crud.integration.test.ts` | coberto |
| Regras de importação — aplicação no preview | regra candidata derivada do banco | query de regras exige `userId` autenticado antes da avaliação | `rule-preview-handler.integration.test.ts` (#529) | coberto |
| Exportação | usuário do snapshot | não aceita `userId` do cliente; consulta deriva exclusivamente do usuário autenticado | `app/api/user/export/route.integration.test.ts`, `app/lib/export/__tests__/user-data-export.test.ts` | coberto |
| Transferências | `sourceAccountId`, `destinationAccountId`, transfer ID | ambas as contas são revalidadas como owned/ativas e as pernas são persistidas com o mesmo `userId` | `create-transfer.integration.test.ts`, `lifecycle-transfer.integration.test.ts`, `read-transfer.test.ts` (#284) | coberto |
| Reconciliação | `transactionId` | mutation busca/atualiza transação no escopo do usuário; foreign mantém resposta de inexistência | `reconciliation.integration.test.ts`, `reconciliation-confirm.integration.test.ts` (#286) | coberto |
| Forecast | moeda/horizonte; recursos são derivados do banco | contas/transações são selecionadas por `userId`, conta ativa e moeda | `forecast.integration.test.ts` (#287) | coberto |
| MFA / TOTP | challenge/recovery code/time-step | consumo sempre recebe o usuário do fluxo autenticado/challenge e persiste por `userId` | `mfa-persistence.integration.test.ts` e testes de challenge/setup/verify (#288) | coberto |

## Findings fechados

### #529 — isolamento de regras no preview

O código já consultava `transactionImportRule` com `where: { userId, ... }`, mas o caminho real de preview não tinha regressão multiusuário direta. O teste novo cria uma regra estrangeira com prioridade maior e uma regra própria que casa com o mesmo item; apenas a regra própria pode aparecer/aplicar-se. O preview continua sem writes financeiros.

PR: #531. CI do head: #957 (`35129110099`), verde.

### #530 — ownership das relações financeiras

`transactionCrud`, recorrências e parcelamentos já revalidavam as relações no servidor, mas a cobertura estava fragmentada. A suíte nova prova diretamente:

- create normal com conta estrangeira → rejeitado;
- create normal com categoria estrangeira → rejeitado;
- update normal para conta/categoria estrangeira → rejeitado e registro preservado;
- categoria estrangeira em recorrência mensal, flexível e parcelamento → rejeitada;
- nenhuma tentativa deixa transação ou série parcial.

PR: #532. CI do head: #958 (`35129139078`), verde.

## Fase 2 — política reutilizável de domínio

O primeiro recorte da Fase 2 / item 14 é a #534. Ele consolida apenas os guards com semântica já idêntica e repetida:

- `app/lib/accounts/account-ownership.ts` — `getOwnedActiveAccountOrThrow(tx, userId, accountId)`;
- `app/lib/categories/category-ownership.ts` — `getOwnedCategoryOrThrow(tx, userId, categoryId)`.

`transactionCrud`, recorrência mensal, recorrência flexível e parcelamento passam a usar esses guards. Checks que não são equivalentes continuam nos consumidores: recorrência flexível ainda exige categoria ativa e parcelamento ainda exige categoria `EXPENSE`.

Transferências e importação permanecem fora desse recorte porque usam validação em lote ou selects/shapes próprios. Isso evita transformar a política de ownership em repository/framework genérico e mantém queries críticas visíveis.

## Ausência de finding de runtime

Nenhum fluxo auditado exigiu correção de autorização em produção. Os dois findings eram lacunas de regressão direta. Isso é relevante para a Fase 2: a política reutilizável de autorização deve reduzir repetição comprovada, não justificar uma reescrita dos controles atuais que já estão funcionando e testados.

## Regra de manutenção

Ao introduzir um novo ID ou relação client-controlled em mutation/read autenticada:

1. derivar `userId` somente da autenticação;
2. revalidar a relação com `userId` no servidor antes do write;
3. preferir resposta que não revele existência de recurso foreign quando o contrato permitir;
4. provar pelo menos um cenário multiusuário direto para cada relação crítica;
5. em operações compostas, provar também ausência de write parcial;
6. reutilizar um guard canônico quando a semântica for realmente idêntica; manter validação local quando batch/select/regra específica diferir;
7. atualizar esta matriz quando surgir novo domínio privado.

## Referências

- #290 — roadmap técnica;
- #304 — ownership do CRUD compartilhado;
- #521 — lifecycle normal do CRUD de transação;
- #529 / PR #531 — regras de importação no preview;
- #530 / PR #532 — relações estrangeiras em transactions/séries;
- #534 — primeiro recorte da política reutilizável de domínio;
- #284 — transferências;
- #285 — regras de importação;
- #286 — reconciliação;
- #287 — forecast;
- #288 — MFA/TOTP;
- #289 — recorrências flexíveis;
- `docs/quality/risk-test-matrix.md`.
