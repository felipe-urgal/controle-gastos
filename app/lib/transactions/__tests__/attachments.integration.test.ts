import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({ getAuthenticatedUserId: vi.fn() }));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { UnauthorizedError } from "@/app/lib/auth/auth-errors";
import { prisma } from "@/app/lib/prisma";
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_TRANSACTION,
} from "@/app/lib/transactions/attachment-domain";
import {
  deleteTransactionAttachment,
  downloadTransactionAttachment,
  listTransactionAttachments,
  uploadTransactionAttachment,
} from "@/app/lib/transactions/attachments";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const fixtures = new FinancialTestFactory();

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  await fixtures.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 1, 2, 3, 4];
const png = (extra = 0) => new Uint8Array([...PNG, ...new Array(extra).fill(7)]);

async function setup() {
  const owner = await fixtures.user({ name: "Attachment Owner" });
  const account = await fixtures.account(owner.id, { name: "Conta anexo", currency: "BRL" });
  const category = await fixtures.category(owner.id, { name: "Categoria anexo", type: "EXPENSE" });
  const transaction = await prisma.transaction.create({
    data: { userId: owner.id, accountId: account.id, categoryId: category.id, amount: 1_000, type: "EXPENSE", status: "COMPLETED", description: "Compra", year: 2028, month: 4, day: 10 },
  });
  authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
  return { owner, account, category, transaction };
}

const ctx = (id: string, attachmentId?: string) => ({ params: Promise.resolve({ id, attachmentId }) });

function upload(id: string, bytes: Uint8Array, name = "nota.png", type = "image/png") {
  const form = new FormData();
  form.set("file", new File([bytes as BlobPart], name, { type }));
  return uploadTransactionAttachment(new Request(`http://localhost/api/transactions/${id}/attachments`, { method: "POST", body: form }), ctx(id));
}

describe("comprovantes de transação", () => {
  it("anexa, lista sem os bytes, baixa com cabeçalhos seguros e remove", async () => {
    const { transaction } = await setup();
    const created = await upload(transaction.id, png(100));
    expect(created.status).toBe(200);
    const meta = (await created.json()).data;
    expect(meta).toMatchObject({ filename: "nota.png", mimeType: "image/png", sizeBytes: png(100).length });

    const list = await (await listTransactionAttachments(new Request("http://localhost/x"), ctx(transaction.id))).json();
    expect(list.data.items).toHaveLength(1);
    expect(list.data.items[0]).not.toHaveProperty("data");

    const file = await downloadTransactionAttachment(new Request("http://localhost/x"), ctx(transaction.id, meta.id));
    expect(file.status).toBe(200);
    expect(file.headers.get("content-type")).toBe("image/png");
    expect(file.headers.get("x-content-type-options")).toBe("nosniff");
    expect(file.headers.get("content-security-policy")).toContain("sandbox");
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(png(100));

    expect((await deleteTransactionAttachment(new Request("http://localhost/x"), ctx(transaction.id, meta.id))).status).toBe(200);
    expect(await prisma.transactionAttachment.count()).toBe(0);
  });

  it("o tipo vem dos bytes: HTML disfarçado de .png é recusado e o nome ganha a extensão real", async () => {
    const { transaction } = await setup();
    const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
    expect((await upload(transaction.id, html, "foto.png", "image/png")).status).toBe(415);
    const ok = await upload(transaction.id, png(), "../../foto.jpeg", "image/jpeg");
    expect((await ok.json()).data).toMatchObject({ filename: "foto.png", mimeType: "image/png" });
  });

  it("respeita os limites de tamanho, vazio, quantidade por transação e cota do usuário", async () => {
    const { owner, transaction } = await setup();
    expect((await upload(transaction.id, png(MAX_ATTACHMENT_BYTES))).status).toBe(413);
    expect((await upload(transaction.id, new Uint8Array(0))).status).toBe(400);

    for (let index = 0; index < MAX_ATTACHMENTS_PER_TRANSACTION; index += 1) {
      expect((await upload(transaction.id, png(index))).status).toBe(200);
    }
    const sixth = await upload(transaction.id, png(9));
    expect(sixth.status).toBe(409);
    expect((await sixth.json()).error.code).toBe("ATTACHMENT_LIMIT");

    // Cota: simula quase 50 MB já usados por outra transação.
    const other = await prisma.transaction.create({
      data: { userId: owner.id, accountId: transaction.accountId, categoryId: transaction.categoryId, amount: 1, type: "EXPENSE", status: "COMPLETED", description: "Outra", year: 2028, month: 4, day: 11 },
    });
    await prisma.transactionAttachment.deleteMany({});
    await prisma.transactionAttachment.create({
      data: { userId: owner.id, transactionId: other.id, filename: "grande.png", mimeType: "image/png", sizeBytes: 2_097_152, data: Buffer.alloc(8) },
    });
    // 25 registros de 2 MiB = 50 MiB: o próximo estoura a cota.
    await prisma.transactionAttachment.createMany({
      data: Array.from({ length: 24 }, () => ({ userId: owner.id, transactionId: other.id, filename: "g.png", mimeType: "image/png", sizeBytes: 2_097_152, data: Buffer.alloc(8) })),
    });
    const over = await upload(transaction.id, png(5));
    expect(over.status).toBe(409);
    expect((await over.json()).error.code).toBe("ATTACHMENT_QUOTA");
  });

  it("outro usuário não lista, baixa, remove nem anexa; sem sessão é 401", async () => {
    const { transaction } = await setup();
    const created = (await (await upload(transaction.id, png())).json()).data;

    const stranger = await fixtures.user({ name: "Attachment Stranger" });
    authMocks.getAuthenticatedUserId.mockResolvedValue(stranger.id);
    expect((await listTransactionAttachments(new Request("http://localhost/x"), ctx(transaction.id))).status).toBe(404);
    expect((await downloadTransactionAttachment(new Request("http://localhost/x"), ctx(transaction.id, created.id))).status).toBe(404);
    expect((await deleteTransactionAttachment(new Request("http://localhost/x"), ctx(transaction.id, created.id))).status).toBe(404);
    expect((await upload(transaction.id, png())).status).toBe(404);
    expect(await prisma.transactionAttachment.count()).toBe(1);

    authMocks.getAuthenticatedUserId.mockRejectedValue(new UnauthorizedError());
    expect((await listTransactionAttachments(new Request("http://localhost/x"), ctx(transaction.id))).status).toBe(401);
  });

  it("apagar a transação leva os comprovantes junto", async () => {
    const { transaction } = await setup();
    await upload(transaction.id, png());
    await prisma.transaction.delete({ where: { id: transaction.id } });
    expect(await prisma.transactionAttachment.count()).toBe(0);
  });
});
