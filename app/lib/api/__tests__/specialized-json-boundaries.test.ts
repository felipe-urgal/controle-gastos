import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

const rateLimitMocks = vi.hoisted(() => ({
  consumeImportRateLimit: vi.fn(),
  consumeTransactionMutationRateLimit: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

vi.mock("@/app/lib/security/application-rate-limit", () => ({
  consumeImportRateLimit: rateLimitMocks.consumeImportRateLimit,
  consumeTransactionMutationRateLimit:
    rateLimitMocks.consumeTransactionMutationRateLimit,
}));

import { POST as confirmAccountReconciliation } from "@/app/api/accounts/[id]/reconciliation/route";
import { POST as undoAccountReconciliation } from "@/app/api/accounts/[id]/reconciliation/undo/route";
import { upsertCategoryMonthlyLimit } from "@/app/lib/category-limits/category-monthly-limits";
import { importRuleCrud } from "@/app/lib/transactions/import/import-rule-crud";
import { confirmTransactionImport } from "@/app/lib/transactions/import/transaction-import";
import { createInstallmentTransactions } from "@/app/lib/transactions/installment-series";
import { createMonthlyRecurringTransactions } from "@/app/lib/transactions/monthly-series";
import { createFlexibleRecurringTransactions } from "@/app/lib/transactions/flexible-series";
import { updateTransactionReconciliation } from "@/app/lib/transactions/reconciliation";

function malformedRequest(path: string, method = "POST") {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: '{"broken":',
  });
}

const context = { params: Promise.resolve({ id: "entity-1" }) };

describe("specialized JSON mutation boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.getAuthenticatedUserId.mockResolvedValue("user-1");
    rateLimitMocks.consumeImportRateLimit.mockResolvedValue({
      limited: false,
      retryAfterSeconds: 0,
    });
    rateLimitMocks.consumeTransactionMutationRateLimit.mockResolvedValue({
      limited: false,
      retryAfterSeconds: 0,
    });
  });

  it("returns 400 for malformed category-limit JSON", async () => {
    const response = await upsertCategoryMonthlyLimit(
      malformedRequest("/api/category-limits", "PUT"),
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for malformed account reconciliation JSON", async () => {
    const response = await confirmAccountReconciliation(
      malformedRequest("/api/accounts/entity-1/reconciliation"),
      context,
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for malformed reconciliation undo JSON", async () => {
    const response = await undoAccountReconciliation(
      malformedRequest("/api/accounts/entity-1/reconciliation/undo"),
      context,
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for malformed transaction reconciliation JSON", async () => {
    const response = await updateTransactionReconciliation(
      malformedRequest("/api/transactions/entity-1/reconciliation", "PATCH"),
      context,
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for malformed import-rule update JSON", async () => {
    const response = await importRuleCrud.update(
      malformedRequest("/api/import-rules/entity-1", "PUT"),
      context,
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for malformed import confirmation JSON", async () => {
    const response = await confirmTransactionImport(
      malformedRequest("/api/transactions/import/confirm"),
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for malformed installment JSON", async () => {
    const response = await createInstallmentTransactions(
      malformedRequest("/api/transactions/installments"),
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for malformed monthly recurrence JSON", async () => {
    const response = await createMonthlyRecurringTransactions(
      malformedRequest("/api/transactions/recurring"),
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for malformed flexible recurrence JSON", async () => {
    const response = await createFlexibleRecurringTransactions(
      malformedRequest("/api/transactions/recurring/flexible"),
    );
    expect(response.status).toBe(400);
  });
});
