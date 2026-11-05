import { MAX_ATTACHMENT_BYTES } from '@/app/lib/transactions/attachment-domain';

export const ATTACHMENT_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';
const MAX_EDGE = 1600;

/** Tamanho depois de reduzir para caber em `maxEdge` no lado maior, mantendo a proporção (nunca amplia). */
export function scaledSize(width: number, height: number, maxEdge = MAX_EDGE) {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const ratio = maxEdge / longest;
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

export function formatAttachmentSize(bytes: number) {
  return bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Prepara o arquivo para envio. Foto grande (celular) é reduzida no navegador para JPEG de até 1600 px para caber no
 * limite; PDF e foto que já cabem seguem como estão. Se ainda passar do limite, avisa em vez de enviar.
 */
export async function prepareAttachmentFile(file: File): Promise<File> {
  let prepared = file;
  if (file.type.startsWith('image/') && file.size > MAX_ATTACHMENT_BYTES / 3) {
    prepared = (await downscaleImage(file)) ?? file;
  }
  if (prepared.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`O arquivo tem ${formatAttachmentSize(prepared.size)}; o máximo é ${formatAttachmentSize(MAX_ATTACHMENT_BYTES)}.`);
  }
  return prepared;
}

async function downscaleImage(file: File): Promise<File | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = scaledSize(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    if (!blob || blob.size >= file.size) return null;
    return new File([blob], file.name.replace(/\.[A-Za-z0-9]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return null;
  }
}
