import { generateNotificationsForUser } from "@/app/lib/notifications/notification-generation";
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
  let deadlineReached = false;

  for (const user of users) {
    if (performance.now() - startedAt >= NOTIFICATIONS_CRON_TIME_BUDGET_MS) {
      deadlineReached = true;
      break;
    }
    try {
      const result = await generateNotificationsForUser(user.id, now);
      created += result.created;
      processed += 1;
    } catch (error) {
      failed += 1;
      logEvent("error", "notifications.user_failed", {}, error);
    }
  }

  const remaining = total - processed - failed;
  const metrics = {
    status: failed > 0 || remaining > 0 ? ("partial" as const) : ("ok" as const),
    totalUsers: total,
    processedUsers: processed,
    failedUsers: failed,
    remainingUsers: remaining,
    createdNotifications: created,
    deadlineReached,
    durationMs: Math.round(performance.now() - startedAt),
  };

  // Só contagens agregadas: nenhum identificador nem conteúdo de aviso vai para o log.
  logEvent(metrics.status === "ok" ? "info" : "warn", "notifications.cron", metrics);
  if (metrics.status !== "ok") logEvent("warn", "notifications.alert", metrics);

  return metrics;
}
