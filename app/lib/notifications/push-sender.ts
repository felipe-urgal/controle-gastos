import webpush from "web-push";

export type PushPayload = { title: string; body: string; url: string };
export type PushTarget = { endpoint: string; p256dh: string; auth: string };

/** `gone`: o serviço de push diz que a inscrição não existe mais (404 ou 410); deve ser desativada. */
export type PushResult = "sent" | "gone" | "failed";

/** Um dia: depois disso um push atrasado só confunde (o aviso continua na central). */
const PUSH_TTL_SECONDS = 24 * 60 * 60;
const PUSH_TIMEOUT_MS = 8_000;

function vapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

/** Sem as três variáveis VAPID o push fica desligado em silêncio (a central e o e-mail seguem). */
export function isPushConfigured() {
  return vapidConfig() !== null;
}

export function vapidPublicKey() {
  return vapidConfig()?.publicKey ?? null;
}

export async function sendPush(target: PushTarget, payload: PushPayload): Promise<PushResult> {
  const vapid = vapidConfig();
  if (!vapid) return "failed";

  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      { vapidDetails: vapid, TTL: PUSH_TTL_SECONDS, urgency: "normal", timeout: PUSH_TIMEOUT_MS },
    );
    return "sent";
  } catch (error) {
    const status = (error as { statusCode?: number } | null)?.statusCode;
    return status === 404 || status === 410 ? "gone" : "failed";
  }
}
