import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
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

  return { user, account, category, transaction };
}

async function counts() {
  const [users, accounts, categories, transactions, resetTokens, rateLimits] =
    await Promise.all([
      prisma.user.count(),
      prisma.account.count(),
      prisma.category.count(),
      prisma.transaction.count(),
      prisma.passwordResetToken.count(),
      prisma.authRateLimit.count(),
    ]);

  return { users, accounts, categories, transactions, resetTokens, rateLimits };
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
});

describe("GET /api/user/export", () => {
  it("exports a JSON snapshot only for the authenticated user without sensitive fields or writes", async () => {
    const owner = await createUserData("owner");
    const other = await createUserData("other");
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.user.id);
    const before = await counts();

    const response = await GET(
      new Request("http://localhost/api/user/export?format=json", {
        headers: { "x-request-id": "export-test-json" },
      })
    );
    const text = await response.text();
    const body = JSON.parse(text);
    const after = await counts();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("content-disposition")).toMatch(
      /^attachment; filename="controle-gastos-\d{4}-\d{2}-\d{2}\.json"$/
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-request-id")).toBe("export-test-json");

    expect(body.accounts).toHaveLength(1);
    expect(body.categories).toHaveLength(1);
    expect(body.transactions).toHaveLength(1);
    expect(body.accounts[0]).toMatchObject({
      id: owner.account.id,
      isActive: false,
    });
    expect(body.categories[0]).toMatchObject({
      id: owner.category.id,
      isActive: false,
    });
    expect(body.transactions[0]).toMatchObject({
      id: owner.transaction.id,
      amountCents: 12345,
      date: "2026-08-30",
    });

    expect(text).not.toContain(other.user.id);
    expect(text).not.toContain(other.account.id);
    expect(text).not.toContain(other.transaction.id);
    expect(text).not.toContain(owner.user.password);
    expect(text).not.toMatch(/password|jwt|resetToken|rateLimit|userId/i);
    expect(after).toEqual(before);
  });

  it("exports escaped CSV transactions only for the authenticated user", async () => {
    const owner = await createUserData("owner");
    const other = await createUserData("other");
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.user.id);
    const before = await counts();

    const response = await GET(
      new Request("http://localhost/api/user/export?format=csv", {
        headers: { "x-request-id": "export-test-csv1" },
      })
    );
    const text = await response.text();
    const after = await counts();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toMatch(
      /^attachment; filename="controle-gastos-\d{4}-\d{2}-\d{2}\.csv"$/
    );
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(text).toContain('"2026-08-30"');
    expect(text).toContain('"12345"');
    expect(text).toContain('"Mercado, ""Centro""\n=HYPERLINK(""https://example.test"")"');
    expect(text).not.toContain(other.transaction.id);
    expect(text).not.toContain("98765");
    expect(after).toEqual(before);
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
  });

  it("rejects unsupported formats", async () => {
    const response = await GET(
      new Request("http://localhost/api/user/export?format=xml", {
        headers: { "x-request-id": "export-test-format" },
      })
    );

    expect(response.status).toBe(400);
    expect(authMocks.getAuthenticatedUserId).not.toHaveBeenCalled();
  });
});
