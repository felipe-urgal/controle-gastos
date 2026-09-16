# Plano de implementação — #534

## Objetivo

Consolidar apenas os guards de ownership com semântica repetida e já coberta por regressões, sem alterar contratos públicos nem criar framework genérico.

## Escopo

- `getOwnedActiveAccountOrThrow(tx, userId, accountId)` em `app/lib/accounts/account-ownership.ts`;
- `getOwnedCategoryOrThrow(tx, userId, categoryId)` em `app/lib/categories/category-ownership.ts`;
- migrar `transaction-crud.ts`, `monthly-series.ts`, `flexible-series.ts` e `installment-series.ts`;
- preservar `category.isActive` no fluxo flexível;
- preservar `category.type === EXPENSE` no parcelamento;
- manter transferências/importação fora do recorte;
- atualizar `docs/quality/ownership-idor-audit-528.md`.

## Validação

Mudança refactor-only apoiada pelas regressões existentes de ownership e séries. CI canônico do head precisa passar migrations e `Quality gate` antes do merge.
