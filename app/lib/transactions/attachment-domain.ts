/**
 * Comprovantes de lançamento: tipo verificado pelos bytes (o nome e o `Content-Type` do cliente não valem como prova)
 * e nome de arquivo seguro. Puro.
 */

export const MAX_ATTACHMENT_BYTES = 1_572_864; // 1,5 MB
export const MAX_ATTACHMENTS_PER_TRANSACTION = 5;
export const MAX_ATTACHMENT_BYTES_PER_USER = 52_428_800; // 50 MB

export type AttachmentMime = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

const EXTENSION: Record<AttachmentMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0) {
  return signature.every((value, index) => bytes[offset + index] === value);
}

/** Reconhece JPEG, PNG, WebP e PDF pelos primeiros bytes; qualquer outra coisa é `null`. */
export function detectAttachmentMime(bytes: Uint8Array): AttachmentMime | null {
  if (bytes.length < 12) return null;
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  return null;
}

/** Tira caminho, caracteres de controle e aspas do nome; limita o tamanho e garante uma extensão coerente com o tipo. */
export function safeAttachmentFilename(raw: string | null | undefined, mime: AttachmentMime) {
  const extension = EXTENSION[mime];
  const base = (raw ?? "")
    .split(/[\\/]/)
    .pop()!
    .replace(/[\u0000-\u001f\u007f"<>:*?|]/g, "")
    .trim();
  const withoutExtension = base.replace(/\.[A-Za-z0-9]{1,5}$/, "").trim();
  const name = (withoutExtension || "comprovante").slice(0, 100);
  return `${name}.${extension}`;
}
