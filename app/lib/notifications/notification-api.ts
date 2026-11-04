import type { Notification } from "@prisma/client";
import { NotificationType } from "@prisma/client";

import { failure, success } from "@/app/lib/api-response";
import { apiFailureFromError } from "@/app/lib/api/api-error-response";
import { parseQuery } from "@/app/lib/api/query";
import { parseJsonBody } from "@/app/lib/api/request-json";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { NOTIFICATION_DEFAULTS } from "@/app/lib/notifications/notification-model";
import {
  notificationListQuerySchema,
  updateNotificationPreferencesSchema,
} from "@/app/lib/notifications/notification-schema";
import { prisma } from "@/app/lib/prisma";

type RouteContext = { params: Promise<{ id?: string }> };

function toDTO(row: Notification) {
  return {
    id: row.id,
    type: row.type,
    severity: row.severity,
    title: row.title,
    body: row.body,
    href: row.href,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
  };
}

/** Avisos dispensados nunca voltam (a linha fica, para a chave de deduplicação continuar valendo). */
const visibleTo = (userId: string) => ({ userId, dismissedAt: null });

async function ownedNotification(userId: string, context: RouteContext | undefined) {
  const id = context ? (await context.params).id : undefined;
  if (!id) return null;
  return prisma.notification.findFirst({ where: { id, ...visibleTo(userId) } });
}

export async function listNotifications(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const { page, pageSize, unreadOnly } = parseQuery(request, notificationListQuerySchema);
    const where = { ...visibleTo(userId), ...(unreadOnly ? { readAt: null } : {}) };

    const [rows, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...visibleTo(userId), readAt: null } }),
    ]);

    return success({
      items: rows.map(toDTO),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      unreadCount,
    });
  } catch (error) {
    return apiFailureFromError(error, { fallbackMessage: "Erro ao carregar avisos" });
  }
}

export async function markNotificationRead(_request: Request, context?: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();
    const current = await ownedNotification(userId, context);
    if (!current) return failure("Aviso não encontrado", 404);

    const updated = current.readAt
      ? current
      : await prisma.notification.update({ where: { id: current.id }, data: { readAt: new Date() } });
    return success(toDTO(updated));
  } catch (error) {
    return apiFailureFromError(error, { fallbackMessage: "Erro ao marcar aviso como lido" });
  }
}

export async function markAllNotificationsRead() {
  try {
    const userId = await getAuthenticatedUserId();
    const result = await prisma.notification.updateMany({
      where: { ...visibleTo(userId), readAt: null },
      data: { readAt: new Date() },
    });
    return success({ updated: result.count });
  } catch (error) {
    return apiFailureFromError(error, { fallbackMessage: "Erro ao marcar avisos como lidos" });
  }
}

export async function dismissNotification(_request: Request, context?: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();
    const current = await ownedNotification(userId, context);
    if (!current) return failure("Aviso não encontrado", 404);

    const now = new Date();
    await prisma.notification.update({
      where: { id: current.id },
      data: { dismissedAt: now, readAt: current.readAt ?? now },
    });
    return success({ id: current.id }, "Aviso removido");
  } catch (error) {
    return apiFailureFromError(error, { fallbackMessage: "Erro ao remover aviso" });
  }
}

async function preferencesFor(userId: string) {
  const rows = await prisma.notificationPreference.findMany({ where: { userId } });
  const byType = new Map(rows.map((row) => [row.type, row]));

  return Object.values(NotificationType).map((type) => {
    const row = byType.get(type);
    const channels = row
      ? { inApp: row.inApp, email: row.email, push: row.push }
      : NOTIFICATION_DEFAULTS[type];
    return { type, ...channels, isDefault: !row };
  });
}

export async function getNotificationPreferences() {
  try {
    const userId = await getAuthenticatedUserId();
    return success({ preferences: await preferencesFor(userId) });
  } catch (error) {
    return apiFailureFromError(error, { fallbackMessage: "Erro ao carregar preferências de avisos" });
  }
}

export async function updateNotificationPreferences(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = updateNotificationPreferencesSchema.parse(await parseJsonBody(request));

    await prisma.$transaction(
      input.preferences.map((item) =>
        prisma.notificationPreference.upsert({
          where: { userId_type: { userId, type: item.type } },
          create: { userId, type: item.type, inApp: item.inApp, email: item.email, push: item.push },
          update: { inApp: item.inApp, email: item.email, push: item.push },
        }),
      ),
    );

    return success({ preferences: await preferencesFor(userId) }, "Preferências salvas");
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: "Erro ao salvar preferências de avisos",
      zodMessage: "Preferências inválidas",
    });
  }
}
