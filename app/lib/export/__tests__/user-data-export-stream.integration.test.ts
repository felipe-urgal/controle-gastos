import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { createUserDataExportStream } from "@/app/lib/export/user-data-export-stream";
import { prisma } from "@/app/lib/prisma";

const createdUserIds: string[] = [];

async function fixture(transactionCount: number) {
  const suffix = randomUUID();
  const user = await prisma.user.create({
    data: {
      name: "Stream Export",
      email: `stream-export-${suffix}@example.test`,
      password: "test-hash",
    },
  });
  createdUserIds.push(user.id);

  const account = await prisma.account.create({
    data: {
      name: `Conta ${suffix}`,
      type: "CREDIT_DEBIT",
      currency: "BRL",
      userId: user.id,
    },
  });
  const category = await prisma.category.create({
    data: {
      name: `Categoria ${suffix}`.slice(0, 50),
      type: "EXPENSE",
      userId: user.id,
    },
  });

  await prisma.transaction.createMany({
    data: Array.from({ length: transactionCount }, (_, index) => ({
      amount: 1_000 + index,
      year: 2026,
      month: 1 + Math.floor(index / 100),
      day: (index % 28) + 1,
      type: "EXPENSE",
      description: `Export row ${index}`,
      status: "COMPLETED",
      accountId: account.id,
      categoryId: category.id,
      userId: user.id,
    })),
  });

  return { user, account };
}

async function readStream(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];

  while (true) {
    const result = await reader.read();
    if (result.done) break;
    chunks.push(decoder.decode(result.value, { stream: true }));
  }
  chunks.push(decoder.decode());

  return chunks;
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

describe("streaming user export", () => {
  it("exports histories larger than one page without changing the JSON contract", async () => {
    const { user } = await fixture(1_200);
    const { stream, metadata } = await createUserDataExportStream({
      userId: user.id,
      format: "json",
      exportedAt: new Date("2026-09-29T12:00:00.000Z"),
    });

    const chunks = await readStream(stream);
    const body = JSON.parse(chunks.join(""));

    expect(metadata.transactionCount).toBe(1_200);
    expect(chunks.length).toBeGreaterThan(3);
    expect(body.formatVersion).toBe(2);
    expect(body.transactions).toHaveLength(1_200);
    expect(body.transactions[0]).toMatchObject({
      description: "Export row 0",
      amountCents: 1_000,
    });
    expect(
      body.transactions.find(
        (transaction: { description: string }) =>
          transaction.description === "Export row 1199",
      ),
    ).toMatchObject({
      description: "Export row 1199",
      amountCents: 2_199,
    });
  }, 30_000);

  it("keeps a repeatable-read snapshot while later pages are streamed", async () => {
    const { user } = await fixture(600);
    const target = await prisma.transaction.findFirstOrThrow({
      where: { userId: user.id, description: "Export row 599" },
      select: { id: true },
    });

    const { stream } = await createUserDataExportStream({
      userId: user.id,
      format: "json",
      exportedAt: new Date("2026-09-29T12:00:00.000Z"),
    });
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    const chunks: string[] = [];

    const prefix = await reader.read();
    expect(prefix.done).toBe(false);
    chunks.push(decoder.decode(prefix.value!, { stream: true }));

    const firstPage = await reader.read();
    expect(firstPage.done).toBe(false);
    chunks.push(decoder.decode(firstPage.value!, { stream: true }));

    await prisma.transaction.update({
      where: { id: target.id },
      data: { amount: 999_999 },
    });

    while (true) {
      const result = await reader.read();
      if (result.done) break;
      chunks.push(decoder.decode(result.value, { stream: true }));
    }
    chunks.push(decoder.decode());

    const body = JSON.parse(chunks.join(""));
    const exportedTarget = body.transactions.find(
      (transaction: { id: string }) => transaction.id === target.id,
    );

    expect(exportedTarget.amountCents).toBe(1_599);
  }, 30_000);
});
