export const PAYROLL_CENTS_MAX = 2_147_483_647;

export class PayrollMoneyLimitError extends Error {
  constructor(readonly field: string) {
    super('PAYROLL_MONEY_LIMIT_EXCEEDED');
  }
}

type JsonLike = null | boolean | number | string | JsonLike[] | { [key: string]: JsonLike };

function assertCents(value: unknown, field: string) {
  if (value === null || value === undefined) return;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > PAYROLL_CENTS_MAX
  ) {
    throw new PayrollMoneyLimitError(field);
  }
}

export function assertPayrollDocumentMoneyBounds(document: {
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
  earnings: Array<{ earningsCents: number | null; deductionsCents: number | null }>;
  deductions: Array<{ earningsCents: number | null; deductionsCents: number | null }>;
}) {
  const scalarFields = [
    'salaryBaseCents',
    'grossIncomeCents',
    'totalEarningsCents',
    'totalDeductionsCents',
    'netPaidCents',
    'inssCents',
    'irrfCents',
    'irrfBaseCents',
    'fgtsBaseCents',
    'fgtsAmountCents',
  ] as const;

  for (const field of scalarFields) {
    assertCents(document[field], field);
  }
  for (const [index, rubric] of [...document.earnings, ...document.deductions].entries()) {
    assertCents(rubric.earningsCents, 'rubrics[' + index + '].earningsCents');
    assertCents(rubric.deductionsCents, 'rubrics[' + index + '].deductionsCents');
  }
}

export function assertAnnualStatementMoneyBounds(statement: {
  taxableIncomeCents: number | null;
  officialPensionCents: number | null;
  complementaryPensionCents: number | null;
  alimonyCents: number | null;
  irrfCents: number | null;
  thirteenthSalaryCents: number | null;
  thirteenthIrrfCents: number | null;
  exemptIncome: Array<{ amountCents: number | null }>;
  exclusiveTaxation: Array<{ amountCents: number | null }>;
  accumulatedIncome: Array<{ amountCents: number | null }>;
}) {
  const scalarFields = [
    'taxableIncomeCents',
    'officialPensionCents',
    'complementaryPensionCents',
    'alimonyCents',
    'irrfCents',
    'thirteenthSalaryCents',
    'thirteenthIrrfCents',
  ] as const;
  for (const field of scalarFields) {
    assertCents(statement[field], field);
  }
  for (const [index, item] of [
    ...statement.exemptIncome,
    ...statement.exclusiveTaxation,
    ...statement.accumulatedIncome,
  ].entries()) {
    assertCents(item.amountCents, 'annualItems[' + index + '].amountCents');
  }
}

export function isPayrollMoneyLimitError(error: unknown): error is PayrollMoneyLimitError {
  return error instanceof PayrollMoneyLimitError;
}

export type PayrollJsonLike = JsonLike;
