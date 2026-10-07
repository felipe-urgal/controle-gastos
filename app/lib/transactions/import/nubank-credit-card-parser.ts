import {
  IMPORT_MAX_ITEMS,
  ImportParseError,
  parseImportDate,
  parseMoneyToCents,
  type ParsedImportItem,
} from "@/app/lib/transactions/import/parser";
import {
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
  TRANSACTION_DESCRIPTION_MIN_LENGTH,
} from "@/app/lib/transactions/transaction-field-contract";

export type NubankCreditCardClassification = "PURCHASE" | "PAYMENT" | "CREDIT";

export type NubankCreditCardParseResult = {
  items: ParsedImportItem[];
  classifications: NubankCreditCardClassification[];
  summary: {
    purchases: number;
    payments: number;
    credits: number;
  };
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseCsvRows(content: string) {
  const clean = content.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    if (char === '"') {
      if (quoted && clean[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && clean[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (quoted) throw new ImportParseError("CSV Nubank inválido: aspas não foram fechadas.");
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

export function isNubankCreditCardCsv(content: string) {
  const clean = content.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const headers = firstLine.split(",").map(normalizeHeader);
  return headers.length === 3 &&
    headers[0] === "date" &&
    headers[1] === "title" &&
    headers[2] === "amount";
}

function classify(title: string, signedAmount: number): NubankCreditCardClassification {
  if (/^pagamento recebido\b/i.test(title)) return "PAYMENT";
  if (signedAmount < 0) return "CREDIT";
  return "PURCHASE";
}

export function parseNubankCreditCardCsv(content: string): NubankCreditCardParseResult {
  const rows = parseCsvRows(content);
  if (rows.length < 2) throw new ImportParseError("Fatura Nubank sem lançamentos.");
  if (!isNubankCreditCardCsv(content)) {
    throw new ImportParseError("Formato de fatura Nubank não reconhecido.");
  }
  if (rows.length - 1 > IMPORT_MAX_ITEMS) {
    throw new ImportParseError(`Arquivo excede o limite de ${IMPORT_MAX_ITEMS} transações.`);
  }

  const classifications: NubankCreditCardClassification[] = [];
  const items = rows.slice(1).map((row, index) => {
    const errors: string[] = [];
    const date = parseImportDate(row[0] ?? "");
    const description = normalizeText(row[1] ?? "");
    const signedAmount = parseMoneyToCents(row[2] ?? "");
    const classification = classify(description, signedAmount ?? 0);
    classifications.push(classification);

    if (!date) errors.push("Data inválida.");
    if (signedAmount === null || signedAmount === 0) {
      errors.push("Valor inválido ou igual a zero.");
    }
    if (description.length < TRANSACTION_DESCRIPTION_MIN_LENGTH) errors.push(`Descrição deve ter pelo menos ${TRANSACTION_DESCRIPTION_MIN_LENGTH} caracteres.`);
    if (description.length > TRANSACTION_DESCRIPTION_MAX_LENGTH) errors.push(`Descrição deve ter no máximo ${TRANSACTION_DESCRIPTION_MAX_LENGTH} caracteres.`);
    if (classification === "PAYMENT") {
      errors.push("Pagamento recebido deve ser conciliado pelo fluxo de pagamento da fatura; não será importado como receita.");
    }

    const amount = Math.abs(signedAmount ?? 0);
    return {
      index,
      source: "CSV" as const,
      date: date ?? "",
      amountCents: amount,
      type: classification === "PURCHASE" ? ("EXPENSE" as const) : ("INCOME" as const),
      description: description.slice(0, TRANSACTION_DESCRIPTION_MAX_LENGTH),
      errors,
    };
  });

  return {
    items,
    classifications,
    summary: {
      purchases: classifications.filter((value) => value === "PURCHASE").length,
      payments: classifications.filter((value) => value === "PAYMENT").length,
      credits: classifications.filter((value) => value === "CREDIT").length,
    },
  };
}
