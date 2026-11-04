import { prisma } from "@/app/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Avisos já resolvidos (lidos ou dispensados) são apagados depois disso. */
export const NOTIFICATION_RETENTION_DAYS = 90;
/** Inscrições de push desativadas (expiradas) são apagadas depois disso. */
export const DISABLED_PUSH_RETENTION_DAYS = 30;

/**
 * Retenção: apaga avisos lidos ou dispensados com mais de 90 dias e inscrições de push
 * desativadas há mais de 30. Aviso não lido nunca é apagado. Seguro para a deduplicação:
 * as chaves carregam a data ou o mês do fato, então um fato antigo não volta a ser candidato.
 */
export async function purgeStaleNotificationData(now: Date = new Date()) {
  const notificationCutoff = new Date(now.getTime() - NOTIFICATION_RETENTION_DAYS * DAY_MS);
  const subscriptionCutoff = new Date(now.getTime() - DISABLED_PUSH_RETENTION_DAYS * DAY_MS);

  const [notifications, subscriptions] = await Promise.all([
    prisma.notification.deleteMany({
      where: {
        createdAt: { lt: notificationCutoff },
        OR: [{ readAt: { not: null } }, { dismissedAt: { not: null } }],
      },
    }),
    prisma.pushSubscription.deleteMany({
      where: { disabledAt: { not: null, lt: subscriptionCutoff } },
    }),
  ]);

  return { notifications: notifications.count, subscriptions: subscriptions.count };
}
