import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
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

import { payCreditCardStatementForUser } from "@/app/lib/cards/pay-credit-card-statement";
import { prisma } from "@/app/lib/prisma";
import {
  createXlsxFixture,
  xlsxNumber,
  xlsxText,
} from "@/app/lib/transactions/import/__tests__/xlsx-fixture";
import { previewTransactionImportWithRules } from "@/app/lib/transactions/import/rule-preview-handler";
import {
  confirmTransactionImport,
  previewTransactionImport,
} from "@/app/lib/transactions/import/transaction-import";

const createdUserIds: string[] = [];

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createFixture() {
  const suffix = randomUUID();
  const [owner, otherUser] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Import Owner",
        email: `import-owner-${suffix}@example.com`,
        password: "test-hash",
      },
    }),
    prisma.user.create({
      data: {
        name: "Import Other",
        email: `import-other-${suffix}@example.com`,
        password: "test-hash",
      },
    }),
  ]);
  createdUserIds.push(owner.id, otherUser.id);

  const [account, otherAccount] = await Promise.all([
    prisma.account.create({
      data: { name: `Conta ${suffix}`, type: "CREDIT_DEBIT", currency: "BRL", userId: owner.id },
    }),
    prisma.account.create({
      data: { name: `Conta externa ${suffix}`, type: "CREDIT_DEBIT", currency: "BRL", userId: otherUser.id },
    }),
  ]);

  const [expenseCategory, incomeCategory, otherCategory, otherMerchant] = await Promise.all([
    prisma.category.create({
      data: { name: `Despesa ${suffix}`.slice(0, 50), type: "EXPENSE", userId: owner.id },
    }),
    prisma.category.create({
      data: { name: `Receita ${suffix}`.slice(0, 50), type: "INCOME", userId: owner.id },
    }),
    prisma.category.create({
      data: { name: `Outra ${suffix}`.slice(0, 50), type: "EXPENSE", userId: otherUser.id },
    }),
    prisma.merchant.create({
      data: { name: `Merchant externo ${suffix}`, userId: otherUser.id },
    }),
  ]);

  return { owner, otherUser, account, otherAccount, expenseCategory, incomeCategory, otherCategory, otherMerchant };
}

function previewRequest(
  accountId: string,
  content: string | Uint8Array,
  name = "extrato.csv",
) {
  const formData = new FormData();
  const type = name.endsWith(".ofx") || name.endsWith(".qfx")
    ? "application/x-ofx"
    : name.endsWith(".qif")
      ? "application/qif"
      : name.endsWith(".xlsx")
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv";
  const fileContent: BlobPart =
    typeof content === "string"
      ? content
      : content.buffer.slice(
          content.byteOffset,
          content.byteOffset + content.byteLength,
        ) as ArrayBuffer;
  formData.append("accountId", accountId);
  formData.append("file", new File([fileContent], name, { type }));
  return new Request("http://localhost/api/transactions/import/preview", {
    method: "POST",
    body: formData,
  });
}

async function getPreview(accountId: string) {
  const response = await previewTransactionImport(previewRequest(
    accountId,
    "data,descricao,valor\n2026-08-31,Café,-10.01\n2026-08-30,Salário,1234.56",
  ));
  const body = await response.json();
  return { response, body };
}

describe("transaction import integration", () => {
  it("requires an account before starting an import preview", async () => {
    const { owner } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const formData = new FormData();
    formData.append(
      "file",
      new File(
        ["data,descricao,valor\n2026-08-31,Café,-10.00"],
        "extrato.csv",
        { type: "text/csv" },
      ),
    );

    const response = await previewTransactionImport(
      new Request("http://localhost/api/transactions/import/preview", {
        method: "POST",
        body: formData,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error?.message).toBe("Selecione uma conta válida");
  });

  it("requires a category for every selected item at confirmation", async () => {
    const { owner, account } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const { body } = await getPreview(account.id);
    const items = body.data.items.map((item: { index: number }) => ({
      ...item,
      selected: item.index === 0,
      categoryId: null,
    }));

    const response = await confirmTransactionImport(
      new Request("http://localhost/api/transactions/import/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accountId: account.id,
          previewToken: body.data.previewToken,
          items,
        }),
      }),
    );
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error?.message).toBe(
      "Defina uma categoria para cada item selecionado",
    );
    expect(
      await prisma.transaction.count({ where: { userId: owner.id } }),
    ).toBe(0);
  });

  it("keeps merchant optional during confirmation", async () => {
    const { owner, account, expenseCategory } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const preview = await previewTransactionImport(
      previewRequest(
        account.id,
        "data,descricao,valor\n2026-08-31,Compra sem merchant,-10.00",
      ),
    );
    const body = await preview.json();

    const items = body.data.items.map((item: { index: number }) => ({
      ...item,
      selected: true,
      categoryId: expenseCategory.id,
      merchantId: null,
    }));

    const response = await confirmTransactionImport(
      new Request("http://localhost/api/transactions/import/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accountId: account.id,
          previewToken: body.data.previewToken,
          items,
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(
      await prisma.transaction.findFirst({
        where: { userId: owner.id, description: "Compra sem merchant" },
        select: { merchantId: true },
      }),
    ).toEqual({ merchantId: null });
  });

  it("generates preview without writes and confirms only selected items", async () => {
    const { owner, account, expenseCategory, incomeCategory } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const { response, body } = await getPreview(account.id);
    expect(response.status).toBe(200);
    expect(body.data.summary).toEqual({ total: 2, valid: 2, invalid: 0, duplicates: 0 });
    expect(body.data.items.map((item: { amountCents: number }) => item.amountCents)).toEqual([1001, 123456]);
    expect(await prisma.transaction.count({ where: { userId: owner.id } })).toBe(0);

    const items = body.data.items.map((item: { index: number; type: "INCOME" | "EXPENSE" }) => ({
      ...item,
      selected: item.index === 0,
      categoryId: item.type === "EXPENSE" ? expenseCategory.id : incomeCategory.id,
    }));
    const confirm = await confirmTransactionImport(new Request("http://localhost/api/transactions/import/confirm", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": "import-confirm-test",
      },
      body: JSON.stringify({ accountId: account.id, previewToken: body.data.previewToken, items }),
    }));
    const confirmBody = await confirm.json();

    expect(confirm.status).toBe(201);
    expect(confirmBody.data).toEqual({ selected: 1, created: 1, duplicates: 0 });
    const transactions = await prisma.transaction.findMany({ where: { userId: owner.id } });
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      amount: 1001,
      type: "EXPENSE",
      categoryId: expenseCategory.id,
      accountId: account.id,
      status: "COMPLETED",
      importSource: "CSV",
    });
    expect(transactions[0].importFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(observabilityMocks.logServerOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "transaction_import_confirm",
        requestId: "import-confirm-test",
        route: "/api/transactions/import/confirm",
        status: 201,
        startedAt: expect.any(Number),
        context: {
          result: "success",
          selectedCount: 1,
          createdCount: 1,
          duplicateCount: 0,
        },
      }),
    );
  });

  it("keeps Nubank credit-card CSV on the dedicated parser", async () => {
    const { owner } = await createFixture();
    const cardAccount = await prisma.account.create({
      data: {
        name: `Cartão Nubank ${randomUUID()}`,
        type: "CREDIT_CARD",
        currency: "BRL",
        creditLimit: 100_000,
        statementClosingDay: 20,
        statementDueDay: 27,
        userId: owner.id,
      },
    });
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const csv = [
      "date,title,amount",
      "2026-09-01,Supermercado,123.45",
      "2026-09-05,Pagamento recebido,-100.00",
      "2026-09-07,Estorno,-2.35",
    ].join("\n");

    const preview = await previewTransactionImport(
      previewRequest(cardAccount.id, csv, "nubank.csv"),
    );
    const body = await preview.json();

    expect(preview.status).toBe(200);
    expect(body.data.detectedSource).toBe("NUBANK_CREDIT_CARD");
    expect(body.data.nubankSummary).toEqual({
      purchases: 1,
      payments: 1,
      credits: 1,
    });
  });

  it("previews and confirms XLSX using the same idempotent pipeline", async () => {
    const { owner, account, expenseCategory } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const fixture = createXlsxFixture({
      rows: [
        [xlsxText("data"), xlsxText("descricao"), xlsxText("valor"), xlsxText("id")],
        [xlsxNumber("46265"), xlsxText("Compra Excel"), xlsxNumber("-42.37"), xlsxText("excel-1")],
      ],
    });
    const preview = await previewTransactionImport(
      previewRequest(account.id, fixture, "extrato.xlsx"),
    );
    const body = await preview.json();

    expect(preview.status).toBe(200);
    expect(body.data.summary).toEqual({ total: 1, valid: 1, invalid: 0, duplicates: 0 });
    expect(body.data.items[0]).toMatchObject({
      source: "XLSX",
      date: "2026-08-31",
      amountCents: 4237,
      type: "EXPENSE",
      description: "Compra Excel",
      externalId: "excel-1",
    });

    const items = body.data.items.map((item: { index: number }) => ({
      ...item,
      selected: item.index === 0,
      categoryId: expenseCategory.id,
    }));
    const confirm = await confirmTransactionImport(new Request(
      "http://localhost/api/transactions/import/confirm",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accountId: account.id,
          previewToken: body.data.previewToken,
          items,
        }),
      },
    ));

    expect(confirm.status).toBe(201);
    expect(await prisma.transaction.findFirst({
      where: { userId: owner.id, importExternalId: "excel-1" },
      select: { importSource: true, amount: true, year: true, month: true, day: true },
    })).toEqual({
      importSource: "XLSX",
      amount: 4237,
      year: 2026,
      month: 8,
      day: 31,
    });
  });

  it("rejects accounts and categories from another user without partial writes", async () => {
    const { owner, account, otherAccount, expenseCategory, incomeCategory, otherCategory } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const foreignAccount = await previewTransactionImport(previewRequest(
      otherAccount.id,
      "data,descricao,valor\n2026-08-31,Café,-10.01",
    ));
    expect(foreignAccount.status).toBe(400);

    const { body } = await getPreview(account.id);
    const items = body.data.items.map((item: { index: number; type: "INCOME" | "EXPENSE" }) => ({
      ...item,
      selected: true,
      categoryId: item.index === 0
        ? expenseCategory.id
        : item.type === "INCOME"
          ? otherCategory.id
          : incomeCategory.id,
    }));
    const confirm = await confirmTransactionImport(new Request("http://localhost/api/transactions/import/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accountId: account.id, previewToken: body.data.previewToken, items }),
    }));

    expect(confirm.status).toBe(400);
    expect(await prisma.transaction.count({ where: { userId: owner.id } })).toBe(0);
  });

  it("rejects a merchant from another user without partial writes", async () => {
    const { owner, account, expenseCategory, incomeCategory, otherMerchant } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const { body } = await getPreview(account.id);
    const items = body.data.items.map((item: { type: "INCOME" | "EXPENSE" }) => ({
      ...item,
      selected: true,
      categoryId: item.type === "EXPENSE" ? expenseCategory.id : incomeCategory.id,
      merchantId: otherMerchant.id,
    }));

    const confirm = await confirmTransactionImport(new Request("http://localhost/api/transactions/import/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accountId: account.id, previewToken: body.data.previewToken, items }),
    }));

    expect(confirm.status).toBe(400);
    expect(await prisma.transaction.count({ where: { userId: owner.id } })).toBe(0);
  });

  it("never creates CARD_PAYMENT from generic text heuristics", async () => {
    const { owner, expenseCategory } = await createFixture();
    const cardAccount = await prisma.account.create({
      data: {
        name: `Cartão genérico pagamento ${randomUUID()}`,
        type: "CREDIT_CARD",
        currency: "BRL",
        creditLimit: 100_000,
        statementClosingDay: 20,
        statementDueDay: 27,
        userId: owner.id,
      },
    });
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const preview = await previewTransactionImport(
      previewRequest(
        cardAccount.id,
        "data,descricao,valor\n2026-09-10,Pagamento de fatura,-100.00",
        "pagamento-generico.csv",
      ),
    );
    const body = await preview.json();
    expect(preview.status).toBe(200);

    const items = body.data.items.map((item: { index: number }) => ({
      ...item,
      selected: true,
      categoryId: expenseCategory.id,
    }));
    const confirm = await confirmTransactionImport(
      new Request("http://localhost/api/transactions/import/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accountId: cardAccount.id,
          previewToken: body.data.previewToken,
          items,
        }),
      }),
    );
    expect(confirm.status).toBe(201);

    const stored = await prisma.transaction.findFirstOrThrow({
      where: {
        userId: owner.id,
        importFingerprint: body.data.items[0].fingerprint,
      },
      select: { kind: true, type: true, description: true },
    });
    expect(stored).toEqual({
      kind: "NORMAL",
      type: "EXPENSE",
      description: "Pagamento de fatura",
    });
  });

  it("preserves generic CSV and QIF sign semantics on credit-card accounts", async () => {
    const { owner } = await createFixture();
    const cardAccount = await prisma.account.create({
      data: {
        name: `Cartão sinais genéricos ${randomUUID()}`,
        type: "CREDIT_CARD",
        currency: "BRL",
        creditLimit: 100_000,
        statementClosingDay: 20,
        statementDueDay: 27,
        userId: owner.id,
      },
    });
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const csvPreview = await previewTransactionImport(
      previewRequest(
        cardAccount.id,
        [
          "data,descricao,valor",
          "2026-09-16,Compra CSV,-25.00",
          "2026-09-17,Crédito CSV,10.00",
        ].join("\n"),
        "generic-card.csv",
      ),
    );
    const csvBody = await csvPreview.json();

    expect(csvPreview.status).toBe(200);
    expect(csvBody.data.detectedSource).toBe("GENERIC");
    expect(
      csvBody.data.items.map((item: { type: string; amountCents: number }) => ({
        type: item.type,
        amountCents: item.amountCents,
      })),
    ).toEqual([
      { type: "EXPENSE", amountCents: 2500 },
      { type: "INCOME", amountCents: 1000 },
    ]);

    const qifPreview = await previewTransactionImport(
      previewRequest(
        cardAccount.id,
        [
          "!Type:CCard",
          "D9/16/2026",
          "T-25.00",
          "PCompra QIF",
          "^",
          "D9/17/2026",
          "T10.00",
          "PCrédito QIF",
          "^",
        ].join("\n"),
        "generic-card.qif",
      ),
    );
    const qifBody = await qifPreview.json();

    expect(qifPreview.status).toBe(200);
    expect(
      qifBody.data.items.map((item: { type: string; amountCents: number }) => ({
        type: item.type,
        amountCents: item.amountCents,
      })),
    ).toEqual([
      { type: "EXPENSE", amountCents: 2500 },
      { type: "INCOME", amountCents: 1000 },
    ]);
  });

  it("applies the paid-statement guard to every supported import format", async () => {
    const { owner, account: sourceAccount, expenseCategory } = await createFixture();
    const cardAccount = await prisma.account.create({
      data: {
        name: `Cartão fatura paga ${randomUUID()}`,
        type: "CREDIT_CARD",
        currency: "BRL",
        creditLimit: 100_000,
        statementClosingDay: 20,
        statementDueDay: 27,
        userId: owner.id,
      },
    });

    await prisma.transaction.create({
      data: {
        amount: 10_000,
        year: 2026,
        month: 9,
        day: 15,
        type: "EXPENSE",
        kind: "NORMAL",
        description: "Compra original",
        status: "COMPLETED",
        accountId: cardAccount.id,
        categoryId: expenseCategory.id,
        userId: owner.id,
      },
    });

    await payCreditCardStatementForUser(
      owner.id,
      cardAccount.id,
      {
        sourceAccountId: sourceAccount.id,
        statementClosingDate: "2026-09-20",
        paymentDate: "2026-09-20",
      },
      `import-paid-statement-${randomUUID()}`,
    );

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const xlsx = createXlsxFixture({
      rows: [
        [xlsxText("data"), xlsxText("descricao"), xlsxText("valor")],
        [xlsxText("2026-09-16"), xlsxText("Compra XLSX paga"), xlsxNumber("-25.00")],
      ],
    });

    const cases: Array<{
      name: string;
      content: string | Uint8Array;
    }> = [
      {
        name: "generic.csv",
        content: "data,descricao,valor\n2026-09-16,Compra CSV paga,-25.00",
      },
      {
        name: "nubank.csv",
        content: "date,title,amount\n2026-09-16,Compra Nubank paga,25.00",
      },
      {
        name: "card.qif",
        content: [
          "!Type:CCard",
          "D9/16/2026",
          "T-25.00",
          "PCompra QIF paga",
          "^",
        ].join("\n"),
      },
      {
        name: "card.ofx",
        content: [
          "OFXHEADER:100",
          "<OFX><CURDEF>BRL",
          "<CCACCTFROM><ACCTID>card-file</CCACCTFROM>",
          "<BANKTRANLIST><STMTTRN><DTPOSTED>20260916<TRNAMT>-25.00<FITID>paid-ofx<NAME>Compra OFX paga</STMTTRN></BANKTRANLIST>",
          "</OFX>",
        ].join("\n"),
      },
      {
        name: "card.qfx",
        content: [
          "OFXHEADER:100",
          "<OFX><CURDEF>BRL",
          "<CCACCTFROM><ACCTID>card-file</CCACCTFROM>",
          "<BANKTRANLIST><STMTTRN><DTPOSTED>20260916<TRNAMT>-25.00<FITID>paid-qfx<NAME>Compra QFX paga</STMTTRN></BANKTRANLIST>",
          "</OFX>",
        ].join("\n"),
      },
      {
        name: "card.xlsx",
        content: xlsx,
      },
    ];

    for (const current of cases) {
      const preview = await previewTransactionImport(
        previewRequest(cardAccount.id, current.content, current.name),
      );
      const previewBody = await preview.json();
      expect(preview.status, current.name).toBe(200);

      const items = previewBody.data.items.map((item: { index: number }) => ({
        ...item,
        selected: true,
        categoryId: expenseCategory.id,
      }));

      const confirm = await confirmTransactionImport(
        new Request("http://localhost/api/transactions/import/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            accountId: cardAccount.id,
            previewToken: previewBody.data.previewToken,
            items,
          }),
        }),
      );
      const confirmBody = await confirm.json();

      expect(confirm.status, current.name).toBe(409);
      expect(confirmBody.error?.code, current.name).toBe(
        "CREDIT_CARD_STATEMENT_PAID",
      );
    }

    expect(
      await prisma.transaction.count({
        where: {
          userId: owner.id,
          accountId: cardAccount.id,
          importFingerprint: { not: null },
        },
      }),
    ).toBe(0);
  });

  it("detects an identical reimport and remains idempotent", async () => {
    const { owner, account, expenseCategory, incomeCategory } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const firstPreview = await getPreview(account.id);
    const firstItems = firstPreview.body.data.items.map((item: { type: "INCOME" | "EXPENSE" }) => ({
      ...item,
      selected: true,
      categoryId: item.type === "EXPENSE" ? expenseCategory.id : incomeCategory.id,
    }));
    const firstConfirm = await confirmTransactionImport(new Request("http://localhost/api/transactions/import/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accountId: account.id, previewToken: firstPreview.body.data.previewToken, items: firstItems }),
    }));
    expect(firstConfirm.status).toBe(201);

    const secondPreview = await getPreview(account.id);
    expect(secondPreview.body.data.summary).toEqual({ total: 2, valid: 0, invalid: 0, duplicates: 2 });
    const duplicateItems = secondPreview.body.data.items.map((item: { type: "INCOME" | "EXPENSE" }) => ({
      ...item,
      selected: true,
      categoryId: item.type === "EXPENSE" ? expenseCategory.id : incomeCategory.id,
    }));
    const secondConfirm = await confirmTransactionImport(new Request("http://localhost/api/transactions/import/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accountId: account.id, previewToken: secondPreview.body.data.previewToken, items: duplicateItems }),
    }));
    const secondBody = await secondConfirm.json();

    expect(secondConfirm.status).toBe(201);
    expect(secondBody.data).toEqual({ selected: 2, created: 0, duplicates: 2 });
    expect(await prisma.transaction.count({ where: { userId: owner.id } })).toBe(2);
  });
  it.each(["Bank", "Cash"] as const)(
    "rejects QIF !Type:%s when importing into a credit-card account",
    async (section) => {
      const { owner } = await createFixture();
      const cardAccount = await prisma.account.create({
        data: {
          name: `Cartão QIF ${section} ${randomUUID()}`,
          type: "CREDIT_CARD",
          currency: "BRL",
          creditLimit: 100_000,
          statementClosingDay: 20,
          statementDueDay: 27,
          userId: owner.id,
        },
      });
      authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

      const qif = [
        `!Type:${section}`,
        "D8/31/2026",
        "T-42.37",
        "PCompra",
        "^",
      ].join("\n");

      const preview = await previewTransactionImport(
        previewRequest(cardAccount.id, qif, `${section.toLowerCase()}.qif`),
      );
      const body = await preview.json();

      expect(preview.status).toBe(400);
      expect(body.error?.message).toBe(
        `QIF !Type:${section} não é compatível com conta de cartão de crédito`,
      );
    },
  );

  it("keeps generic CSV/XLSX bound to the manually selected account", async () => {
    const { owner } = await createFixture();
    const cardAccount = await prisma.account.create({
      data: {
        name: `Cartão genérico ${randomUUID()}`,
        type: "CREDIT_CARD",
        currency: "BRL",
        creditLimit: 100_000,
        statementClosingDay: 20,
        statementDueDay: 27,
        userId: owner.id,
      },
    });
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const csvPreview = await previewTransactionImport(
      previewRequest(
        cardAccount.id,
        "data,descricao,valor\n2026-08-31,Compra CSV,-10.00",
        "generico.csv",
      ),
    );
    const csvBody = await csvPreview.json();
    expect(csvPreview.status).toBe(200);
    expect(csvBody.data.accountId).toBe(cardAccount.id);

    const xlsx = createXlsxFixture({
      rows: [
        [xlsxText("data"), xlsxText("descricao"), xlsxText("valor")],
        [xlsxText("2026-08-31"), xlsxText("Compra XLSX"), xlsxNumber("-20.00")],
      ],
    });
    const xlsxPreview = await previewTransactionImport(
      previewRequest(cardAccount.id, xlsx, "generico.xlsx"),
    );
    const xlsxBody = await xlsxPreview.json();
    expect(xlsxPreview.status).toBe(200);
    expect(xlsxBody.data.accountId).toBe(cardAccount.id);
  });

  it("rejects bank OFX when the selected account is a credit card", async () => {
    const { owner } = await createFixture();
    const cardAccount = await prisma.account.create({
      data: {
        name: `Cartão OFX banco ${randomUUID()}`,
        type: "CREDIT_CARD",
        currency: "BRL",
        creditLimit: 100_000,
        statementClosingDay: 20,
        statementDueDay: 27,
        userId: owner.id,
      },
    });
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const bankOfx = [
      "OFXHEADER:100",
      "<OFX><CURDEF>BRL",
      "<BANKACCTFROM><BANKID>001<ACCTID>bank-123</BANKACCTFROM>",
      "<BANKTRANLIST><STMTTRN><DTPOSTED>20260831<TRNAMT>-10.00<FITID>bank-card-mismatch<NAME>Compra</STMTTRN></BANKTRANLIST>",
      "</OFX>",
    ].join("\n");

    const preview = await previewTransactionImport(
      previewRequest(cardAccount.id, bankOfx, "bank-on-card.ofx"),
    );
    const body = await preview.json();

    expect(preview.status).toBe(400);
    expect(body.error?.message).toBe(
      "OFX/QFX bancário não é compatível com conta de cartão de crédito",
    );
  });

  it("validates OFX account type but never redirects by ACCTID", async () => {
    const { owner, account } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const bankOfx = [
      "OFXHEADER:100",
      "<OFX><CURDEF>BRL",
      "<BANKACCTFROM><BANKID>001<ACCTID>arquivo-conta-diferente</BANKACCTFROM>",
      "<BANKTRANLIST><STMTTRN><DTPOSTED>20260831<TRNAMT>-12.34<FITID>bank-meta-1<NAME>Compra</STMTTRN></BANKTRANLIST>",
      "</OFX>",
    ].join("\n");

    const bankPreview = await previewTransactionImport(
      previewRequest(account.id, bankOfx, "bank.ofx"),
    );
    const bankBody = await bankPreview.json();

    expect(bankPreview.status).toBe(200);
    expect(bankBody.data.accountId).toBe(account.id);

    const cardOfx = [
      "OFXHEADER:100",
      "<OFX><CURDEF>BRL",
      "<CCACCTFROM><ACCTID>cartao-no-arquivo</CCACCTFROM>",
      "<BANKTRANLIST><STMTTRN><DTPOSTED>20260831<TRNAMT>-9.99<FITID>card-meta-1<NAME>Compra</STMTTRN></BANKTRANLIST>",
      "</OFX>",
    ].join("\n");

    const mismatch = await previewTransactionImport(
      previewRequest(account.id, cardOfx, "card.qfx"),
    );
    const mismatchBody = await mismatch.json();

    expect(mismatch.status).toBe(400);
    expect(mismatchBody.error?.message).toBe(
      "OFX/QFX de cartão deve ser importado em uma conta do tipo cartão de crédito",
    );
  });

  it("requires a credit-card account for QIF !Type:CCard", async () => {
    const { owner, account } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const qif = [
      "!Type:CCard",
      "D8/31/2026",
      "T-42.37",
      "PCompra cartão",
      "^",
    ].join("\n");

    const preview = await previewTransactionImport(
      previewRequest(account.id, qif, "cartao.qif"),
    );
    const body = await preview.json();

    expect(preview.status).toBe(400);
    expect(body.error?.message).toBe(
      "QIF !Type:CCard deve ser importado em uma conta do tipo cartão de crédito",
    );
  });

  it("previews QFX through OFX semantics and confirms QIF in the canonical pipeline", async () => {
    const { owner, account, expenseCategory } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const qfx = [
      "OFXHEADER:100",
      "<OFX><CURDEF>BRL<BANKTRANLIST>",
      "<STMTTRN><DTPOSTED>20260831<TRNAMT>-12.34<FITID>same-1<NAME>QFX</STMTTRN>",
      "</BANKTRANLIST></OFX>",
    ].join("\n");
    const qfxPreview = await previewTransactionImport(
      previewRequest(account.id, qfx, "extrato.qfx"),
    );
    const qfxBody = await qfxPreview.json();
    expect(qfxPreview.status).toBe(200);
    expect(qfxBody.data.items[0]).toMatchObject({
      source: "OFX",
      externalId: "same-1",
      amountCents: 1234,
    });

    const qif = [
      "!Type:Bank",
      "D8/31/2026",
      "T-42.37",
      "PMercado",
      "MCompra",
      "^",
    ].join("\n");
    const qifPreview = await previewTransactionImport(
      previewRequest(account.id, qif, "extrato.qif"),
    );
    const qifBody = await qifPreview.json();
    expect(qifPreview.status).toBe(200);
    expect(qifBody.data.items[0]).toMatchObject({
      source: "QIF",
      date: "2026-08-31",
      amountCents: 4237,
      type: "EXPENSE",
      description: "Mercado — Compra",
    });

    const items = qifBody.data.items.map((item: { index: number }) => ({
      ...item,
      selected: item.index === 0,
      categoryId: expenseCategory.id,
    }));
    const confirm = await confirmTransactionImport(new Request(
      "http://localhost/api/transactions/import/confirm",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accountId: account.id,
          previewToken: qifBody.data.previewToken,
          items,
        }),
      },
    ));

    expect(confirm.status).toBe(201);
    expect(await prisma.transaction.findFirst({
      where: { userId: owner.id, importSource: "QIF" },
      select: { importSource: true, amount: true, importExternalId: true },
    })).toEqual({
      importSource: "QIF",
      amount: 4237,
      importExternalId: null,
    });

    const repeatedPreview = await previewTransactionImport(
      previewRequest(account.id, qif, "extrato.qif"),
    );
    const repeatedBody = await repeatedPreview.json();
    expect(repeatedPreview.status).toBe(200);
    expect(repeatedBody.data.summary).toEqual({
      total: 1,
      valid: 0,
      invalid: 0,
      duplicates: 1,
    });
  });

  it("returns a controlled client error for invalid UTF-8 text imports", async () => {
    const { owner, account } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const response = await previewTransactionImport(
      previewRequest(account.id, new Uint8Array([0xff, 0xfe, 0xfd]), "invalid.qif"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error?.message).toBe("Arquivo de texto deve usar codificação UTF-8 válida.");
  });


  it("learns an explicit merchant correction atomically and recognizes it on the next import", async () => {
    const { owner, account, expenseCategory } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const [merchantA, merchantB] = await Promise.all([
      prisma.merchant.create({
        data: { userId: owner.id, name: "Merchant A" },
      }),
      prisma.merchant.create({
        data: { userId: owner.id, name: "Merchant B" },
      }),
    ]);

    const alias = await prisma.merchantAlias.create({
      data: {
        userId: owner.id,
        merchantId: merchantA.id,
        operator: "EQUALS",
        pattern: "Café",
        normalizedPattern: "cafe",
        priority: 100,
      },
    });

    const firstPreview = await previewTransactionImportWithRules(
      previewRequest(
        account.id,
        "data,descricao,valor\n2026-08-31,Café,-10.01",
      ),
    );
    const firstBody = await firstPreview.json();

    expect(firstPreview.status).toBe(200);
    expect(firstBody.data.items[0]).toMatchObject({
      suggestedMerchantId: merchantA.id,
      suggestedMerchantName: "Merchant A",
      merchantAliasConflict: false,
    });

    const items = firstBody.data.items.map((item: {
      index: number;
      type: "INCOME" | "EXPENSE";
    }) => ({
      ...item,
      selected: true,
      categoryId: expenseCategory.id,
      merchantId: merchantB.id,
      learnMerchantAlias: true,
      merchantAliasOperator: "EQUALS",
    }));

    const confirm = await confirmTransactionImport(
      new Request("http://localhost/api/transactions/import/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accountId: account.id,
          previewToken: firstBody.data.previewToken,
          items,
        }),
      }),
    );

    expect(confirm.status).toBe(201);

    expect(
      await prisma.merchantAlias.findUnique({
        where: { id: alias.id },
        select: { merchantId: true },
      }),
    ).toEqual({ merchantId: merchantB.id });

    expect(
      await prisma.merchantAliasEvent.findFirst({
        where: {
          userId: owner.id,
          action: "REASSIGNED",
          sourceMerchantId: merchantA.id,
          targetMerchantId: merchantB.id,
        },
        select: {
          aliasId: true,
          pattern: true,
          normalizedPattern: true,
        },
      }),
    ).toEqual({
      aliasId: alias.id,
      pattern: "Café",
      normalizedPattern: "cafe",
    });

    expect(
      await prisma.merchantAlias.count({
        where: {
          userId: owner.id,
          operator: "EQUALS",
          normalizedPattern: "cafe",
        },
      }),
    ).toBe(1);

    const secondPreview = await previewTransactionImportWithRules(
      previewRequest(
        account.id,
        "data,descricao,valor\n2026-09-01,Café,-11.01",
      ),
    );
    const secondBody = await secondPreview.json();

    expect(secondPreview.status).toBe(200);
    expect(secondBody.data.items[0]).toMatchObject({
      suggestedMerchantId: merchantB.id,
      suggestedMerchantName: "Merchant B",
      merchantAliasConflict: false,
    });
  });

});
