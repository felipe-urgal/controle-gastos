# Transaction CRUD Lifecycle Regression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one deterministic integration regression for the normal transaction CRUD lifecycle without changing production behavior.

**Architecture:** Exercise the existing `transactionCrud` handlers directly against the real test PostgreSQL database, using the same auth mock pattern as neighboring transaction integration tests. Create an owned account and EXPENSE category, intentionally submit `type: INCOME`, verify server-side category derivation wins, then update and delete the same NORMAL transaction.

**Tech Stack:** TypeScript, Vitest, Prisma/PostgreSQL, Next.js Request handlers.

**Spec:** `docs/quality/risk-test-matrix.md` in #520 and issue #521.

## Global Constraints

- Keep money as integer centavos.
- Ownership is derived server-side from the authenticated user.
- Do not change production code if current behavior satisfies the regression.
- Use a local per-test fixture; no global fixture layer.
- Canonical CI / `pnpm check` must be green before merge.

---

### Task 1: Cover the normal transaction CRUD lifecycle

**Files:**
- Create: `app/lib/transactions/__tests__/transaction-crud-lifecycle.integration.test.ts`

**Interfaces:**
- Consumes: `transactionCrud.create`, `transactionCrud.update`, `transactionCrud.remove`, Prisma test database, mocked `getAuthenticatedUserId`.
- Produces: direct regression evidence for #521; no production API changes.

- [ ] **Step 1: Create an isolated fixture**

Create one user, one active BRL account and one EXPENSE category owned by that user. Mock `getAuthenticatedUserId` to return that user ID and delete the user in `afterEach` so relations cascade.

- [ ] **Step 2: Characterize create**

Call `transactionCrud.create` with amount `12_345`, a valid logical date, the owned account/category, status `PENDING`, and deliberately send `type: "INCOME"`.

Assert response `201`, then read the row from Prisma and verify:

```ts
expect(created).toMatchObject({
  amount: 12_345,
  description: "Compra planejada",
  status: "PENDING",
  type: "EXPENSE",
  kind: "NORMAL",
  accountId: account.id,
  categoryId: category.id,
  userId: user.id,
});
```

This proves `type` remains derived from the owned category instead of trusted from client input.

- [ ] **Step 3: Characterize update**

Call `transactionCrud.update` for the created ID with:

```ts
{
  amount: 10_000,
  description: "Compra ajustada",
  status: "COMPLETED"
}
```

Assert response `200` and persisted values match while ownership/account/category remain unchanged.

- [ ] **Step 4: Characterize delete**

Call `transactionCrud.remove` for the same ID. Assert a successful response and then:

```ts
expect(
  await prisma.transaction.findUnique({ where: { id: transaction.id } })
).toBeNull();
```

- [ ] **Step 5: Verify**

Run canonical CI. If the regression passes with no production edit, keep this as test-only characterization. If it fails because the current runtime violates the documented contract, do not weaken the test: create a minimal RED→GREEN production fix before merge.

- [ ] **Step 6: Commit and merge gates**

Commit only the plan/test evidence, update the PR description with the observed result, and merge only when exact-head CI is green and the PR is mergeable.
