import { emailDeliveryFailureContext } from "@/app/lib/auth/auth-email";
import {
  isEmailDeliveryConfigured,
  sendNotificationDigest,
} from "@/app/lib/notifications/notification-email";
import { resolveChannels } from "@/app/lib/notifications/notification-preferences";
import { isPushConfigured, sendPush } from "@/app/lib/notifications/push-sender";
import { logEvent } from "@/app/lib/observability";
import { prisma } from "@/app/lib/prisma";

/** Só avisos das últimas 24 h saem por e-mail e push; o que for mais antigo fica na central. */
const DELIVERY_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_ITEMS_PER_RUN = 20;

export type DeliveryResult = {
  emailed: number;
  pushed: number;
  /** Falhas esperadas de provedor (e-mail recusado, push que não chegou); o aviso continua na central. */
  failures: number;
};

const NOTHING: DeliveryResult = { emailed: 0, pushed: 0, failures: 0 };

/**
 * Entrega os avisos novos de um usuário fora do app: um e-mail diário único e um push por aviso.
 * Cada canal só vale se o usuário o ligou para o tipo e se o servidor o tem configurado; o que
 * já foi entregue (`emailedAt`, `pushedAt`) nunca é reenviado. Falha de provedor não derruba
 * o usuário: o aviso permanece na central e a próxima execução tenta de novo dentro da janela.
 */
export async function deliverNotificationsForUser(
  userId: string,
  now: Date = new Date(),
): Promise<DeliveryResult> {
  const emailOn = isEmailDeliveryConfigured();
  const pushOn = isPushConfigured();
  if (!emailOn && !pushOn) return NOTHING;

  const user = await prisma.user.findFirst({
    where: { id: userId, isActive: true },
    select: { email: true, name: true, emailVerifiedAt: true },
  });
  if (!user) return NOTHING;

  const preferences = await prisma.notificationPreference.findMany({
    where: { userId },
    select: { type: true, inApp: true, email: true, push: true },
  });

  const recent = await prisma.notification.findMany({
    where: {
      userId,
      dismissedAt: null,
      createdAt: { gte: new Date(now.getTime() - DELIVERY_WINDOW_MS), lte: now },
      OR: [{ emailedAt: null }, { pushedAt: null }],
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: MAX_ITEMS_PER_RUN,
  });
  if (recent.length === 0) return NOTHING;

  const result = { ...NOTHING };

  const emailItems = recent.filter(
    (item) => item.emailedAt === null && resolveChannels(item.type, preferences).email,
  );
  if (emailOn && user.emailVerifiedAt && emailItems.length > 0) {
    try {
      await sendNotificationDigest({ to: user.email, name: user.name, items: emailItems });
      await prisma.notification.updateMany({
        where: { id: { in: emailItems.map((item) => item.id) }, userId },
        data: { emailedAt: now },
      });
      result.emailed = emailItems.length;
    } catch (error) {
      result.failures += 1;
      logEvent("warn", "notifications.email_failed", emailDeliveryFailureContext(error));
    }
  }

  const pushItems = recent.filter(
    (item) => item.pushedAt === null && resolveChannels(item.type, preferences).push,
  );
  if (pushOn && pushItems.length > 0) {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId, disabledAt: null },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });

    if (subscriptions.length > 0) {
      const delivered: string[] = [];
      const gone = new Set<string>();
      const succeeded = new Set<string>();

      for (const item of pushItems) {
        let reached = false;
        for (const subscription of subscriptions) {
          if (gone.has(subscription.id)) continue;
          const outcome = await sendPush(subscription, {
            title: item.title,
            body: item.body,
            url: item.href,
          });
          if (outcome === "sent") {
            reached = true;
            succeeded.add(subscription.id);
          } else if (outcome === "gone") {
            gone.add(subscription.id);
          } else {
            result.failures += 1;
          }
        }
        if (reached) delivered.push(item.id);
      }

      if (delivered.length > 0) {
        await prisma.notification.updateMany({
          where: { id: { in: delivered }, userId },
          data: { pushedAt: now },
        });
        result.pushed = delivered.length;
      }
      if (succeeded.size > 0) {
        await prisma.pushSubscription.updateMany({
          where: { id: { in: [...succeeded] }, userId },
          data: { lastSuccessAt: now },
        });
      }
      if (gone.size > 0) {
        await prisma.pushSubscription.updateMany({
          where: { id: { in: [...gone] }, userId },
          data: { disabledAt: now },
        });
      }
    }
  }

  return result;
}
