import { deliverNotificationsForUser } from "@/app/lib/notifications/notification-delivery";
import { generateNotificationsForUser } from "@/app/lib/notifications/notification-generation";
import { purgeStaleNotificationData } from "@/app/lib/notifications/notification-retention";
import { logEvent } from "@/app/lib/observability";
import { prisma } from "@/app/lib/prisma";

// Um job diário de 60 s não pode prometer cobertura para volume ilimitado.
export const NOTIFICATIONS_CRON_MAX_USERS = 200;
export const NOTIFICATIONS_CRON_TIME_BUDGET_MS = 48_000;

/**
 * Gera os avisos do dia para os usuários ativos. Cada usuário é isolado: a falha de um não
 * interrompe os outros. Usuários não alcançados no tempo ou no limite aparecem em `remaining`
 * (e no log), para o alerta enxergar a cobertura em risco.
 */
export async function runNotificationsCron(now: Date = new Date()) {
  const startedAt = performance.now();
  const total = await prisma.user.count({ where: { isActive: true } });
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
    orderBy: { id: "asc" },
    take: NOTIFICATIONS_CRON_MAX_USERS,
  });

  let processed = 0;
  let failed = 0;
  let created = 0;
  let emailed = 0;
  let pushed = 0;
  let deliveryFailures = 0;
  let deadlineReached = false;

  for (const user of users) {
    if (performance.now() - startedAt >= NOTIFICATIONS_CRON_TIME_BUDGET_MS) {
      deadlineReached = true;
      break;
    }
    try {
      const result = await generateNotificationsForUser(user.id, now);
      created += result.created;
      const delivery = await deliverNotificationsForUser(user.id, now);
      emailed += delivery.emailed;
      pushed += delivery.pushed;
      deliveryFailures += delivery.failures;
      processed += 1;
    } catch (error) {
      failed += 1;
      logEvent("error", "notifications.user_failed", {}, error);
    }
  }

  // A retenção roda por último e nunca derruba o job: se falhar, tenta de novo amanhã.
  let purged = { notifications: 0, subscriptions: 0 };
  try {
    purged = await purgeStaleNotificationData(now);
  } catch (error) {
    logEvent("error", "notifications.retention_failed", {}, error);
  }

  const remaining = total - processed - failed;
  const metrics = {
    status:
      failed > 0 || remaining > 0 || deliveryFailures > 0 ? ("partial" as const) : ("ok" as const),
    totalUsers: total,
    processedUsers: processed,
    failedUsers: failed,
    remainingUsers: remaining,
    createdNotifications: created,
    emailedNotifications: emailed,
    pushedNotifications: pushed,
    deliveryFailures,
    purgedNotifications: purged.notifications,
    purgedSubscriptions: purged.subscriptions,
    deadlineReached,
    durationMs: Math.round(performance.now() - startedAt),
  };

  // Só contagens agregadas: nenhum identificador nem conteúdo de aviso vai para o log.
  logEvent(metrics.status === "ok" ? "info" : "warn", "notifications.cron", metrics);
  // O alerta é de cobertura (usuário que falhou ou não foi alcançado). Falha de entrega, como um
  // aparelho desligado, já aparece em `deliveryFailures` e não pede ação.
  if (failed > 0 || remaining > 0) logEvent("warn", "notifications.alert", metrics);

  return metrics;
}
