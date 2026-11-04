/** Mesmo nome e chave que o service worker usa (public/sw.js); o teste do manifesto amarra os dois. */
export const SHARE_CACHE_NAME = 'share-target-v1';
export const SHARE_IMAGE_KEY = '/__share-target/imagem';
/** Imagem compartilhada que ninguém abriu em 10 minutos é considerada abandonada. */
export const SHARE_IMAGE_MAX_AGE_MS = 10 * 60 * 1000;

export function isShareImageFresh(sharedAt: string | null, now: number = Date.now()) {
  const value = Number(sharedAt);
  return Number.isFinite(value) && value > 0 && now - value >= -60_000 && now - value <= SHARE_IMAGE_MAX_AGE_MS;
}

/**
 * Pega a imagem que o service worker guardou ao receber o compartilhamento e a apaga em seguida:
 * ela é lida uma única vez, só neste navegador, e nunca vai para o servidor.
 */
export async function takeSharedImage(
  storage: Pick<CacheStorage, 'open'> | undefined = typeof caches === 'undefined' ? undefined : caches,
  now: number = Date.now(),
): Promise<File | null> {
  if (!storage) return null;

  const cache = await storage.open(SHARE_CACHE_NAME);
  const response = await cache.match(SHARE_IMAGE_KEY);
  if (!response) return null;

  // Apaga antes de usar: mesmo que a leitura falhe, a imagem não fica esquecida no aparelho.
  await cache.delete(SHARE_IMAGE_KEY);
  if (!isShareImageFresh(response.headers.get('x-shared-at'), now)) return null;

  const blob = await response.blob();
  if (blob.size === 0) return null;
  return new File([blob], 'recibo-compartilhado', { type: response.headers.get('content-type') ?? blob.type });
}
