import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { prisma } from "@/app/lib/prisma";

const createdUserIds: string[] = [];

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createUser(label: string) {
  const user = await prisma.user.create({
    data: { name: label, email: `notifications-${randomUUID()}@example.com`, password: "test-hash" },
  });
  createdUserIds.push(user.id);
  return user;
}

const base = {
  type: "COMMITMENT_DUE" as const,
  severity: "WARNING" as const,
  title: "Aluguel",
  body: "vence amanhã",
  href: "/dashboard",
};

describe("notificações no banco", () => {
  it("a mesma chave de deduplicação não grava dois avisos para o mesmo usuário", async () => {
    const user = await createUser("Dedupe");
    await prisma.notification.create({ data: { ...base, dedupeKey: "K1", userId: user.id } });

    await expect(
      prisma.notification.create({ data: { ...base, dedupeKey: "K1", userId: user.id } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("a mesma chave vale para usuários diferentes", async () => {
    const [first, second] = [await createUser("Um"), await createUser("Dois")];
    await prisma.notification.create({ data: { ...base, dedupeKey: "K1", userId: first.id } });
    await expect(
      prisma.notification.create({ data: { ...base, dedupeKey: "K1", userId: second.id } }),
    ).resolves.toMatchObject({ userId: second.id });
  });

  it("uma preferência por tipo e usuário, com e-mail e push desligados por padrão", async () => {
    const user = await createUser("Preferência");
    const created = await prisma.notificationPreference.create({
      data: { type: "BUDGET_LIMIT", userId: user.id },
    });
    expect(created).toMatchObject({ inApp: true, email: false, push: false });

    await expect(
      prisma.notificationPreference.create({ data: { type: "BUDGET_LIMIT", userId: user.id } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("apagar o usuário apaga avisos e preferências", async () => {
    const user = await createUser("Cascata");
    await prisma.notification.create({ data: { ...base, dedupeKey: "K1", userId: user.id } });
    await prisma.notificationPreference.create({ data: { type: "SUMMARY", userId: user.id } });

    await prisma.user.delete({ where: { id: user.id } });
    createdUserIds.splice(createdUserIds.indexOf(user.id), 1);

    expect(await prisma.notification.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.notificationPreference.count({ where: { userId: user.id } })).toBe(0);
  });
});
