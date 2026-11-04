import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({ getAuthenticatedUserId: vi.fn() }));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import {
  dismissNotification,
  getNotificationPreferences,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
} from "@/app/lib/notifications/notification-api";
import { generateNotificationsForUser } from "@/app/lib/notifications/notification-generation";
import { UnauthorizedError } from "@/app/lib/auth/auth-errors";
import { prisma } from "@/app/lib/prisma";

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

async function createUser(label: string) {
  const user = await prisma.user.create({
    data: { name: label, email: `notif-api-${randomUUID()}@example.com`, password: "test-hash" },
  });
  createdUserIds.push(user.id);
  return user;
}

async function seed(userId: string, count: number) {
  const base = new Date("2026-11-10T12:00:00.000Z").getTime();
  for (let index = 0; index < count; index += 1) {
    await prisma.notification.create({
      data: {
        userId,
        type: "COMMITMENT_DUE",
        severity: "WARNING",
        dedupeKey: `K${index}`,
        title: `Aviso ${index}`,
        body: "corpo",
        href: "/dashboard",
        createdAt: new Date(base + index * 1000),
      },
    });
  }
  return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
}

const as = (userId: string) => authMocks.getAuthenticatedUserId.mockResolvedValue(userId);
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const get = (path: string) => new Request(`http://localhost${path}`);
const json = (method: string, body: unknown) =>
  new Request("http://localhost/api/notification-preferences", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("API de avisos", () => {
  it("exige autenticação em todas as rotas", async () => {
    authMocks.getAuthenticatedUserId.mockRejectedValue(new UnauthorizedError());

    const responses = await Promise.all([
      listNotifications(get("/api/notifications")),
      markAllNotificationsRead(),
      markNotificationRead(get("/x"), ctx("id")),
      dismissNotification(get("/x"), ctx("id")),
      getNotificationPreferences(),
      updateNotificationPreferences(json("PUT", { preferences: [] })),
    ]);

    expect(responses.map((response) => response.status)).toEqual([401, 401, 401, 401, 401, 401]);
  });

  it("lista do mais novo para o mais antigo, com paginação e contador de não lidos", async () => {
    const user = await createUser("Lista");
    await seed(user.id, 5);
    as(user.id);

    const first = await (await listNotifications(get("/api/notifications?page=1&pageSize=2"))).json();
    const second = await (await listNotifications(get("/api/notifications?page=3&pageSize=2"))).json();

    expect(first.data.items.map((item: { title: string }) => item.title)).toEqual(["Aviso 4", "Aviso 3"]);
    expect(first.data).toMatchObject({ total: 5, totalPages: 3, unreadCount: 5, page: 1, pageSize: 2 });
    expect(second.data.items.map((item: { title: string }) => item.title)).toEqual(["Aviso 0"]);
  });

  it("rejeita paginação inválida", async () => {
    const user = await createUser("Paginação");
    as(user.id);

    for (const query of ["page=0", "pageSize=0", "pageSize=1000", "page=x", "unreadOnly=talvez"]) {
      expect((await listNotifications(get(`/api/notifications?${query}`))).status).toBe(400);
    }
  });

  it("marca como lido, é idempotente e filtra por não lidos", async () => {
    const user = await createUser("Leitura");
    const [first] = await seed(user.id, 3);
    as(user.id);

    const marked = await (await markNotificationRead(get("/x"), ctx(first.id))).json();
    const again = await (await markNotificationRead(get("/x"), ctx(first.id))).json();
    expect(marked.data.readAt).not.toBeNull();
    expect(again.data.readAt).toBe(marked.data.readAt);

    const unread = await (await listNotifications(get("/api/notifications?unreadOnly=true"))).json();
    expect(unread.data.total).toBe(2);
    expect(unread.data.unreadCount).toBe(2);
  });

  it("marca todos como lidos", async () => {
    const user = await createUser("Todos");
    await seed(user.id, 3);
    as(user.id);

    const result = await (await markAllNotificationsRead()).json();
    const list = await (await listNotifications(get("/api/notifications"))).json();

    expect(result.data.updated).toBe(3);
    expect(list.data.unreadCount).toBe(0);
  });

  it("aviso de outro usuário é 404 e não é alterado", async () => {
    const owner = await createUser("Dono");
    const intruder = await createUser("Intruso");
    const [notification] = await seed(owner.id, 1);
    as(intruder.id);

    expect((await markNotificationRead(get("/x"), ctx(notification.id))).status).toBe(404);
    expect((await dismissNotification(get("/x"), ctx(notification.id))).status).toBe(404);

    const stored = await prisma.notification.findUniqueOrThrow({ where: { id: notification.id } });
    expect(stored.readAt).toBeNull();
    expect(stored.dismissedAt).toBeNull();
    expect((await (await listNotifications(get("/api/notifications"))).json()).data.total).toBe(0);
  });

  it("dispensar esconde o aviso, mas a linha fica e o cron não o recria", async () => {
    const user = await createUser("Dispensa");
    const account = await prisma.account.create({
      data: { name: "Conta", type: "CREDIT_DEBIT", currency: "BRL", userId: user.id },
    });
    const income = await prisma.category.create({
      data: { name: `Salário ${randomUUID()}`.slice(0, 50), type: "INCOME", userId: user.id },
    });
    const expense = await prisma.category.create({
      data: { name: `Mercado ${randomUUID()}`.slice(0, 50), type: "EXPENSE", userId: user.id },
    });
    const common = { userId: user.id, accountId: account.id, kind: "NORMAL" as const };
    await prisma.transaction.create({
      data: { ...common, categoryId: income.id, type: "INCOME", status: "COMPLETED", amount: 50_000_000, description: "Saldo", year: 2026, month: 11, day: 1 },
    });
    await prisma.transaction.create({
      data: { ...common, categoryId: expense.id, type: "EXPENSE", status: "PENDING", amount: 10_000, description: "Aluguel", year: 2026, month: 11, day: 11 },
    });
    const now = new Date("2026-11-10T15:00:00.000Z");
    await generateNotificationsForUser(user.id, now);
    as(user.id);

    const [created] = (await (await listNotifications(get("/api/notifications"))).json()).data.items;
    expect((await dismissNotification(get("/x"), ctx(created.id))).status).toBe(200);

    expect((await (await listNotifications(get("/api/notifications"))).json()).data.total).toBe(0);
    expect((await generateNotificationsForUser(user.id, now)).created).toBe(0);
    expect(await prisma.notification.count({ where: { userId: user.id } })).toBe(1);
    expect((await markNotificationRead(get("/x"), ctx(created.id))).status).toBe(404);
  });
});

describe("API de preferências de avisos", () => {
  it("sem escolha devolve o padrão de todos os tipos", async () => {
    const user = await createUser("Padrão");
    as(user.id);

    const { data } = await (await getNotificationPreferences()).json();

    expect(data.preferences).toHaveLength(7);
    expect(data.preferences.every((item: { isDefault: boolean }) => item.isDefault)).toBe(true);
    expect(data.preferences.find((item: { type: string }) => item.type === "COMMITMENT_DUE")).toMatchObject({
      inApp: true,
      email: false,
      push: false,
    });
    expect(data.preferences.find((item: { type: string }) => item.type === "INCOME_OVERDUE")).toMatchObject({
      inApp: false,
    });
  });

  it("salva por tipo, atualiza sem duplicar e mistura com o padrão", async () => {
    const user = await createUser("Salvar");
    as(user.id);

    await updateNotificationPreferences(
      json("PUT", { preferences: [{ type: "INCOME_OVERDUE", inApp: true, email: true, push: false }] }),
    );
    const response = await updateNotificationPreferences(
      json("PUT", { preferences: [{ type: "INCOME_OVERDUE", inApp: true, email: false, push: false }] }),
    );
    const { data } = await response.json();

    expect(response.status).toBe(200);
    expect(await prisma.notificationPreference.count({ where: { userId: user.id } })).toBe(1);
    expect(data.preferences.find((item: { type: string }) => item.type === "INCOME_OVERDUE")).toMatchObject({
      inApp: true,
      email: false,
      isDefault: false,
    });
    expect(data.preferences.find((item: { type: string }) => item.type === "BUDGET_LIMIT").isDefault).toBe(true);
  });

  it("rejeita corpo inválido sem gravar nada", async () => {
    const user = await createUser("Inválido");
    as(user.id);
    const valid = { type: "SUMMARY", inApp: true, email: false, push: false };

    const bodies = [
      { preferences: [] },
      { preferences: [valid, valid] },
      { preferences: [{ ...valid, type: "OUTRO" }] },
      { preferences: [{ ...valid, inApp: "sim" }] },
      {},
    ];
    for (const body of bodies) {
      expect((await updateNotificationPreferences(json("PUT", body))).status).toBe(400);
    }
    expect(await prisma.notificationPreference.count({ where: { userId: user.id } })).toBe(0);
  });

  it("as preferências de um usuário não aparecem para outro", async () => {
    const first = await createUser("Um");
    const second = await createUser("Dois");
    as(first.id);
    await updateNotificationPreferences(
      json("PUT", { preferences: [{ type: "SUMMARY", inApp: false, email: true, push: false }] }),
    );

    as(second.id);
    const { data } = await (await getNotificationPreferences()).json();

    expect(data.preferences.find((item: { type: string }) => item.type === "SUMMARY")).toMatchObject({
      inApp: true,
      email: false,
      isDefault: true,
    });
  });
});
