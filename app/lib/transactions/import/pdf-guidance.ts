import { guessDocument, type DocumentGuess } from "@/app/lib/documents/document-guess";
import { extractPdfText } from "@/app/lib/transactions/import/pdf-experiment";

export function isPdfBytes(bytes: Uint8Array) {
  return bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

/**
 * Transações não importam PDF: o extrato do banco existe em CSV/OFX, que trazem identificador e valor exatos.
 * Em vez de um erro de codificação, explica isso e, se o PDF for de outro tipo, diz onde ele deve ser enviado.
 */
export function pdfGuidanceMessage(bytes: Uint8Array) {
  let guess: DocumentGuess | null = null;
  try {
    guess = guessDocument(extractPdfText(bytes).text);
  } catch {
    guess = null;
  }

  if (guess && guess.kind !== "BANK_ACCOUNT_STATEMENT" && guess.kind !== "CARD_STATEMENT") {
    return `Este PDF parece ser um ${guess.label}. Envie em: ${guess.where}.`;
  }

  const base = "PDF não é importado em Transações. Baixe o mesmo extrato ou fatura em CSV ou OFX no app do banco e envie esse arquivo";
  return guess ? `${base} (este PDF parece ser um ${guess.label}).` : `${base}.`;
}
