import { inflateRawSync } from "node:zlib";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

vi.mock("@/app/lib/security/application-rate-limit", () => ({
  consumeTransactionMutationRateLimit: vi.fn().mockResolvedValue({ limited: false }),
}));

import { payCreditCardStatementForUser } from "@/app/lib/cards/pay-credit-card-statement";
import { prisma } from "@/app/lib/prisma";
import { exportBackup } from "@/app/lib/transactions/backup/export-backup";
import { previewRestore, restoreBackup } from "@/app/lib/transactions/backup/restore-backup";
import { clearPeriod } from "@/app/lib/transactions/clear-period";
import { createTransferForUser } from "@/app/lib/transfers/create-transfer";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const fixtures = new FinancialTestFactory();

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  await fixtures.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

const post = (url: string, body: string) =>
  new Request(`http://localhost/api/transactions/backup/${url}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });

async function seed() {
  const user = await fixtures.user({ name: "Backup owner" });
  const [cc, poup, card] = await Promise.all([
    fixtures.account(user.id, { name: "Corrente", currency: "BRL" }),
    fixtures.account(user.id, { name: "Poupança", currency: "BRL" }),
    fixtures.account(user.id, {
      name: "Cartão",
      type: "CREDIT_CARD",
      currency: "BRL",
      creditLimit: 100_000,
      statementClosingDay: 20,
      statementDueDay: 27,
    }),
  ]);
  const [mercado, lazer] = await Promise.all([
    fixtures.category(user.id, { name: "Mercado", type: "EXPENSE", color: "#112233", icon: "cart" }),
    fixtures.category(user.id, { name: "Lazer", type: "EXPENSE" }),
  ]);
  const merchant = await prisma.merchant.create({ data: { userId: user.id, name: "Padaria Central" } });
  const tag = await prisma.tag.create({ data: { userId: user.id, name: "Viagem", normalizedName: "viagem" } });

  const split = await fixtures.transaction({
    userId: user.id,
    accountId: cc.id,
    categoryId: mercado.id,
    overrides: {
      year: 2026, month: 9, day: 5, amount: 10_000, description: "Compra dividida",
      merchantId: merchant.id, reconciliationStatus: "RECONCILED", reconciledAt: new Date("2026-09-30T00:00:00Z"),
    },
  });
  await prisma.transactionAllocation.createMany({
    data: [
      { userId: user.id, transactionId: split.id, categoryId: mercado.id, amount: 6_000 },
      { userId: user.id, transactionId: split.id, categoryId: lazer.id, amount: 4_000 },
    ],
  });
  await prisma.transactionTag.create({ data: { userId: user.id, transactionId: split.id, tagId: tag.id } });
  await fixtures.transaction({
    userId: user.id, accountId: cc.id, categoryId: lazer.id,
    overrides: { year: 2026, month: 9, day: 9, description: "Pendente", status: "PENDING" },
  });
  await fixtures.transaction({
    userId: user.id, accountId: card.id, categoryId: lazer.id,
    overrides: { year: 2026, month: 9, day: 15, description: "Compra no cartão" },
  });
  await payCreditCardStatementForUser(
    user.id, card.id,
    { sourceAccountId: cc.id, statementClosingDate: "2026-09-20", paymentDate: "2026-09-20" },
    "backup-test-pay",
  );
  await createTransferForUser(
    user.id,
    { sourceAccountId: cc.id, destinationAccountId: poup.id, amountCents: 5_000, year: 2026, month: 9, day: 22, description: "Reserva", status: "COMPLETED" },
    "backup-test-transfer",
  );
  await fixtures.transaction({
    userId: user.id, accountId: cc.id, categoryId: lazer.id,
    overrides: { year: 2026, month: 10, day: 2, description: "Fora do período" },
  });
  return { user };
}

async function exportPeriod(accountId?: string) {
  const qs = new URLSearchParams({ from: "2026-09-01", to: "2026-09-30", ...(accountId ? { accountId } : {}) });
  const response = await exportBackup(new Request(`http://localhost/api/transactions/backup?${qs}`));
  expect(response.status).toBe(200);
  expect(response.headers.get("content-disposition")).toContain("backup-transacoes-2026-09-01_a_2026-09-30.zip");
  const entries = readZipTexts(Buffer.from(await response.arrayBuffer()));
  expect([...entries.keys()]).toEqual([
    "backup-transacoes-2026-09-01_a_2026-09-30.json",
    "backup-transacoes-2026-09-01_a_2026-09-30.csv",
  ]);
  const csv = entries.get("backup-transacoes-2026-09-01_a_2026-09-30.csv")!;
  expect(csv.startsWith("\uFEFF\"ref\",\"date\",\"amountCents\"")).toBe(true);
  return entries.get("backup-transacoes-2026-09-01_a_2026-09-30.json")!;
}

/** Lê os arquivos de um ZIP gerado por `createZip` (entradas sequenciais, deflate). */
function readZipTexts(zip: Buffer) {
  const entries = new Map<string, string>();
  let offset = 0;
  while (zip.readUInt32LE(offset) === 0x04034b50) {
    const packedSize = zip.readUInt32LE(offset + 18);
    const nameLength = zip.readUInt16LE(offset + 26);
    const start = offset + 30 + nameLength;
    const name = zip.subarray(offset + 30, start).toString("utf8");
    entries.set(name, inflateRawSync(zip.subarray(start, start + packedSize)).toString("utf8"));
    offset = start + packedSize;
  }
  return entries;
}

async function snapshot(userId: string) {
  const rows = await prisma.transaction.findMany({
    where: { userId, year: 2026, month: 9 },
    include: { account: true, category: true, merchant: true, tagLinks: { include: { tag: true } }, allocations: { include: { category: true } } },
  });
  return rows
    .map((row) => ({
      description: row.description,
      amount: row.amount,
      date: `${row.year}-${row.month}-${row.day}`,
      kind: row.kind,
      status: row.status,
      reconciliation: row.reconciliationStatus,
      reconciledAt: row.reconciledAt?.toISOString() ?? null,
      account: row.account.name,
      category: row.category?.name ?? null,
      merchant: row.merchant?.name ?? null,
      tags: row.tagLinks.map((link) => link.tag.name).sort(),
      allocations: row.allocations.map((item) => `${item.category.name}:${item.amount}`).sort(),
      transferRole: row.transferRole,
    }))
    .sort((a, b) => `${a.date}${a.description}`.localeCompare(`${b.date}${b.description}`));
}

describe("period backup and restore", () => {
  it("round-trips export → clear → restore faithfully and is idempotent", async () => {
    const { user } = await seed();
    authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);

    const before = await snapshot(user.id);
    expect(before).toHaveLength(6); // split, pendente, cartão, pagamento, 2 pernas
    const file = await exportPeriod();

    const cleared = await clearPeriod(
      new Request("http://localhost/api/transactions/period", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ from: "2026-09-01", to: "2026-09-30", expectedCount: 6 }),
      }),
    );
    expect(cleared.status).toBe(200);
    expect(await snapshot(user.id)).toHaveLength(0);

    const preview = await (await previewRestore(post("preview", file))).json();
    expect(preview.data).toMatchObject({
      transactions: { toRestore: 3, alreadyPresent: 0 },
      transfers: { toRestore: 1 },
      cardPayments: { toRestore: 1 },
      willCreate: { accounts: [], categories: [], merchants: 0, tags: 0 },
      problems: [],
    });

    const restored = await restoreBackup(post("restore", file));
    expect(restored.status).toBe(200);
    expect(await snapshot(user.id)).toEqual(before);
    expect(await prisma.creditCardPayment.count({ where: { userId: user.id } })).toBe(1);

    const again = await (await restoreBackup(post("restore", file))).json();
    expect(again.data).toMatchObject({
      transactions: { toRestore: 0, alreadyPresent: 3 },
      transfers: { toRestore: 0, alreadyPresent: 1 },
      cardPayments: { toRestore: 0, alreadyPresent: 1 },
    });
    expect(await snapshot(user.id)).toEqual(before);
  });

  it("creates missing accounts, categories, merchants and tags", async () => {
    const { user } = await seed();
    authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);
    const file = await exportPeriod();

    const other = await fixtures.user({ name: "Restore target" });
    // conta com o mesmo nome em outra moeda não deve ser reaproveitada
    await fixtures.account(other.id, { name: "Corrente", currency: "USD" });
    authMocks.getAuthenticatedUserId.mockResolvedValue(other.id);

    const preview = await (await previewRestore(post("preview", file))).json();
    expect(preview.data.willCreate.accounts.sort()).toEqual(["Cartão", "Corrente (restaurada)", "Poupança"]);
    expect(preview.data.renamedAccounts).toEqual([{ from: "Corrente", to: "Corrente (restaurada)" }]);
    expect(preview.data.willCreate).toMatchObject({ merchants: 1, tags: 1 });
    expect(preview.data.willCreate.categories.sort()).toEqual(["Lazer", "Mercado"]);
    expect(await prisma.account.count({ where: { userId: other.id } })).toBe(1);

    const response = await restoreBackup(post("restore", file));
    expect(response.status).toBe(200);

    const restoredRows = await prisma.transaction.findMany({
      where: { userId: other.id },
      include: { account: true, category: true, tagLinks: true, allocations: true },
    });
    expect(restoredRows).toHaveLength(6);
    const split = restoredRows.find((row) => row.description === "Compra dividida");
    expect(split).toMatchObject({ reconciliationStatus: "RECONCILED", importSource: "BACKUP" });
    expect(split?.account.name).toBe("Corrente (restaurada)");
    expect(split?.tagLinks).toHaveLength(1);
    expect(split?.allocations).toHaveLength(2);
    expect(await prisma.category.findFirst({ where: { userId: other.id, name: "Mercado" } })).toMatchObject({
      color: "#112233",
      icon: "cart",
    });
    expect(await prisma.account.findFirst({ where: { userId: other.id, name: "Cartão" } })).toMatchObject({
      type: "CREDIT_CARD",
      statementClosingDay: 20,
    });
    // dados do usuário original intactos
    expect(await prisma.transaction.count({ where: { userId: user.id } })).toBe(7);
  });

  it("rejects invalid files and exports only the owner's data", async () => {
    const user = await fixtures.user({ name: "Backup invalid" });
    authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);

    expect((await previewRestore(post("preview", "não é json"))).status).toBe(400);
    expect((await previewRestore(post("preview", JSON.stringify({ format: "outro" })))).status).toBe(400);
    expect((await restoreBackup(post("restore", "{}"))).status).toBe(400);

    const bad = await exportBackup(new Request("http://localhost/api/transactions/backup?from=2026-12-01&to=2026-01-01"));
    expect(bad.status).toBe(400);
    const empty = JSON.parse(await exportPeriod());
    expect(empty.transactions).toEqual([]);
  });
});
