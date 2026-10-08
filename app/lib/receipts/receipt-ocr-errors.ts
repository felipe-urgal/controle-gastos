export type ReceiptOcrErrorCode =
  | "unsupported-format"
  | "empty-file"
  | "file-too-large"
  | "dimensions-too-large"
  | "corrupted-image"
  | "unsupported-browser"
  | "engine-unavailable"
  | "recognition-failed"
  | "timeout"
  | "canceled";

const MESSAGES: Record<ReceiptOcrErrorCode, string> = {
  "unsupported-format": "Use uma imagem JPG ou PNG. HEIC e WebP ainda não são suportados.",
  "empty-file": "A imagem está vazia.",
  "file-too-large": "A imagem deve ter no máximo 6 MB.",
  "dimensions-too-large": "A imagem tem dimensões grandes demais. Use uma foto de até 40 megapixels.",
  "corrupted-image": "Não foi possível abrir a imagem. Ela pode estar corrompida.",
  "unsupported-browser": "OCR local não é suportado neste navegador.",
  "engine-unavailable": "O leitor de recibos não está disponível agora. Tente novamente.",
  "recognition-failed": "Não foi possível ler o recibo. Tente outra imagem.",
  timeout: "A leitura demorou demais e foi interrompida. Tente novamente.",
  canceled: "OCR cancelado.",
};

export class ReceiptOcrError extends Error {
  readonly code: ReceiptOcrErrorCode;

  constructor(code: ReceiptOcrErrorCode) {
    super(MESSAGES[code]);
    this.name = "ReceiptOcrError";
    this.code = code;
  }
}

export function isReceiptOcrCancellation(error: unknown) {
  return (
    (error instanceof ReceiptOcrError && error.code === "canceled") ||
    (error instanceof DOMException && error.name === "AbortError")
  );
}
