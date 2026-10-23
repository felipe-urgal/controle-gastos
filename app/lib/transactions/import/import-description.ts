import { TRANSACTION_DESCRIPTION_MAX_LENGTH } from "@/app/lib/transactions/transaction-field-contract";

/** CPF/CNPJ parcialmente mascarado pelos bancos (`•••.123.456-••`, `***.123.456-**`). */
const MASKED_DOCUMENT = /\s*-?\s*[•*]{3}\.\d{3}\.\d{3}-[•*]{2}\s*-?/g;
/** Dados bancários repetidos no fim da descrição (`Agência: 1 Conta: 123-4`). */
const BANK_DETAILS = /\s*(?:\(\d{3,4}\)\s*)?Ag[êe]ncia:?\s*\d+\s+Conta:?\s*[\d.-]+/gi;
const VIA_OPEN_BANKING = /\s+via Open Banking\b/gi;

function collapse(value: string) {
  return value.replace(/\s+/g, " ").replace(/(?:\s-){2,}/g, " -").replace(/\s+-\s*$/, "").trim();
}

/**
 * Ajusta uma descrição importada ao limite de 100 caracteres em vez de recusar o lançamento:
 * primeiro tira o que é ruído repetido (CPF mascarado, agência/conta), depois corta em limite de palavra.
 * Descrições que já cabem não são alteradas (o fingerprint de importações antigas continua o mesmo).
 */
export function fitImportDescription(description: string, max = TRANSACTION_DESCRIPTION_MAX_LENGTH) {
  const normalized = collapse(description);
  if (normalized.length <= max) return normalized;

  const compact = collapse(
    normalized.replace(BANK_DETAILS, "").replace(MASKED_DOCUMENT, " - ").replace(VIA_OPEN_BANKING, ""),
  );
  if (compact.length <= max) return compact;

  const cut = compact.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace >= Math.floor(max * 0.6) ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s,;:.-]+$/, "")}…`;
}
