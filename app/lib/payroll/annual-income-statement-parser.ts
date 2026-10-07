import { createHash } from "node:crypto";

import { parseMoneyToCents } from "@/app/lib/transactions/import/parser";

export type AnnualStatementItem = {
  description: string;
  amountCents: number | null;
};

export type ParsedAnnualEmploymentIncomeStatement = {
  calendarYear: number;
  taxExercise: number;
  payerName: string;
  payerTaxId: string;
  beneficiaryName: string | null;
  beneficiaryTaxId: string | null;
  incomeNature: string | null;
  taxableIncomeCents: number | null;
  officialPensionCents: number | null;
  complementaryPensionCents: number | null;
  alimonyCents: number | null;
  irrfCents: number | null;
  thirteenthSalaryCents: number | null;
  thirteenthIrrfCents: number | null;
  exemptIncome: AnnualStatementItem[];
  exclusiveTaxation: AnnualStatementItem[];
  accumulatedIncome: AnnualStatementItem[];
  notes: string[];
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

export function isAnnualEmploymentIncomeStatement(text: string) {
  const value = fold(text);
  return (
    /COMPROVANTE DE RENDIMENTOS PAGOS/.test(value) &&
    /ANO-CALENDARIO/.test(value) &&
    /IMPOSTO SOBRE A RENDA RETIDO NA FONTE|IRRF/.test(value)
  );
}

function capture(text: string, patterns: readonly RegExp[]) {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) return normalize(match[1]);
  }
  return null;
}

function moneyOnLine(text: string, labels: readonly RegExp[]) {
  const lines = text.replace(/\r/g, "\n").split(/\n+/);
  for (const line of lines) {
    if (!labels.some((label) => label.test(line))) continue;
    const matches = [...line.matchAll(/\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}/g)];
    const raw = matches.at(-1)?.[0];
    const cents = raw ? parseMoneyToCents(raw) : null;
    if (cents !== null) return Math.abs(cents);
  }
  return null;
}

function parseYear(text: string, labels: readonly RegExp[]) {
  for (const label of labels) {
    const match = label.exec(text);
    const year = match?.[1] ? Number(match[1]) : 0;
    if (year >= 2000 && year <= 2100) return year;
  }
  return 0;
}

function section(text: string, start: RegExp, endMarkers: readonly RegExp[]) {
  const lines = text.replace(/\r/g, "\n").split(/\n+/);
  const startIndex = lines.findIndex((line) => start.test(fold(line)));
  if (startIndex < 0) return [];
  const result: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = normalize(lines[index] ?? "");
    if (!line) continue;
    if (endMarkers.some((marker) => marker.test(fold(line)))) break;
    result.push(line);
  }
  return result;
}

function parseSectionItems(lines: readonly string[]) {
  return lines.flatMap((line) => {
    const matches = [...line.matchAll(/\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}/g)];
    if (matches.length === 0) return [];
    const raw = matches.at(-1)?.[0];
    const amountCents = raw ? parseMoneyToCents(raw) : null;
    const description = normalize(raw ? line.replace(raw, "") : line)
      .replace(/^\d+[.)-]?\s*/, "")
      .replace(/[-–:]\s*$/, "")
      .trim();
    if (!description) return [];
    return [{ description, amountCents: amountCents === null ? null : Math.abs(amountCents) }];
  });
}

export function parseAnnualEmploymentIncomeStatement(
  text: string,
): ParsedAnnualEmploymentIncomeStatement {
  if (!isAnnualEmploymentIncomeStatement(text)) {
    throw new Error("ANNUAL_INCOME_STATEMENT_NOT_RECOGNIZED");
  }

  const calendarYear = parseYear(text, [
    /ANO[- ]CALEND[ÁA]RIO\s*[:\-]?\s*(\d{4})/i,
  ]);
  const taxExercise =
    parseYear(text, [/EXERC[IÍ]CIO\s*[:\-]?\s*(\d{4})/i]) ||
    (calendarYear ? calendarYear + 1 : 0);

  const payerTaxId = capture(text, [
    /(?:CNPJ|CPF)\s+(?:DA\s+)?FONTE PAGADORA\s*[:\-]?\s*([\d./-]+)/i,
    /FONTE PAGADORA[^\n]*?(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i,
  ]) ?? "";
  const payerName =
    capture(text, [
      /NOME EMPRESARIAL\s*[:\-]?\s*([^\n|]{2,180})/i,
      /NOME DA FONTE PAGADORA\s*[:\-]?\s*([^\n|]{2,180})/i,
    ]) ?? "";
  const beneficiaryName = capture(text, [
    /NOME COMPLETO\s*[:\-]?\s*([^\n|]{2,180})/i,
    /NOME DO BENEFICI[ÁA]RIO\s*[:\-]?\s*([^\n|]{2,180})/i,
  ]);
  const beneficiaryTaxId = capture(text, [
    /CPF DO BENEFICI[ÁA]RIO\s*[:\-]?\s*([\d.-]+)/i,
  ]);
  const incomeNature = capture(text, [
    /NATUREZA DO RENDIMENTO\s*[:\-]?\s*([^\n|]{2,240})/i,
  ]);

  const taxableIncomeCents = moneyOnLine(text, [
    /RENDIMENTOS TRIBUT[ÁA]VEIS/i,
    /TOTAL DOS RENDIMENTOS/i,
  ]);
  const officialPensionCents = moneyOnLine(text, [
    /CONTRIBUI[CÇ][AÃ]O PREVIDENCI[ÁA]RIA OFICIAL/i,
    /PREVID[ÊE]NCIA OFICIAL/i,
  ]);
  const complementaryPensionCents = moneyOnLine(text, [
    /PREVID[ÊE]NCIA COMPLEMENTAR/i,
  ]);
  const alimonyCents = moneyOnLine(text, [
    /PENS[AÃ]O ALIMENT[IÍ]CIA/i,
  ]);
  const irrfCents = moneyOnLine(text, [
    /IMPOSTO SOBRE A RENDA RETIDO NA FONTE/i,
    /\bIRRF\b/i,
  ]);
  const thirteenthSalaryCents = moneyOnLine(text, [
    /13[ºO°]\s*SAL[ÁA]RIO/i,
    /D[ÉE]CIMO TERCEIRO/i,
  ]);
  const thirteenthIrrfCents = moneyOnLine(text, [
    /IRRF.*13[ºO°]/i,
    /IMPOSTO.*13[ºO°]/i,
  ]);

  const exemptIncome = parseSectionItems(
    section(text, /RENDIMENTOS ISENTOS E NAO TRIBUTAVEIS/, [
      /RENDIMENTOS SUJEITOS A TRIBUTACAO EXCLUSIVA/,
      /RENDIMENTOS RECEBIDOS ACUMULADAMENTE/,
      /INFORMACOES COMPLEMENTARES/,
    ]),
  );
  const exclusiveTaxation = parseSectionItems(
    section(text, /RENDIMENTOS SUJEITOS A TRIBUTACAO EXCLUSIVA/, [
      /RENDIMENTOS RECEBIDOS ACUMULADAMENTE/,
      /INFORMACOES COMPLEMENTARES/,
    ]),
  );
  const accumulatedIncome = parseSectionItems(
    section(text, /RENDIMENTOS RECEBIDOS ACUMULADAMENTE/, [
      /INFORMACOES COMPLEMENTARES/,
    ]),
  );
  const notes = section(text, /INFORMACOES COMPLEMENTARES/, []).filter(
    (line) => !/^\d+[.,]?\d*$/.test(line),
  );

  const warnings: string[] = [];
  const errors: string[] = [];

  if (!calendarYear) errors.push("Ano-calendário não reconhecido.");
  if (!taxExercise) errors.push("Exercício não reconhecido.");
  if (!payerTaxId) errors.push("CPF/CNPJ da fonte pagadora não reconhecido.");
  if (!payerName) warnings.push("Nome da fonte pagadora não reconhecido.");
  if (taxableIncomeCents === null) {
    warnings.push("Rendimentos tributáveis não foram localizados no documento.");
  }

  return {
    calendarYear,
    taxExercise,
    payerName: payerName || "Fonte pagadora não identificada",
    payerTaxId,
    beneficiaryName,
    beneficiaryTaxId,
    incomeNature,
    taxableIncomeCents,
    officialPensionCents,
    complementaryPensionCents,
    alimonyCents,
    irrfCents,
    thirteenthSalaryCents,
    thirteenthIrrfCents,
    exemptIncome,
    exclusiveTaxation,
    accumulatedIncome,
    notes,
    warnings,
    errors,
  };
}

function canonicalNullableText(value: string | null) {
  return value === null ? null : normalize(value);
}

function canonicalAnnualItems(items: readonly AnnualStatementItem[]) {
  return items
    .map((item) => ({
      description: normalize(item.description),
      amountCents: item.amountCents,
    }))
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right)),
    );
}

function canonicalNotes(notes: readonly string[]) {
  return notes.map(normalize).sort((left, right) => left.localeCompare(right));
}

export function annualEmploymentIncomeIdentity(
  statement: ParsedAnnualEmploymentIncomeStatement,
) {
  return {
    documentType: "ANNUAL_INCOME_STATEMENT" as const,
    payerTaxId: normalize(statement.payerTaxId),
    beneficiary:
      canonicalNullableText(statement.beneficiaryTaxId) ??
      canonicalNullableText(statement.beneficiaryName),
    calendarYear: statement.calendarYear,
    taxExercise: statement.taxExercise,
  };
}

export function annualEmploymentIncomeFingerprint(
  userId: string,
  statement: ParsedAnnualEmploymentIncomeStatement,
) {
  const canonicalContent = {
    identity: annualEmploymentIncomeIdentity(statement),
    payerName: normalize(statement.payerName),
    beneficiaryName: canonicalNullableText(statement.beneficiaryName),
    beneficiaryTaxId: canonicalNullableText(statement.beneficiaryTaxId),
    incomeNature: canonicalNullableText(statement.incomeNature),
    taxableIncomeCents: statement.taxableIncomeCents,
    officialPensionCents: statement.officialPensionCents,
    complementaryPensionCents: statement.complementaryPensionCents,
    alimonyCents: statement.alimonyCents,
    irrfCents: statement.irrfCents,
    thirteenthSalaryCents: statement.thirteenthSalaryCents,
    thirteenthIrrfCents: statement.thirteenthIrrfCents,
    exemptIncome: canonicalAnnualItems(statement.exemptIncome),
    exclusiveTaxation: canonicalAnnualItems(statement.exclusiveTaxation),
    accumulatedIncome: canonicalAnnualItems(statement.accumulatedIncome),
    notes: canonicalNotes(statement.notes),
  };

  return createHash("sha256")
    .update(JSON.stringify({ userId, content: canonicalContent }))
    .digest("hex");
}
