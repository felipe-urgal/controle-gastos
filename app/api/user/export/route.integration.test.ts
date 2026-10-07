import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

const rateLimitMocks = vi.hoisted(() => ({
  consumeDataExportRateLimit: vi.fn(),
}));

const observabilityMocks = vi.hoisted(() => ({
  logServerOperation: vi.fn(),
}));

vi.mock("@/app/lib/observability", () => ({
  getRequestId: (request: Request) =>
    request.headers.get("x-request-id") ?? "test-request-12345678",
  withRequestId: (response: Response, requestId: string) => {
    response.headers.set("x-request-id", requestId);
    return response;
  },
  logServerOperation: observabilityMocks.logServerOperation,
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

vi.mock("@/app/lib/security/application-rate-limit", () => ({
  consumeDataExportRateLimit: rateLimitMocks.consumeDataExportRateLimit,
}));

import { prisma } from "@/app/lib/prisma";
import { GET } from "@/app/api/user/export/route";

const createdUserIds: string[] = [];

async function createUserData(label: string) {
  const suffix = randomUUID();
  const user = await prisma.user.create({
    data: {
      name: `Usuário ${label}`,
      email: `export-${label}-${suffix}@example.test`,
      password: `hash-${label}-nao-exportar`,
      showValues: label !== "owner",
      periodicSummaryEnabled: label === "owner",
    },
  });
  createdUserIds.push(user.id);

  const account = await prisma.account.create({
    data: {
      name: `Conta ${label}`,
      type: "CREDIT_DEBIT",
      currency: "BRL",
      isActive: false,
      userId: user.id,
    },
  });

  const category = await prisma.category.create({
    data: {
      name: `Categoria ${label}`,
      type: "EXPENSE",
      isActive: false,
      userId: user.id,
    },
  });

  const tag = await prisma.tag.create({
    data: {
      name: `Tag ${label}`,
      normalizedName: `tag ${label}`,
      isActive: false,
      userId: user.id,
    },
  });

  const transaction = await prisma.transaction.create({
    data: {
      amount: label === "owner" ? 12345 : 98765,
      year: 2026,
      month: 8,
      day: 30,
      type: "EXPENSE",
      description:
        label === "owner"
          ? 'Mercado, "Centro"\n=HYPERLINK("https://example.test")'
          : "Dado de outro usuário",
      status: "COMPLETED",
      accountId: account.id,
      categoryId: category.id,
      userId: user.id,
    },
  });

  const merchant = await prisma.merchant.create({
    data: {
      name: `Mercado ${label}`,
      normalizedName: `mercado ${label}`,
      userId: user.id,
    },
  });

  const goal = await prisma.financialGoal.create({
    data: {
      name: `Meta ${label}`,
      targetAmount: 50_000,
      currency: "BRL",
      userId: user.id,
      accountId: account.id,
    },
  });

  const investmentAsset = await prisma.investmentAsset.create({
    data: {
      symbol: `TST${label.slice(0, 1).toUpperCase()}`,
      name: `Ativo ${label}`,
      type: "STOCK",
      currency: "BRL",
      userId: user.id,
    },
  });

  const periodicSummary = await prisma.periodicFinancialSummary.create({
    data: {
      currency: "BRL",
      periodStartYear: 2026,
      periodStartMonth: 8,
      periodStartDay: 24,
      periodEndYear: 2026,
      periodEndMonth: 8,
      periodEndDay: 30,
      content: { summary: `Resumo ${label}` },
      userId: user.id,
    },
  });

  const mcpToken = await prisma.mcpAccessToken.create({
    data: {
      name: `Token ${label}`,
      tokenHash: (label === "owner" ? "a" : "b").repeat(64),
      tokenPrefix: label === "owner" ? "mcp_owner" : "mcp_other",
      scope: "finance:read",
      expiresAt: new Date("2027-01-01T00:00:00.000Z"),
      userId: user.id,
    },
  });

  return {
    user,
    account,
    category,
    tag,
    transaction,
    merchant,
    goal,
    investmentAsset,
    periodicSummary,
    mcpToken,
  };
}

async function ownedCounts(userId: string) {
  const [accounts, categories, tags, transactions] = await Promise.all([
    prisma.account.count({ where: { userId } }),
    prisma.category.count({ where: { userId } }),
    prisma.tag.count({ where: { userId } }),
    prisma.transaction.count({ where: { userId } }),
  ]);

  return { accounts, categories, tags, transactions };
}

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds.splice(0) } },
    });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(() => {
  vi.clearAllMocks();
  rateLimitMocks.consumeDataExportRateLimit.mockResolvedValue({
    limited: false,
    retryAfterSeconds: 0,
  });
});

describe("GET /api/user/export", () => {
  it("exports a JSON snapshot only for the authenticated user without sensitive fields or financial writes", async () => {
    const owner = await createUserData("owner");
    const other = await createUserData("other");
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.user.id);
    const before = await ownedCounts(owner.user.id);

    const response = await GET(
      new Request("http://localhost/api/user/export?format=json", {
        headers: { "x-request-id": "export-test-json" },
      })
    );
    const text = await response.text();
    const body = JSON.parse(text);
    const after = await ownedCounts(owner.user.id);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("content-disposition")).toMatch(
      /^attachment; filename="controle-gastos-\d{4}-\d{2}-\d{2}\.json"$/
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-request-id")).toBe("export-test-json");

    expect(body).toMatchObject({
      formatVersion: 5,
      kind: "logical-portability-snapshot",
      profile: {
        id: owner.user.id,
        email: owner.user.email,
        showValues: false,
        periodicSummaryEnabled: true,
      },
      manifest: {
        schema: "controle-gastos.user-data",
      },
    });

    expect(body.data.accounts).toHaveLength(1);
    expect(body.data.categories).toHaveLength(1);
    expect(body.data.tags).toHaveLength(1);
    expect(body.data.transactions).toHaveLength(1);
    expect(body.data.merchants).toHaveLength(1);
    expect(body.data.financialGoals).toHaveLength(1);
    expect(body.data.investmentAssets).toHaveLength(1);
    expect(body.data.periodicFinancialSummaries).toHaveLength(1);
    expect(body.data.mcpAccessTokens).toHaveLength(1);

    expect(body.data.accounts[0]).toMatchObject({
      id: owner.account.id,
      isActive: false,
    });
    expect(body.data.categories[0]).toMatchObject({
      id: owner.category.id,
      isActive: false,
    });
    expect(body.data.tags[0]).toMatchObject({
      id: owner.tag.id,
      name: "Tag owner",
      is_active: false,
    });
    expect(body.data.transactions[0]).toMatchObject({
      id: owner.transaction.id,
      amount: 12345,
      year: 2026,
      month: 8,
      day: 30,
    });
    expect(body.data.merchants[0].id).toBe(owner.merchant.id);
    expect(body.data.financialGoals[0].id).toBe(owner.goal.id);
    expect(body.data.investmentAssets[0].id).toBe(owner.investmentAsset.id);
    expect(body.data.periodicFinancialSummaries[0].id).toBe(
      owner.periodicSummary.id,
    );
    expect(body.data.mcpAccessTokens[0]).toMatchObject({
      id: owner.mcpToken.id,
      token_prefix: "mcp_owner",
      scope: "finance:read",
    });
    expect(body.data.mcpAccessTokens[0]).not.toHaveProperty("token_hash");

    expect(body.manifest.domains).toEqual(Object.keys(body.data));
    expect(body.manifest.domains).toEqual(
      expect.arrayContaining([
        "categoryMonthlyLimits",
        "importRules",
        "reconciliationEvents",
        "merchantAliases",
        "transactionAllocations",
        "transactionTemplates",
        "transactionSeries",
        "subscriptionReviews",
        "recurrencePatternReviews",
        "transfers",
        "creditCardPayments",
        "financialGoalEntries",
        "exchangeRates",
        "debtAdjustments",
        "investmentFiscalEvents",
        "investmentTaxWithholdings",
        "investmentTaxPayments",
        "payrollDocuments",
        "annualEmploymentIncomeStatements",
      ]),
    );

    const safePayload = JSON.stringify({
      profile: body.profile,
      data: body.data,
    });
    expect(safePayload).not.toContain(other.user.id);
    expect(safePayload).not.toContain(other.account.id);
    expect(safePayload).not.toContain(other.transaction.id);
    expect(safePayload).not.toContain(owner.user.password);
    expect(safePayload).not.toMatch(
      /password|jwt|totp_secret|token_hash|code_hash|jti_hash|rateLimit|userId|user_id|idempotency_key_hash|request_hash/i,
    );
    expect(body.profile).not.toHaveProperty("authVersion");
    expect(body.profile).not.toHaveProperty("pendingEmail");
    expect(after).toEqual(before);
    expect(observabilityMocks.logServerOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "user_data_export",
        requestId: "export-test-json",
        route: "/api/user/export",
        status: 200,
        startedAt: expect.any(Number),
        context: {
          format: "json",
          result: "success",
          domainCount: body.manifest.domains.length,
          transactionCount: 1,
        },
      }),
    );
  });

  it("exports escaped CSV transactions only for the authenticated user", async () => {
    const owner = await createUserData("owner");
    const other = await createUserData("other");
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.user.id);
    const before = await ownedCounts(owner.user.id);

    const response = await GET(
      new Request("http://localhost/api/user/export?format=csv", {
        headers: { "x-request-id": "export-test-csv1" },
      })
    );
    const bytes = new Uint8Array(await response.arrayBuffer());
    const text = new TextDecoder("utf-8").decode(bytes);
    const after = await ownedCounts(owner.user.id);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toMatch(
      /^attachment; filename="controle-gastos-\d{4}-\d{2}-\d{2}\.csv"$/
    );
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(text).toContain('"2026-08-30"');
    expect(text).toContain('"12345"');
    expect(text).toContain('"Mercado, ""Centro""\n=HYPERLINK(""https://example.test"")"');
    expect(text).not.toContain(other.transaction.id);
    expect(text).not.toContain("98765");
    expect(after).toEqual(before);
  });

  it("returns 429 with Retry-After before starting the export snapshot", async () => {
    authMocks.getAuthenticatedUserId.mockResolvedValue("user-rate-limited");
    rateLimitMocks.consumeDataExportRateLimit.mockResolvedValue({
      limited: true,
      retryAfterSeconds: 3600,
    });
    const transactionSpy = vi.spyOn(prisma, "$transaction");

    try {
      const response = await GET(
        new Request("http://localhost/api/user/export?format=json", {
          headers: { "x-request-id": "export-test-rate-limit" },
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).toBe("3600");
      expect(response.headers.get("x-request-id")).toBe("export-test-rate-limit");
      expect(body.error.code).toBe("EXPORT_RATE_LIMITED");
      expect(transactionSpy).not.toHaveBeenCalled();
    } finally {
      transactionSpy.mockRestore();
    }
  });

  it("returns 401 without querying another user's export when unauthenticated", async () => {
    authMocks.getAuthenticatedUserId.mockRejectedValue(new Error("UNAUTHORIZED"));

    const response = await GET(
      new Request("http://localhost/api/user/export?format=json", {
        headers: { "x-request-id": "export-test-auth" },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.message).toBe("Não autenticado");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("rejects unsupported formats", async () => {
    const response = await GET(
      new Request("http://localhost/api/user/export?format=xml", {
        headers: { "x-request-id": "export-test-format" },
      })
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(authMocks.getAuthenticatedUserId).not.toHaveBeenCalled();
  });
});
