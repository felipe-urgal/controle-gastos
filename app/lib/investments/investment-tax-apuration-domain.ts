import { deriveTaxLossCarryforward } from "@/app/lib/investments/investment-tax-loss-domain";
import {
  calculateTaxFromBps,
  getInvestmentTaxClassRule,
  getInvestmentTaxRuleSet,
  type InvestmentTaxGroup,
} from "@/app/lib/investments/investment-tax-rules";

type MonthlyResult = {
  year: number;
  month: number;
  assetType: string;
  currency: string;
  taxLocation?: "BRAZIL" | "ABROAD";
  grossProceedsCents: number;
  realizedResultCents: number;
  status: "OK" | "PENDING";
};

type LossAdjustment = {
  id: string;
  year: number;
  month: number;
  assetType: string;
  currency: string;
  amountCents: number;
  reason: string;
  createdAt: Date;
};

type Withholding = {
  id: string;
  year: number;
  month: number;
  assetType: string;
  currency: string;
  amountCents: number;
};

type Payment = {
  id: string;
  competenceYear: number;
  competenceMonth: number;
  assetType: string;
  currency: string;
  amountCents: number;
};

function isSupportedBrazilianTaxCurrency(currency: string) {
  return currency === "BRL";
}

function isSupportedBrazilianTaxLocation(location: string) {
  return location === "BRAZIL";
}

function key(group: string, currency: string) {
  return `${group}|${currency}`;
}

function monthKey(
  year: number,
  month: number,
  group: string,
  currency: string,
) {
  return `${year}|${String(month).padStart(2, "0")}|${group}|${currency}`;
}

function latestAdjustmentByClass(
  adjustments: readonly LossAdjustment[],
  calendarYear: number,
) {
  const latest = new Map<string, LossAdjustment>();
  for (const adjustment of adjustments) {
    const rule = getInvestmentTaxClassRule(calendarYear, adjustment.assetType);
    if (!rule) continue;
    const adjustmentKey = [
      adjustment.year,
      adjustment.month,
      adjustment.assetType,
      adjustment.currency,
    ].join("|");
    const current = latest.get(adjustmentKey);
    if (
      !current ||
      current.createdAt.getTime() < adjustment.createdAt.getTime() ||
      (current.createdAt.getTime() === adjustment.createdAt.getTime() &&
        current.id.localeCompare(adjustment.id) < 0)
    ) {
      latest.set(adjustmentKey, adjustment);
    }
  }
  return [...latest.values()];
}

export function deriveVersionedInvestmentTax(args: {
  calendarYear: number;
  monthlyResults: readonly MonthlyResult[];
  lossAdjustments: readonly LossAdjustment[];
  withholdings: readonly Withholding[];
  payments: readonly Payment[];
}) {
  const rules = getInvestmentTaxRuleSet(args.calendarYear);
  if (!rules) {
    return {
      supported: false as const,
      taxExercise: args.calendarYear + 1,
      sources: [],
      rows: [],
      unsupportedClasses: [
        ...new Set(args.monthlyResults.map((item) => item.assetType)),
      ].sort(),
      unsupportedCurrencies: [
        ...new Set([
          ...args.monthlyResults.map((item) => item.currency),
          ...args.lossAdjustments.map((item) => item.currency),
          ...args.withholdings.map((item) => item.currency),
          ...args.payments.map((item) => item.currency),
        ].filter((currency) => !isSupportedBrazilianTaxCurrency(currency))),
      ].sort(),
      unsupportedTaxLocations: [
        ...new Set(
          args.monthlyResults
            .map((item) => item.taxLocation ?? "BRAZIL")
            .filter((location) => !isSupportedBrazilianTaxLocation(location)),
        ),
      ].sort(),
    };
  }

  const unsupportedClasses = new Set<string>();
  const unsupportedCurrencies = new Set<string>();
  const unsupportedTaxLocations = new Set<string>();
  const groupedResults = new Map<
    string,
    {
      year: number;
      month: number;
      assetType: InvestmentTaxGroup;
      currency: string;
      realizedResultCents: number;
      status: "OK" | "PENDING";
      exemptResultCents: number;
      grossSalesCents: number;
    }
  >();

  for (const result of args.monthlyResults) {
    const taxLocation = result.taxLocation ?? "BRAZIL";
    if (!isSupportedBrazilianTaxLocation(taxLocation)) {
      unsupportedTaxLocations.add(taxLocation);
      continue;
    }

    if (!isSupportedBrazilianTaxCurrency(result.currency)) {
      unsupportedCurrencies.add(result.currency);
      continue;
    }

    const classRule = getInvestmentTaxClassRule(
      args.calendarYear,
      result.assetType,
    );
    if (!classRule) {
      unsupportedClasses.add(result.assetType);
      continue;
    }

    const itemKey = monthKey(
      result.year,
      result.month,
      classRule.taxGroup,
      result.currency,
    );
    const current = groupedResults.get(itemKey) ?? {
      year: result.year,
      month: result.month,
      assetType: classRule.taxGroup,
      currency: result.currency,
      realizedResultCents: 0,
      status: "OK" as const,
      exemptResultCents: 0,
      grossSalesCents: 0,
    };

    current.grossSalesCents += result.grossProceedsCents;
    if (result.status === "PENDING") {
      current.status = "PENDING";
    } else {
      const exempt =
        result.realizedResultCents > 0 &&
        classRule.monthlySalesExemptionCents !== null &&
        result.grossProceedsCents <= classRule.monthlySalesExemptionCents;
      if (exempt) {
        current.exemptResultCents += result.realizedResultCents;
      } else {
        current.realizedResultCents += result.realizedResultCents;
      }
    }

    groupedResults.set(itemKey, current);
  }

  const latestAdjustments = latestAdjustmentByClass(
    args.lossAdjustments,
    args.calendarYear,
  );
  const adjustmentGroups = new Map<
    string,
    {
      id: string;
      year: number;
      month: number;
      assetType: InvestmentTaxGroup;
      currency: string;
      amountCents: number;
      reason: string;
      createdAt: Date;
    }
  >();

  for (const adjustment of latestAdjustments) {
    if (!isSupportedBrazilianTaxCurrency(adjustment.currency)) {
      unsupportedCurrencies.add(adjustment.currency);
      continue;
    }

    const classRule = getInvestmentTaxClassRule(
      args.calendarYear,
      adjustment.assetType,
    );
    if (!classRule) {
      unsupportedClasses.add(adjustment.assetType);
      continue;
    }
    const adjustmentKey = [
      adjustment.year,
      adjustment.month,
      classRule.taxGroup,
      adjustment.currency,
    ].join("|");
    const current = adjustmentGroups.get(adjustmentKey);
    if (current) {
      current.amountCents += adjustment.amountCents;
      current.reason += `; ${adjustment.assetType}: ${adjustment.reason}`;
      if (adjustment.createdAt > current.createdAt) {
        current.createdAt = adjustment.createdAt;
      }
    } else {
      adjustmentGroups.set(adjustmentKey, {
        id: adjustment.id,
        year: adjustment.year,
        month: adjustment.month,
        assetType: classRule.taxGroup,
        currency: adjustment.currency,
        amountCents: adjustment.amountCents,
        reason: `${adjustment.assetType}: ${adjustment.reason}`,
        createdAt: adjustment.createdAt,
      });
    }
  }

  const ledger = deriveTaxLossCarryforward({
    results: [...groupedResults.values()].map((item) => ({
      year: item.year,
      month: item.month,
      assetType: item.assetType,
      currency: item.currency,
      realizedResultCents: item.realizedResultCents,
      status: item.status,
    })),
    adjustments: [...adjustmentGroups.values()],
  }).filter((row) => row.year === args.calendarYear);

  const withholdingByMonth = new Map<string, number>();
  for (const withholding of args.withholdings) {
    if (!isSupportedBrazilianTaxCurrency(withholding.currency)) {
      unsupportedCurrencies.add(withholding.currency);
      continue;
    }

    const classRule = getInvestmentTaxClassRule(
      args.calendarYear,
      withholding.assetType,
    );
    if (!classRule) {
      unsupportedClasses.add(withholding.assetType);
      continue;
    }
    const itemKey = monthKey(
      withholding.year,
      withholding.month,
      classRule.taxGroup,
      withholding.currency,
    );
    withholdingByMonth.set(
      itemKey,
      (withholdingByMonth.get(itemKey) ?? 0) + withholding.amountCents,
    );
  }

  const paymentByMonth = new Map<string, number>();
  for (const payment of args.payments) {
    if (!isSupportedBrazilianTaxCurrency(payment.currency)) {
      unsupportedCurrencies.add(payment.currency);
      continue;
    }

    const classRule = getInvestmentTaxClassRule(
      args.calendarYear,
      payment.assetType,
    );
    if (!classRule) {
      unsupportedClasses.add(payment.assetType);
      continue;
    }
    const itemKey = monthKey(
      payment.competenceYear,
      payment.competenceMonth,
      classRule.taxGroup,
      payment.currency,
    );
    paymentByMonth.set(
      itemKey,
      (paymentByMonth.get(itemKey) ?? 0) + payment.amountCents,
    );
  }

  const groupRate = new Map<InvestmentTaxGroup, number>();
  for (const classRule of Object.values(rules.classes)) {
    if (!classRule) continue;
    const existing = groupRate.get(classRule.taxGroup);
    if (
      existing !== undefined &&
      existing !== classRule.commonOperationRateBps
    ) {
      throw new Error(
        `Grupo fiscal ${classRule.taxGroup} possui alíquotas incompatíveis no catálogo.`,
      );
    }
    groupRate.set(classRule.taxGroup, classRule.commonOperationRateBps);
  }

  const allKeys = new Set<string>();
  for (const row of ledger) {
    allKeys.add(monthKey(row.year, row.month, row.assetType, row.currency));
  }
  for (const itemKey of withholdingByMonth.keys()) allKeys.add(itemKey);
  for (const itemKey of paymentByMonth.keys()) allKeys.add(itemKey);
  for (const itemKey of groupedResults.keys()) allKeys.add(itemKey);

  const orderedKeys = [...allKeys].sort();
  const carryByGroup = new Map<
    string,
    { withholdingCreditCents: number; unpaidTaxCents: number }
  >();
  const ledgerByKey = new Map(
    ledger.map((row) => [
      monthKey(row.year, row.month, row.assetType, row.currency),
      row,
    ]),
  );

  const rows = orderedKeys.map((itemKey) => {
    const [yearRaw, monthRaw, taxGroupRaw, currency] = itemKey.split("|");
    const rowYear = Number(yearRaw);
    const month = Number(monthRaw);
    const taxGroup = taxGroupRaw as InvestmentTaxGroup;
    const carryKey = key(taxGroup, currency);
    const opening = carryByGroup.get(carryKey) ?? {
      withholdingCreditCents: 0,
      unpaidTaxCents: 0,
    };
    const ledgerRow = ledgerByKey.get(itemKey);
    const grouped = groupedResults.get(itemKey);
    const withholdingCents = withholdingByMonth.get(itemKey) ?? 0;
    const paidDarfCents = paymentByMonth.get(itemKey) ?? 0;
    const rateBps = groupRate.get(taxGroup);

    if (!rateBps || ledgerRow?.status === "PENDING") {
      return {
        year: rowYear,
        month,
        taxGroup,
        currency,
        rateBps: rateBps ?? null,
        grossSalesCents: grouped?.grossSalesCents ?? 0,
        exemptResultCents: grouped?.exemptResultCents ?? 0,
        taxableResultAfterCompensationCents:
          ledgerRow?.taxableResultAfterCompensationCents ?? 0,
        withholdingCents,
        withholdingAppliedCents: 0,
        withholdingCarryforwardCents: opening.withholdingCreditCents,
        grossTaxCents: null,
        taxDueCents: null,
        paidDarfCents,
        openTaxBalanceCents: null,
        minimumDarfCents: rules.minimumDarfCents,
        status: ledgerRow?.status === "PENDING"
          ? ("PENDING_APURACAO" as const)
          : ("WAITING_RULES" as const),
      };
    }

    const grossTaxCents = calculateTaxFromBps(
      ledgerRow?.taxableResultAfterCompensationCents ?? 0,
      rateBps,
    );
    const availableWithholding = opening.withholdingCreditCents + withholdingCents;
    const withholdingAppliedCents = Math.min(
      grossTaxCents,
      availableWithholding,
    );
    const withholdingCarryforwardCents =
      availableWithholding - withholdingAppliedCents;
    const taxDueCents = grossTaxCents - withholdingAppliedCents;
    const accumulatedTaxCents = opening.unpaidTaxCents + taxDueCents;
    const openTaxBalanceCents = Math.max(
      accumulatedTaxCents - paidDarfCents,
      0,
    );

    carryByGroup.set(carryKey, {
      withholdingCreditCents: withholdingCarryforwardCents,
      unpaidTaxCents: openTaxBalanceCents,
    });

    const exemptOnly =
      (grouped?.exemptResultCents ?? 0) > 0 &&
      (ledgerRow?.taxableResultAfterCompensationCents ?? 0) === 0 &&
      taxDueCents === 0;
    const status =
      exemptOnly
        ? ("EXEMPT" as const)
        : openTaxBalanceCents > 0 &&
            openTaxBalanceCents < rules.minimumDarfCents
          ? ("BELOW_MINIMUM" as const)
          : openTaxBalanceCents > 0
            ? ("OPEN" as const)
            : ("OK" as const);

    return {
      year: rowYear,
      month,
      taxGroup,
      currency,
      rateBps,
      grossSalesCents: grouped?.grossSalesCents ?? 0,
      exemptResultCents: grouped?.exemptResultCents ?? 0,
      taxableResultAfterCompensationCents:
        ledgerRow?.taxableResultAfterCompensationCents ?? 0,
      withholdingCents,
      withholdingAppliedCents,
      withholdingCarryforwardCents,
      grossTaxCents,
      taxDueCents,
      paidDarfCents,
      openTaxBalanceCents,
      minimumDarfCents: rules.minimumDarfCents,
      status,
    };
  });

  return {
    supported: true as const,
    taxExercise: rules.taxExercise,
    darfCode: rules.darfCode,
    minimumDarfCents: rules.minimumDarfCents,
    sources: rules.sources,
    rows,
    unsupportedClasses: [...unsupportedClasses].sort(),
    unsupportedCurrencies: [...unsupportedCurrencies].sort(),
    unsupportedTaxLocations: [...unsupportedTaxLocations].sort(),
  };
}
