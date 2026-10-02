import { createHash } from "node:crypto";

import { parseMoneyToCents } from "@/app/lib/transactions/import/parser";

export type PayrollDocumentType = "PAYROLL_ADVANCE" | "MONTHLY_PAYSLIP";
export type PayrollPaymentType = "ADVANCE" | "REGULAR";
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

export function detectPayrollDocumentType(text: string): PayrollDocumentType | null {
  const value = fold(text);
  if (/ADIANTAMENTO SALARIAL|IRRF ADIANTAMENTO|\bADIANTAMENTO\b/.test(value)) {
    return "PAYROLL_ADVANCE";
  }
  if (/FOLHA MENSAL|DIAS NORMAIS|I\.N\.S\.S\.|\bINSS\b/.test(value)) {
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
    const looksDeduction = /INSS|I\.N\.S\.S|IRRF|DESCONTO|DESC\.|ADIANT|CONTRIB|FALTA|VALE/.test(
      foldedDescription,
    );

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

export function parsePayrollText(text: string): ParsedPayrollDocument {
  const type = detectPayrollDocumentType(text);
  if (!type) throw new Error("PAYROLL_DOCUMENT_NOT_RECOGNIZED");

  const competence = parseCompetence(text);
  const employerCnpj = capture(text, [/\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/]);
  const employerName =
    capture(text, [
      /(?:Empresa|Empregador|Raz[aã]o Social)\s*[:\-]?\s*([^\n|]{2,160})/i,
      /Fonte Pagadora\s*[:\-]?\s*([^\n|]{2,160})/i,
    ]) ?? "";
  const employeeName = capture(text, [
    /(?:Funcion[aá]rio|Colaborador|Empregado)\s*[:\-]?\s*([^\n|]{2,160})/i,
  ]);

  const salaryBaseCents = moneyAfter(text, [
    /Sal[aá]rio Base[^\d]*([\d.]+,\d{2})/i,
    /Sal[aá]rio Contratual[^\d]*([\d.]+,\d{2})/i,
  ]);
  const totalEarningsCents = moneyAfter(text, [
    /Total (?:de )?Vencimentos[^\d]*([\d.]+,\d{2})/i,
    /Total (?:de )?Proventos[^\d]*([\d.]+,\d{2})/i,
  ]);
  const totalDeductionsCents = moneyAfter(text, [
    /Total (?:de )?Descontos[^\d]*([\d.]+,\d{2})/i,
  ]);
  const netPaidCents = moneyAfter(text, [
    /(?:Valor|Total) L[ií]quido[^\d]*([\d.]+,\d{2})/i,
    /L[ií]quido a Receber[^\d]*([\d.]+,\d{2})/i,
  ]);
  const grossIncomeCents =
    moneyAfter(text, [/Sal[aá]rio Bruto[^\d]*([\d.]+,\d{2})/i]) ?? totalEarningsCents;
  const inssCents = moneyOnLabeledLine(text, [
    /^\s*(?:\d+\s+)?I\.N\.S\.S\.(?:\s|$)/i,
    /^\s*(?:\d+\s+)?INSS\b/i,
  ]);
  const irrfCents = moneyOnLabeledLine(text, [
    /^\s*(?:\d+\s+)?IRRF(?:\s+ADIANTAMENTO)?\b/i,
  ]);
  const irrfBaseCents = moneyAfter(text, [
    /Base (?:de )?IRRF[^\d]*([\d.]+,\d{2})/i,
    /Base IR[^\d]*([\d.]+,\d{2})/i,
  ]);
  const fgtsBaseCents = moneyAfter(text, [
    /Base (?:de )?FGTS[^\d]*([\d.]+,\d{2})/i,
  ]);
  const fgtsAmountCents = moneyOnLabeledLine(text, [
    /^\s*(?:\d+\s+)?FGTS\b/i,
  ]);

  const rubrics = parseRubrics(text);
  const earnings = rubrics.filter((item) => item.earningsCents !== null);
  const deductions = rubrics.filter((item) => item.deductionsCents !== null);
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!competence) errors.push("Competência não reconhecida.");
  if (!employerCnpj) errors.push("CNPJ da fonte pagadora não reconhecido.");
  if (!employerName) warnings.push("Nome da fonte pagadora não reconhecido.");
  if (rubrics.length === 0) warnings.push("Nenhuma rubrica estruturada foi reconhecida.");

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
    paymentType: type === "PAYROLL_ADVANCE" ? "ADVANCE" : "REGULAR",
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

export function payrollImportFingerprint(userId: string, document: ParsedPayrollDocument) {
  return createHash("sha256")
    .update(
      [
        userId,
        document.documentType,
        document.employerCnpj,
        document.year,
        document.month,
        document.paymentType,
        document.grossIncomeCents ?? "",
        document.netPaidCents ?? "",
        document.irrfCents ?? "",
      ].join("|"),
    )
    .digest("hex");
}
