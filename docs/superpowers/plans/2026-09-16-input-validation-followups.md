# Input validation follow-ups #497–#501 — implementation plan

Date: 2026-09-16  
Base: `8d7046737cb5fb27552a6883a3759bde09291ede`  
Branch: `fix/input-validation-followups-497-501`

## Goal

Implement the five material findings isolated by #496 in a single reviewable PR, preserving existing product/domain behavior while tightening HTTP/input contracts.

## Guardrails

- no architecture redesign or new validation framework;
- preserve server-side ownership checks and financial semantics;
- keep money in integer minor units;
- preserve login/forgot-password anti-enumeration and existing rate limits;
- do not log rejected request payloads, tokens, or secrets;
- keep changes local and test each finding before relying on CI;
- merge only when the final PR head passes the canonical CI.

## Task 1 — #497 transaction integers and logical dates

Files:
- `app/lib/transactions/transaction-schema.ts`
- `app/lib/transactions/transaction-crud.ts`
- transaction tests under `app/lib/transactions/__tests__/`

Steps:
1. Add failing tests for fractional cents/date components, impossible dates, leap-day acceptance, and partial updates that would create an impossible final date.
2. Add `.int()` to amount/year/month/day in the shared transaction contract.
3. Add a small shared logical-date predicate/refinement for create input.
4. Validate the resolved final date in `beforeUpdate` using persisted values plus partial input.
5. Preserve account/category ownership and type derivation.

## Task 2 — #498 shared CRUD malformed JSON

Files:
- `app/lib/api/request-json.ts` (small boundary helper)
- `app/lib/api/base-crud-handler.ts`
- `app/lib/api/__tests__/base-crud-handler.test.ts`

Steps:
1. Add failing create/update tests for syntactically malformed JSON returning 400.
2. Introduce a small `parseJsonBody` helper that converts only request JSON syntax failures into `HttpError(400, INVALID_JSON)`.
3. Use it in shared CRUD create/update.
4. Verify valid schema failures remain 400 and unrelated unexpected failures remain 500.

## Task 3 — #499 specialized JSON mutations

Files/families:
- category limits;
- transfers create/update;
- account/transaction reconciliation;
- transaction import confirm;
- installments;
- monthly/flexible recurrence.

Steps:
1. Add representative failing tests for malformed JSON across the specialized families, extending existing suites where possible.
2. Replace direct `request.json()` parsing with the same boundary helper.
3. Ensure each handler maps `HttpError` consistently without changing Zod/domain behavior.
4. Keep multipart import preview outside this change.

## Task 4 — #500 legacy auth payload hardening

Files:
- login/signup/forgot-password/reset-password routes;
- focused auth route tests.

Steps:
1. Add failing tests for scalar/array/null bodies, non-string fields, and oversized text.
2. Treat parsed JSON as `unknown` until object/type checks pass.
3. Add conservative explicit maxima: email 254, password 100, name 100, reset token 64 (matching generated token length).
4. Preserve signup password rules, login/forgot anti-enumeration, rate limiting, and atomic reset-token consumption.

## Task 5 — #501 observability body limit

Files:
- `app/api/observability/client-error/route.ts`
- focused route tests.

Steps:
1. Add failing test proving >1 KB body without trustworthy `Content-Length` is currently accepted/read.
2. Keep the early `Content-Length` rejection.
3. Read the request stream with a hard byte cap and stop/cancel after 1024 bytes.
4. Parse only the bounded text, accept only the existing safe digest, never log raw body.
5. Cover valid digest, malformed JSON, and oversized body with/without the header.

## Verification and delivery

1. Open a draft PR after the test-only commit and capture an expected RED CI result tied to the new regression tests.
2. Implement the five fixes without unrelated refactors.
3. Re-fetch the branch before each write; do not overwrite concurrent edits.
4. Re-run canonical PR CI on the final head and require `success`.
5. Review final diff/changed filenames and issue acceptance criteria.
6. Mark ready and merge with `expected_head_sha` only if the final head is green.
7. Confirm #497–#501 close through the merged PR body.
