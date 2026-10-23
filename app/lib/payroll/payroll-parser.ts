import { createHash } from "node:crypto";

import { parseMoneyToCents } from "@/app/lib/transactions/import/parser";

export type PayrollDocumentType = "PAYROLL_ADVANCE" | "MONTHLY_PAYSLIP";
export type PayrollPaymentType =
  | "ADVANCE"
  | "REGULAR"
  | "THIRTEENTH"
  | "VACATION"
  | "PLR"
  | "OTHER";
export type PayrollRubric = {
  code: string | null;
  description: string;
  reference: string | null;
  earningsCents: number | null;
  deductionsCents: number | null;
};

export type ParsedPayrollDocument = {
  documentType: PayrollDocumentType;
  paymentType: PayrollPaymentType;
  employerName: string;
  employerCnpj: string;
  employeeName: string | null;
  year: number;
  month: number;
  salaryBaseCents: number | null;
  grossIncomeCents: number | null;
  totalEarningsCents: number | null;
  totalDeductionsCents: number | null;
  netPaidCents: number | null;
  inssCents: number | null;
  irrfCents: number | null;
  irrfBaseCents: number | null;
  fgtsBaseCents: number | null;
  fgtsAmountCents: number | null;
  earnings: PayrollRubric[];
  deductions: PayrollRubric[];
  bankMetadata: Record<string, string> | null;
  warnings: string[];
  errors: string[];
};

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function fold(value: string) {
  return normalize(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

export function detectPayrollPaymentType(
  text: string,
): PayrollPaymentType | null {
  const value = fold(text);

  // O recibo de férias cita o 13º salário (adiantamento da 1ª parcela) sem ser um pagamento de 13º.
  if (
    /RECIBO DE FERIAS|AVISO (?:E )?RECIBO DE FERIAS|FOLHA DE FERIAS|PAGAMENTO DE FERIAS/.test(
      value,
    )
  ) {
    return "VACATION";
  }
  if (
    /\b13\s*[º°O]?\s*(?:SALARIO|SALARIAL)\b|DECIMO TERCEIRO|GRATIFICACAO NATALINA/.test(
      value,
    )
  ) {
    return "THIRTEENTH";
  }
  if (
    /\bPLR\b|PARTICIPACAO (?:NOS|EM) LUCROS|PARTICIPACAO (?:NOS|EM) RESULTADOS|LUCROS E RESULTADOS/.test(
      value,
    )
  ) {
    return "PLR";
  }
  if (/FOLHA MENSAL|SALARIO MENSAL/.test(value)) {
    return "REGULAR";
  }
  if (/ADIANTAMENTO SALARIAL|IRRF ADIANTAMENTO|\bADIANTAMENTO\b/.test(value)) {
    return "ADVANCE";
  }
  if (/DIAS NORMAIS/.test(value)) {
    return "REGULAR";
  }
  return null;
}

export function detectPayrollDocumentType(text: string): PayrollDocumentType | null {
  const paymentType = detectPayrollPaymentType(text);
  if (paymentType === "ADVANCE") return "PAYROLL_ADVANCE";
  if (paymentType) return "MONTHLY_PAYSLIP";

  const value = fold(text);
  if (/I\.N\.S\.S\.|\bINSS\b|TOTAL (?:DE )?VENCIMENTOS|TOTAL (?:DE )?PROVENTOS/.test(value)) {
    return "MONTHLY_PAYSLIP";
  }
  return null;
}

function moneyAfter(text: string, patterns: readonly RegExp[]) {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match?.[1]) continue;
    const cents = parseMoneyToCents(match[1]);
    if (cents !== null) return Math.abs(cents);
  }
  return null;
}

function moneyOnLabeledLine(text: string, labels: readonly RegExp[]) {
  const lines = text.replace(/\r/g, "\n").split(/\n+/);
  for (const line of lines) {
    if (!labels.some((label) => label.test(line))) continue;
    const values = [...line.matchAll(/\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}/g)];
    const raw = values.at(-1)?.[0];
    const cents = raw ? parseMoneyToCents(raw) : null;
    if (cents !== null) return Math.abs(cents);
  }
  return null;
}

function capture(text: string, patterns: readonly RegExp[]) {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    const value = match?.[1] ? normalize(match[1]) : "";
    if (value) return value;
  }
  return null;
}


const monthNames = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Alguns holerites trazem a mesma via duas vezes na página: mantém só a primeira cópia. */
function dropRepeatedCopy(text: string) {
  const lines = text.replace(/\r/g, "\n").split("\n").filter((line) => line.trim());
  const first = lines[0];
  if (!first) return text;
  const window = 5;
  for (let index = window; index < lines.length; index += 1) {
    if (lines[index] !== first) continue;
    const matches = lines.slice(0, window).every((line, offset) => lines[index + offset] === line);
    if (matches) return lines.slice(0, index).join("\n");
  }
  return text;
}

function looseWord(word: string) {
  return word.replace(/\s+/g, "").split("").map((char) => char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s*");
}

/** Linhas de totais impressas em tabela: rótulos em uma linha e os valores, na mesma ordem, na linha de baixo. */
function tableColumns(text: string, columns: ReadonlyArray<{ key: string; label: RegExp }>) {
  const lines = text.replace(/\r/g, "\n").split("\n");
  const result = new Map<string, number>();
  const money = /\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}/g;
  for (let index = 0; index < lines.length - 1; index += 1) {
    const labelLine = lines[index];
    if (/\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}/.test(labelLine)) continue;
    const found = columns
      .map((column) => ({ key: column.key, at: labelLine.search(column.label) }))
      .filter((column) => column.at >= 0)
      .sort((left, right) => left.at - right.at);
    if (found.length === 0) continue;
    const next = [...lines[index + 1].matchAll(money)].map((match) => parseMoneyToCents(match[0]));
    if (next.length < found.length || next.some((value) => value === null)) continue;
    found.forEach((column, position) => {
      if (!result.has(column.key)) result.set(column.key, Math.abs(next[position] as number));
    });
  }
  return result;
}

function parseCompetenceByMonthName(text: string) {
  const match = new RegExp(`\\b(${monthNames.join("|")})\\s+de\\s+(\\d{4})\\b`, "i").exec(fold(text).toLowerCase());
  if (!match) return null;
  const month = monthNames.indexOf(match[1].toLowerCase()) + 1;
  const year = Number(match[2]);
  return month >= 1 && year >= 2000 && year <= 2100 ? { month, year } : null;
}

function parseVacationCompetence(text: string) {
  const range = /(\d{2}\/\d{2}\/\d{4})\s+A\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2})\/(\d{2})\/(\d{4})\s+A\s+\d{2}\/\d{2}\/\d{4}/i.exec(text);
  if (range) return { month: Number(range[4]), year: Number(range[5]) };
  const dates = [...text.matchAll(/Data:\s*(\d{2})\/(\d{2})\/(\d{4})/gi)].at(-1);
  return dates ? { month: Number(dates[2]), year: Number(dates[3]) } : null;
}

function parseHeaderEmployer(text: string) {
  const lines = text.replace(/\r/g, "\n").split("\n").map(normalize).filter(Boolean);
  const cnpjIndex = lines.findIndex((line) => /^CNPJ\s*:/i.test(line));
  const before = cnpjIndex > 0 ? lines[cnpjIndex - 1] : "";
  return before && /[A-Za-zÀ-ú]{3}/.test(before) && !/\d{2}\/\d{2}/.test(before) ? before : null;
}

/** Recibos sem cabeçalho de empresa trazem a razão social na linha de assinatura, ao lado do nome do empregado. */
function parseFirmFromSignature(text: string) {
  for (const line of text.replace(/\r/g, "\n").split("\n")) {
    const match = /\s{3,}([A-ZÀ-Ú][^\n]*?\b(?:LTDA|EIRELI|EPP|S\.?\/?A\.?))\.?\s*$/.exec(line);
    if (match) return normalize(match[1]);
  }
  return null;
}

function parseEmployeeFromTable(text: string) {
  const lines = text.replace(/\r/g, "\n").split("\n");
  const headerIndex = lines.findIndex((line) => /Nome do (?:Funcion[aá]rio|empregado)(?!\s*:)/i.test(line));
  const next = headerIndex >= 0 ? lines[headerIndex + 1] : undefined;
  if (!next) return null;
  const cell = next.split(/\s{2,}/).map(normalize).find((part) => /[A-Za-zÀ-ú]{3}/.test(part));
  return cell ?? null;
}

function parseLabeledPairs(text: string) {
  const rubrics: PayrollRubric[] = [];
  for (const line of text.replace(/\r/g, "\n").split("\n")) {
    for (const match of line.matchAll(/([A-Za-zÀ-ú0-9/º°ª.\- ]+?):\s+(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\s+([PD])\b/g)) {
      const cents = parseMoneyToCents(match[2]);
      if (cents === null) continue;
      const description = normalize(match[1]).replace(/^(?:\d+(?:[.,]\d+)?\s+)+(?=\S)/, "");
      if (/^T\s*O\s*T\s*A\s*L\b/i.test(description) || !description) continue;
      rubrics.push({
        code: null,
        description,
        reference: null,
        earningsCents: match[3] === "P" ? Math.abs(cents) : null,
        deductionsCents: match[3] === "D" ? Math.abs(cents) : null,
      });
    }
  }
  return rubrics;
}

function parseCompetence(text: string) {
  const patterns = [
    /Compet[eê]ncia\s*[:\-]?\s*(\d{1,2})[/-](\d{4})/i,
    /Refer[eê]ncia\s*[:\-]?\s*(\d{1,2})[/-](\d{4})/i,
    /M[eê]s\/Ano\s*[:\-]?\s*(\d{1,2})[/-](\d{4})/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match) continue;
    const month = Number(match[1]);
    const year = Number(match[2]);
    if (month >= 1 && month <= 12 && year >= 2000 && year <= 2100) return { month, year };
  }
  return null;
}

function parseRubrics(text: string) {
  const lines = text
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .map(normalize)
    .filter(Boolean);
  const rubrics: PayrollRubric[] = [];

  for (const line of lines) {
    const match =
      /^(\d{1,5})\s+(.+?)\s+(?:(\d+(?:[,.]\d+)?%?|\d+[,.]\d+)\s+)?(?:(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\s+)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})$/i.exec(line);
    if (!match) continue;

    const firstMoney = match[4] ? parseMoneyToCents(match[4]) : null;
    const secondMoney = match[5] ? parseMoneyToCents(match[5]) : null;
    const description = normalize(match[2]);
    const foldedDescription = fold(description);
    // "Adiantamento salarial" é o vencimento do documento de adiantamento; "Desc. adiant." e "IRRF adiantamento" são descontos.
    const looksDeduction =
      !/^ADIANTAMENTO SALARIAL\b/.test(foldedDescription) &&
      /INSS|I\.N\.S\.S|IRRF|DESCONTO|DESC\.|ADIANT|CONTRIB|FALTA|VALE/.test(foldedDescription);

    rubrics.push({
      code: match[1],
      description,
      reference: match[3] ?? null,
      earningsCents: looksDeduction ? null : Math.abs(firstMoney ?? secondMoney ?? 0) || null,
      deductionsCents: looksDeduction ? Math.abs(secondMoney ?? firstMoney ?? 0) || null : null,
    });
  }

  return rubrics;
}

function parseBankMetadata(text: string) {
  const bank = capture(text, [/Banco\s*[:\-]?\s*([^\n|]{2,80})/i]);
  const agency = capture(text, [/Ag[eê]ncia\s*[:\-]?\s*([\w.-]+)/i]);
  const account = capture(text, [/Conta\s*[:\-]?\s*([\w.-]+)/i]);
  const entries = Object.entries({ bank, agency, account }).filter(([, value]) => value);
  return entries.length ? Object.fromEntries(entries) as Record<string, string> : null;
}

export function parsePayrollText(rawText: string): ParsedPayrollDocument {
  const text = dropRepeatedCopy(rawText);
  const type = detectPayrollDocumentType(text);
  if (!type) throw new Error("PAYROLL_DOCUMENT_NOT_RECOGNIZED");
  const detectedPaymentType = detectPayrollPaymentType(text);
  const paymentType: PayrollPaymentType =
    type === "PAYROLL_ADVANCE"
      ? "ADVANCE"
      : detectedPaymentType ?? "OTHER";

  const competence =
    parseCompetence(text) ??
    (detectedPaymentType === "VACATION" ? parseVacationCompetence(text) : null) ??
    parseCompetenceByMonthName(text);
  const employerCnpj = capture(text, [/\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/]);
  const employerName =
    capture(text, [
      /(?:Empresa|Empregador|Raz[aã]o Social)\s*[:\-]?\s*([^\n|]{2,160})/i,
      /Fonte Pagadora\s*[:\-]?\s*([^\n|]{2,160})/i,
    ]) ??
    parseHeaderEmployer(text) ??
    parseFirmFromSignature(text) ??
    "";
  const employeeName =
    parseEmployeeFromTable(text) ??
    capture(text, [
      /(?:Funcion[aá]rio|Colaborador|Empregado)\s*[:\-]?\s*([^\n|]{2,160})/i,
      /Nome do empregado\s*[:\-]?\s*\n\s*([^\n|]{2,160}?)(?:\s{3,}|\n|$)/i,
    ]);

  // Rótulos em uma linha e valores na linha seguinte (holerites em tabela) têm prioridade sobre "rótulo valor".
  const table = tableColumns(text, [
    { key: "totalEarnings", label: /Total (?:de )?Vencimentos|Total (?:de )?Proventos/i },
    { key: "totalDeductions", label: /Total (?:de )?Descontos/i },
    { key: "salaryBase", label: /Sal[aá]rio Base/i },
    { key: "inssBase", label: /Sal\.? Contr\.? INSS/i },
    { key: "fgtsBase", label: /Base C[aá]lc\.? FGTS/i },
    { key: "fgtsAmount", label: /F\.?G\.?T\.?S\.? do M[eê]s/i },
    { key: "irrfBase", label: /Base C[aá]lc\.? IRRF/i },
  ]);
  const salaryBaseCents =
    table.get("salaryBase") ??
    moneyAfter(text, [
      /Sal[aá]rio Base[^\d]*([\d.]+,\d{2})/i,
      /Sal[aá]rio Contratual[^\d]*([\d.]+,\d{2})/i,
    ]);
  const totalEarningsCents =
    table.get("totalEarnings") ??
    moneyAfter(text, [
      /Total (?:de )?Vencimentos[^\d]*([\d.]+,\d{2})/i,
      /Total (?:de )?Proventos[^\d]*([\d.]+,\d{2})/i,
      new RegExp(`${looseWord("TOTAL DOS PROVENTOS")}[^\\d]*([\\d.]+,\\d{2})`, "i"),
    ]);
  const totalDeductionsCents =
    table.get("totalDeductions") ??
    moneyAfter(text, [
      /Total (?:de )?Descontos[^\d]*([\d.]+,\d{2})/i,
      new RegExp(`${looseWord("TOTAL DOS DESCONTOS")}[^\\d]*([\\d.]+,\\d{2})`, "i"),
    ]);
  const netPaidCents = moneyAfter(text, [
    /(?:Valor|Total) L[ií]quido[^\d]*([\d.]+,\d{2})/i,
    /L[ií]quido a Receber[^\d]*([\d.]+,\d{2})/i,
    new RegExp(`${looseWord("TOTAL LIQUIDO")}[^\\d]*([\\d.]+,\\d{2})`, "i"),
  ]);
  const grossIncomeCents =
    moneyAfter(text, [/Sal[aá]rio Bruto[^\d]*([\d.]+,\d{2})/i]) ?? totalEarningsCents;
  const inssCents =
    moneyOnLabeledLine(text, [
      /^\s*(?:\d+\s+)?I\.N\.S\.S\.(?:\s|$)/i,
      /^\s*(?:\d+\s+)?INSS\b/i,
    ]) ??
    moneyAfter(text, [/Desconto da Previd[eê]ncia[^\d]*([\d.]+,\d{2})/i]);
  const irrfCents =
    moneyOnLabeledLine(text, [/^\s*(?:\d+\s+)?IRRF(?:\s+ADIANTAMENTO)?\b/i]) ??
    moneyAfter(text, [/Desconto do imposto de Renda[^\d]*([\d.]+,\d{2})/i]);
  const irrfBaseCents =
    table.get("irrfBase") ??
    moneyAfter(text, [
      /Base (?:de )?IRRF[^\d]*([\d.]+,\d{2})/i,
      /Base IR[^\d]*([\d.]+,\d{2})/i,
    ]);
  const fgtsBaseCents =
    table.get("fgtsBase") ??
    moneyAfter(text, [/Base (?:de )?FGTS[^\d]*([\d.]+,\d{2})/i]);
  const fgtsAmountCents =
    table.get("fgtsAmount") ?? moneyOnLabeledLine(text, [/^\s*(?:\d+\s+)?FGTS\b/i]);

  const tableRubrics = parseRubrics(text);
  const rubrics = tableRubrics.length > 0 ? tableRubrics : parseLabeledPairs(text);
  const earnings = rubrics.filter((item) => item.earningsCents !== null);
  const deductions = rubrics.filter((item) => item.deductionsCents !== null);
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!competence) errors.push("Competência não reconhecida.");
  if (!employerCnpj) errors.push("CNPJ da fonte pagadora não reconhecido.");
  if (!employerName) warnings.push("Nome da fonte pagadora não reconhecido.");
  if (rubrics.length === 0) warnings.push("Nenhuma rubrica estruturada foi reconhecida.");
  if (paymentType === "OTHER") {
    warnings.push(
      "Tipo de pagamento não reconhecido com evidência suficiente. Revise a classificação antes de confirmar.",
    );
  }

  if (
    totalEarningsCents !== null &&
    totalDeductionsCents !== null &&
    netPaidCents !== null &&
    totalEarningsCents - totalDeductionsCents !== netPaidCents
  ) {
    errors.push("Totais inconsistentes: vencimentos - descontos difere do valor líquido.");
  }

  return {
    documentType: type,
    paymentType,
    employerName: employerName || "Fonte pagadora não identificada",
    employerCnpj: employerCnpj ?? "",
    employeeName,
    year: competence?.year ?? 0,
    month: competence?.month ?? 0,
    salaryBaseCents,
    grossIncomeCents,
    totalEarningsCents,
    totalDeductionsCents,
    netPaidCents,
    inssCents,
    irrfCents,
    irrfBaseCents,
    fgtsBaseCents,
    fgtsAmountCents,
    earnings,
    deductions,
    bankMetadata: parseBankMetadata(text),
    warnings,
    errors,
  };
}

function canonicalNullableText(value: string | null) {
  return value === null ? null : normalize(value);
}

function canonicalRubrics(items: readonly PayrollRubric[]) {
  return items
    .map((item) => ({
      code: canonicalNullableText(item.code),
      description: normalize(item.description),
      reference: canonicalNullableText(item.reference),
      earningsCents: item.earningsCents,
      deductionsCents: item.deductionsCents,
    }))
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right)),
    );
}

function canonicalBankMetadata(value: Record<string, string> | null) {
  if (!value) return null;
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [normalize(key), normalize(item)] as const)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function payrollDocumentIdentity(document: ParsedPayrollDocument) {
  return {
    documentType: document.documentType,
    paymentType: document.paymentType,
    employerCnpj: normalize(document.employerCnpj),
    year: document.year,
    month: document.month,
  };
}

export function payrollImportFingerprint(userId: string, document: ParsedPayrollDocument) {
  const canonicalContent = {
    identity: payrollDocumentIdentity(document),
    employerName: normalize(document.employerName),
    employeeName: canonicalNullableText(document.employeeName),
    salaryBaseCents: document.salaryBaseCents,
    grossIncomeCents: document.grossIncomeCents,
    totalEarningsCents: document.totalEarningsCents,
    totalDeductionsCents: document.totalDeductionsCents,
    netPaidCents: document.netPaidCents,
    inssCents: document.inssCents,
    irrfCents: document.irrfCents,
    irrfBaseCents: document.irrfBaseCents,
    fgtsBaseCents: document.fgtsBaseCents,
    fgtsAmountCents: document.fgtsAmountCents,
    earnings: canonicalRubrics(document.earnings),
    deductions: canonicalRubrics(document.deductions),
    bankMetadata: canonicalBankMetadata(document.bankMetadata),
  };

  return createHash("sha256")
    .update(JSON.stringify({ userId, content: canonicalContent }))
    .digest("hex");
}
