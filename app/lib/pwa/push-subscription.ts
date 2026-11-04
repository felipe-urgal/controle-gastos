/**
 * Inscrição de Web Push no navegador. O service worker só é registrado em produção
 * (`ServiceWorkerRegistration`), então em desenvolvimento o push aparece como indisponível.
 */

export type PushStatus = 'unsupported' | 'unconfigured' | 'denied' | 'off' | 'on';

/** Estado mostrado ao usuário a partir dos fatos do navegador e do servidor (função pura). */
export function derivePushStatus(facts: {
  supported: boolean;
  configured: boolean;
  permission: NotificationPermission | 'unavailable';
  subscribed: boolean;
}): PushStatus {
  if (!facts.configured) return 'unconfigured';
  if (!facts.supported) return 'unsupported';
  if (facts.permission === 'denied') return 'denied';
  return facts.subscribed && facts.permission === 'granted' ? 'on' : 'off';
}

/** Converte a chave pública VAPID (base64url) no formato que `pushManager.subscribe` espera. */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

async function registration() {
  if (!isPushSupported()) return null;
  return (await navigator.serviceWorker.getRegistration('/')) ?? null;
}

export async function readPushState() {
  const current = await registration();
  const subscription = current ? await current.pushManager.getSubscription() : null;
  return {
    // Sem service worker registrado (desenvolvimento) não há como inscrever.
    supported: current !== null,
    permission: (isPushSupported() ? Notification.permission : 'unavailable') as NotificationPermission | 'unavailable',
    subscription,
  };
}

/** Pede permissão e inscreve este aparelho. Lança se o usuário negar. */
export async function subscribeThisDevice(publicKey: string): Promise<PushSubscription> {
  const current = await registration();
  if (!current) throw new Error('Notificações push não estão disponíveis neste navegador.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('A permissão de notificações foi negada. Libere nas configurações do navegador.');
  }

  return (
    (await current.pushManager.getSubscription()) ??
    current.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  );
}

/** Cancela a inscrição deste aparelho e devolve o endpoint para o servidor esquecê-lo. */
export async function unsubscribeThisDevice(): Promise<string | null> {
  const current = await registration();
  const subscription = current ? await current.pushManager.getSubscription() : null;
  if (!subscription) return null;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  return endpoint;
}
