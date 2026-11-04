import { failure, success } from "@/app/lib/api-response";
import { apiFailureFromError } from "@/app/lib/api/api-error-response";
import { parseJsonBody } from "@/app/lib/api/request-json";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import {
  MAX_PUSH_SUBSCRIPTIONS_PER_USER,
  pushSubscribeSchema,
  pushUnsubscribeSchema,
} from "@/app/lib/notifications/push-schema";
import { isPushConfigured, vapidPublicKey } from "@/app/lib/notifications/push-sender";
import { prisma } from "@/app/lib/prisma";

/** A chave pública VAPID não é segredo, mas só é entregue a quem tem sessão. */
export async function getPushPublicKey() {
  try {
    await getAuthenticatedUserId();
    return success({ configured: isPushConfigured(), publicKey: vapidPublicKey() });
  } catch (error) {
    return apiFailureFromError(error, { fallbackMessage: "Erro ao carregar a configuração de push" });
  }
}

export async function subscribePush(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!isPushConfigured()) return failure("Notificações push não estão disponíveis", 503, "PUSH_NOT_CONFIGURED");

    const { endpoint, keys } = pushSubscribeSchema.parse(await parseJsonBody(request));
    const userAgent = request.headers.get("user-agent")?.slice(0, 255) ?? null;

    // O endpoint identifica o aparelho. Se ele já estava ligado a outra conta, passa para esta:
    // quem entrou por último no aparelho é quem deve receber os avisos dele.
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent },
      update: { userId, p256dh: keys.p256dh, auth: keys.auth, userAgent, disabledAt: null },
    });

    // Limite por usuário: mantém as mais recentes e remove o excedente das mais antigas.
    const all = await prisma.pushSubscription.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true },
    });
    if (all.length > MAX_PUSH_SUBSCRIPTIONS_PER_USER) {
      await prisma.pushSubscription.deleteMany({
        where: { userId, id: { in: all.slice(MAX_PUSH_SUBSCRIPTIONS_PER_USER).map((item) => item.id) } },
      });
    }

    return success({ subscribed: true }, "Notificações ativadas neste aparelho", 201);
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: "Erro ao ativar as notificações",
      zodMessage: "Inscrição de push inválida",
    });
  }
}

export async function unsubscribePush(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const { endpoint } = pushUnsubscribeSchema.parse(await parseJsonBody(request));

    // Idempotente e restrito ao dono: apagar um endpoint de outra conta não faz nada.
    await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
    return success({ subscribed: false }, "Notificações desativadas neste aparelho");
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: "Erro ao desativar as notificações",
      zodMessage: "Inscrição de push inválida",
    });
  }
}
