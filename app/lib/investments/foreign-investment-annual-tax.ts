import { z } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import {
  convertCurrencyAmount,
  latestRateOnOrBefore,
} from "@/app/lib/currency/exchange-rate-domain";
import { fetchPtaxExchangeRate } from "@/app/lib/currency/ptax-client";
import {
  calculateInvestmentGrossCents,
  formatInvestmentQuantity,
} from "@/app/lib/investments/investment-domain";
import { calculateTaxFromBps } from "@/app/lib/investments/investment-tax-rules";
import { prisma } from "@/app/lib/prisma";
import type {
  ForeignInvestmentAnnualTaxPending,
  ForeignInvestmentAnnualTaxReport,
} from "@/app/types/investment";
import type { ExchangeRateModel } from "@/app/types/exchange-rate";
import type { SupportedCurrency } from "@/app/types/financial-summary";

const START_YEAR = 2024;
const FOREIGN_TAX_RATE_BPS = 1_500;
const MAX_PTAX_LOOKBACK_DAYS = 7;

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

const refreshSchema = z.object({
  year: z.number().int().min(START_YEAR).max(2100),
});

type LogicalDate = { year: number; month: number; day: number };
type QuoteSide = "BUY" | "SELL";

type ForeignEvent = {
  id: string;
  type:
    | "BUY"
    | "SELL"
    | "CUSTODY_TRANSFER_IN"
    | "CUSTODY_TRANSFER_OUT"
    | "BONUS"
    | "SPLIT"
    | "REVERSE_SPLIT"
    | "OTHER";
  quantityUnits: bigint;
  year: number;
  month: number;
  day: number;
  createdAt: Date;
  assetId: string;
  asset: {
    symbol: string;
    currency: string;
  };
  operation: {
    unitPriceCents: number;
    feesCents: number;
  } | null;
};

type ForeignAdjustment = {
  id: string;
  assetId: string;
  quantityUnits: bigint;
  year: number;
  month: number;
  day: number;
  createdAt: Date;
};

function dateString(date: LogicalDate) {
  return [
    String(date.year).padStart(4, "0"),
    String(date.month).padStart(2, "0"),
    String(date.day).padStart(2, "0"),
  ].join("-");
}

function dateValue(date: LogicalDate) {
  return Date.UTC(date.year, date.month - 1, date.day);
}

function daysBetween(left: LogicalDate, right: LogicalDate) {
  return Math.floor((dateValue(right) - dateValue(left)) / 86_400_000);
}

function toRateModel(rate: {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  numerator: number;
  denominator: number;
  source: "MANUAL" | "BCB_PTAX";
  quoteSide: "GENERIC" | "BUY" | "SELL";
  referenceYear: number;
  referenceMonth: number;
  referenceDay: number;
  createdAt: Date;
  updatedAt: Date;
}): ExchangeRateModel {
  return {
    id: rate.id,
    from: rate.fromCurrency as SupportedCurrency,
    to: rate.toCurrency as SupportedCurrency,
    numerator: rate.numerator,
    denominator: rate.denominator,
    source: rate.source,
    quoteSide: rate.quoteSide,
    referenceDate: {
      year: rate.referenceYear,
      month: rate.referenceMonth,
      day: rate.referenceDay,
    },
    createdAt: rate.createdAt.toISOString(),
    updatedAt: rate.updatedAt.toISOString(),
  };
}

function findFiscalRate(args: {
  rates: readonly ExchangeRateModel[];
  currency: SupportedCurrency;
  date: LogicalDate;
  quoteSide: QuoteSide;
}) {
  if (args.currency === "BRL") return null;

  const rate = latestRateOnOrBefore({
    rates: args.rates,
    from: args.currency,
    to: "BRL",
    referenceDate: args.date,
    quoteSide: args.quoteSide,
  });

  if (!rate) return undefined;
  if (daysBetween(rate.referenceDate, args.date) > MAX_PTAX_LOOKBACK_DAYS) {
    return undefined;
  }
  return rate;
}

function convertToBrl(args: {
  amountCents: number;
  currency: SupportedCurrency;
  date: LogicalDate;
  quoteSide: QuoteSide;
  rates: readonly ExchangeRateModel[];
}) {
  if (args.currency === "BRL") {
    return {
      amountCents: args.amountCents,
      rateDate: null as string | null,
    };
  }

  const rate = findFiscalRate(args);
  if (!rate) return null;

  const converted = convertCurrencyAmount(
    { amount: args.amountCents, currency: args.currency },
    "BRL",
    rate,
  );
  if (!converted) return null;

  return {
    amountCents: converted.converted.amount,
    rateDate: dateString(rate.referenceDate),
  };
}

function proportionalCost(
  totalCostCents: bigint,
  soldQuantityUnits: bigint,
  totalQuantityUnits: bigint,
) {
  return (
    totalCostCents * soldQuantityUnits + totalQuantityUnits / BigInt(2)
  ) / totalQuantityUnits;
}

function safeNumber(value: bigint) {
  if (
    value > BigInt(Number.MAX_SAFE_INTEGER) ||
    value < BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    throw new RangeError("Valor fiscal excede o intervalo suportado.");
  }
  return Number(value);
}

function compareDate(
  left: LogicalDate & { createdAt: Date; id: string },
  right: LogicalDate & { createdAt: Date; id: string },
) {
  const logical = dateValue(left) - dateValue(right);
  if (logical !== 0) return logical;
  const created = left.createdAt.getTime() - right.createdAt.getTime();
  return created !== 0 ? created : left.id.localeCompare(right.id);
}

function ruleSources() {
  return [
    {
      title: "Lei nº 14.754/2023",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14754.htm",
      note: "Arts. 2º, 3º, 9º e 15: tributação anual, aplicações financeiras, perdas e conversão cambial.",
    },
    {
      title: "IN RFB nº 2.180/2024",
      url: "https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=136603",
      note: "Arts. 8º a 12: aplicações financeiras no exterior, alíquota, perdas e imposto pago fora.",
    },
  ];
}

async function loadForeignTaxInputs(userId: string, year: number) {
  const [events, adjustments, incomes, rates] = await Promise.all([
    prisma.investmentFiscalEvent.findMany({
      where: {
        userId,
        year: { lte: year },
        asset: { taxLocation: "ABROAD" },
      },
      include: {
        asset: {
          select: {
            symbol: true,
            currency: true,
          },
        },
        operation: {
          select: {
            unitPriceCents: true,
            feesCents: true,
          },
        },
      },
      orderBy: [
        { year: "asc" },
        { month: "asc" },
        { day: "asc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
    }),
    prisma.investmentFiscalCostAdjustment.findMany({
      where: {
        userId,
        year: { lte: year },
        asset: { taxLocation: "ABROAD" },
      },
      select: {
        id: true,
        assetId: true,
        quantityUnits: true,
        year: true,
        month: true,
        day: true,
        createdAt: true,
      },
      orderBy: [
        { year: "asc" },
        { month: "asc" },
        { day: "asc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
    }),
    prisma.investmentIncome.findMany({
      where: {
        userId,
        year: { gte: START_YEAR, lte: year },
        asset: { taxLocation: "ABROAD" },
      },
      include: {
        asset: {
          select: {
            id: true,
            symbol: true,
            currency: true,
          },
        },
      },
      orderBy: [
        { year: "asc" },
        { month: "asc" },
        { day: "asc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
    }),
    prisma.exchangeRate.findMany({
      where: { userId },
      orderBy: [
        { referenceYear: "asc" },
        { referenceMonth: "asc" },
        { referenceDay: "asc" },
        { createdAt: "asc" },
      ],
    }),
  ]);

  return {
    events: events as ForeignEvent[],
    adjustments: adjustments as ForeignAdjustment[],
    incomes,
    rates: rates.map(toRateModel),
  };
}

export async function getForeignInvestmentAnnualTaxReportForUser(
  userId: string,
  year: number,
): Promise<ForeignInvestmentAnnualTaxReport> {
  const { events, adjustments, incomes, rates } =
    await loadForeignTaxInputs(userId, year);

  const sales: ForeignInvestmentAnnualTaxReport["sales"] = [];
  const incomeItems: ForeignInvestmentAnnualTaxReport["incomes"] = [];
  const pending: ForeignInvestmentAnnualTaxPending[] = [];

  const eventsByAsset = new Map<string, ForeignEvent[]>();
  const adjustmentsByAsset = new Map<string, ForeignAdjustment[]>();

  for (const event of events) {
    const list = eventsByAsset.get(event.assetId) ?? [];
    list.push(event);
    eventsByAsset.set(event.assetId, list);
  }
  for (const adjustment of adjustments) {
    const list = adjustmentsByAsset.get(adjustment.assetId) ?? [];
    list.push(adjustment);
    adjustmentsByAsset.set(adjustment.assetId, list);
  }

  for (const [assetId, assetEvents] of eventsByAsset) {
    const timeline = [
      ...assetEvents.map((value) => ({ kind: "EVENT" as const, value })),
      ...(adjustmentsByAsset.get(assetId) ?? []).map((value) => ({
        kind: "ADJUSTMENT" as const,
        value,
      })),
    ].sort((left, right) => compareDate(left.value, right.value));

    let quantityUnits = BigInt(0);
    let costBasisBrlCents = BigInt(0);
    let basisKnown = true;
    let basisIssue: {
      code:
        | "MISSING_PTAX"
        | "UNRELIABLE_COST_BASIS"
        | "UNSUPPORTED_FISCAL_EVENT";
      message: string;
    } | null = null;

    for (const item of timeline) {
      if (item.kind === "ADJUSTMENT") {
        quantityUnits = item.value.quantityUnits;
        costBasisBrlCents = BigInt(0);
        basisKnown = false;
        basisIssue = {
          code: "UNRELIABLE_COST_BASIS",
          message:
            "Existe ajuste manual de custo fiscal no exterior sem metadados cambiais suficientes para reconstruir o custo em reais.",
        };
        continue;
      }

      const event = item.value;
      const date = { year: event.year, month: event.month, day: event.day };
      const currency = event.asset.currency as SupportedCurrency;

      if (event.type === "BUY") {
        quantityUnits += event.quantityUnits;
        if (!event.operation) {
          basisKnown = false;
          basisIssue = {
            code: "UNRELIABLE_COST_BASIS",
            message: "Aquisição sem valor de operação suficiente para formar o custo fiscal em reais.",
          };
          continue;
        }

        const acquisitionCents =
          calculateInvestmentGrossCents(
            event.quantityUnits,
            event.operation.unitPriceCents,
          ) + event.operation.feesCents;
        const converted = convertToBrl({
          amountCents: acquisitionCents,
          currency,
          date,
          quoteSide: "BUY",
          rates,
        });
        if (!converted) {
          basisKnown = false;
          basisIssue = {
            code: "MISSING_PTAX",
            message: `PTAX de compra ausente para ${currency} em ${dateString(date)} ou nos dias úteis imediatamente anteriores.`,
          };
          continue;
        }
        if (basisKnown) {
          costBasisBrlCents += BigInt(converted.amountCents);
        }
        continue;
      }

      if (event.type === "BONUS") {
        quantityUnits += event.quantityUnits;
        continue;
      }

      if (
        event.type === "CUSTODY_TRANSFER_IN" ||
        event.type === "CUSTODY_TRANSFER_OUT"
      ) {
        continue;
      }

      if (
        event.type === "SPLIT" ||
        event.type === "REVERSE_SPLIT" ||
        event.type === "OTHER"
      ) {
        basisKnown = false;
        basisIssue = {
          code: "UNSUPPORTED_FISCAL_EVENT",
          message:
            "Histórico fiscal contém split, grupamento ou outro evento ainda sem regra segura para reconstruir o custo em reais.",
        };
        continue;
      }

      if (event.type !== "SELL") continue;

      const salePending: Array<{
        code:
          | "MISSING_PTAX"
          | "UNRELIABLE_COST_BASIS"
          | "UNSUPPORTED_FISCAL_EVENT";
        message: string;
      }> = [];
      if (!event.operation) {
        salePending.push({
          code: "UNRELIABLE_COST_BASIS",
          message: "Venda sem valor de operação suficiente.",
        });
      }
      if (!basisKnown) {
        salePending.push(
          basisIssue ?? {
            code: "UNRELIABLE_COST_BASIS",
            message: "Custo fiscal em reais não é confiável.",
          },
        );
      }
      if (quantityUnits <= BigInt(0) || event.quantityUnits > quantityUnits) {
        salePending.push({
          code: "UNRELIABLE_COST_BASIS",
          message:
            "Quantidade fiscal anterior insuficiente para calcular o custo da venda.",
        });
      }

      const netProceedsCents = event.operation
        ? calculateInvestmentGrossCents(
            event.quantityUnits,
            event.operation.unitPriceCents,
          ) - event.operation.feesCents
        : 0;
      const proceeds = event.operation
        ? convertToBrl({
            amountCents: netProceedsCents,
            currency,
            date,
            quoteSide: "SELL",
            rates,
          })
        : null;

      if (event.operation && !proceeds) {
        salePending.push({
          code: "MISSING_PTAX",
          message: `PTAX de venda ausente para ${currency} em ${dateString(date)} ou nos dias úteis imediatamente anteriores.`,
        });
      }

      let allocatedCost = BigInt(0);
      if (
        basisKnown &&
        quantityUnits > BigInt(0) &&
        event.quantityUnits <= quantityUnits
      ) {
        allocatedCost =
          event.quantityUnits === quantityUnits
            ? costBasisBrlCents
            : proportionalCost(
                costBasisBrlCents,
                event.quantityUnits,
                quantityUnits,
              );
      }

      const status = salePending.length === 0 ? ("OK" as const) : ("PENDING" as const);
      const allocatedCostNumber =
        basisKnown && event.quantityUnits <= quantityUnits
          ? safeNumber(allocatedCost)
          : null;
      const result =
        status === "OK" && proceeds && allocatedCostNumber !== null
          ? proceeds.amountCents - allocatedCostNumber
          : null;

      if (event.year >= START_YEAR) {
        sales.push({
          eventId: event.id,
          assetId,
          symbol: event.asset.symbol,
          currency,
          date: dateString(date),
          quantity: formatInvestmentQuantity(event.quantityUnits),
          netProceedsCents,
          netProceedsBrlCents: proceeds?.amountCents ?? null,
          allocatedCostBrlCents: allocatedCostNumber,
          realizedResultBrlCents: result,
          sellRateDate: proceeds?.rateDate ?? null,
          status,
        });

        for (const issue of salePending) {
          pending.push({
            code: issue.code,
            year: event.year,
            assetId,
            symbol: event.asset.symbol,
            eventId: event.id,
            message: issue.message,
          });
        }
      }

      if (quantityUnits > BigInt(0) && event.quantityUnits <= quantityUnits) {
        quantityUnits -= event.quantityUnits;
        if (basisKnown) costBasisBrlCents -= allocatedCost;
      } else {
        quantityUnits = BigInt(0);
        costBasisBrlCents = BigInt(0);
        basisKnown = false;
        basisIssue = {
          code: "UNRELIABLE_COST_BASIS",
          message:
            "Quantidade fiscal ficou inconsistente após uma venda; revise o histórico anterior.",
        };
      }
    }
  }

  for (const income of incomes) {
    const date = { year: income.year, month: income.month, day: income.day };
    const currency = income.asset.currency as SupportedCurrency;
    const classified = income.type === "DIVIDEND" || income.type === "INTEREST";
    const converted = classified
      ? convertToBrl({
          amountCents: income.netAmountCents,
          currency,
          date,
          quoteSide: "SELL",
          rates,
        })
      : null;

    let status: "OK" | "PENDING" = "OK";
    if (!classified) {
      status = "PENDING";
      pending.push({
        code: "UNCLASSIFIED_INCOME",
        year: income.year,
        assetId: income.asset.id,
        symbol: income.asset.symbol,
        eventId: income.id,
        message:
          "Rendimento no exterior sem classificação fiscal específica. Classifique como dividendo ou juros antes da apuração.",
      });
    } else if (!converted) {
      status = "PENDING";
      pending.push({
        code: "MISSING_PTAX",
        year: income.year,
        assetId: income.asset.id,
        symbol: income.asset.symbol,
        eventId: income.id,
        message: `PTAX de venda ausente para ${currency} em ${dateString(date)} ou nos dias úteis imediatamente anteriores.`,
      });
    }

    incomeItems.push({
      eventId: income.id,
      assetId: income.asset.id,
      symbol: income.asset.symbol,
      incomeType: income.type,
      currency,
      date: dateString(date),
      amountCents: income.netAmountCents,
      amountBrlCents: converted?.amountCents ?? null,
      rateDate: converted?.rateDate ?? null,
      status,
    });
  }

  const annualRows: ForeignInvestmentAnnualTaxReport["annualRows"] = [];
  let carryKnown = true;
  let openingLossCents = 0;

  for (let currentYear = START_YEAR; currentYear <= year; currentYear += 1) {
    const saleResultCents = sales
      .filter(
        (item) =>
          Number(item.date.slice(0, 4)) === currentYear &&
          item.realizedResultBrlCents !== null,
      )
      .reduce((sum, item) => sum + (item.realizedResultBrlCents ?? 0), 0);
    const incomeCents = incomeItems
      .filter(
        (item) =>
          Number(item.date.slice(0, 4)) === currentYear &&
          item.amountBrlCents !== null,
      )
      .reduce((sum, item) => sum + (item.amountBrlCents ?? 0), 0);
    const netResultBeforeLossCents = saleResultCents + incomeCents;
    const yearPending = pending.some((item) => item.year === currentYear);

    if (!carryKnown || yearPending) {
      if (!carryKnown && !yearPending) {
        pending.push({
          code: "PRIOR_YEAR_PENDING",
          year: currentYear,
          assetId: null,
          symbol: null,
          eventId: null,
          message:
            "A compensação de perdas deste ano depende de ano anterior ainda pendente.",
        });
      }
      annualRows.push({
        year: currentYear,
        saleResultCents,
        incomeCents,
        netResultBeforeLossCents,
        openingLossCents: carryKnown ? openingLossCents : null,
        compensatedLossCents: null,
        taxableBaseCents: null,
        taxDueCents: null,
        closingLossCents: null,
        status: "PENDING",
      });
      carryKnown = false;
      continue;
    }

    const compensatedLossCents =
      netResultBeforeLossCents > 0
        ? Math.min(openingLossCents, netResultBeforeLossCents)
        : 0;
    const taxableBaseCents =
      netResultBeforeLossCents > 0
        ? netResultBeforeLossCents - compensatedLossCents
        : 0;
    const closingLossCents =
      netResultBeforeLossCents < 0
        ? openingLossCents + Math.abs(netResultBeforeLossCents)
        : openingLossCents - compensatedLossCents;

    annualRows.push({
      year: currentYear,
      saleResultCents,
      incomeCents,
      netResultBeforeLossCents,
      openingLossCents,
      compensatedLossCents,
      taxableBaseCents,
      taxDueCents: calculateTaxFromBps(
        taxableBaseCents,
        FOREIGN_TAX_RATE_BPS,
      ),
      closingLossCents,
      status: "OK",
    });
    openingLossCents = closingLossCents;
  }

  const current = annualRows.at(-1) ?? {
    year,
    saleResultCents: 0,
    incomeCents: 0,
    netResultBeforeLossCents: 0,
    openingLossCents: 0,
    compensatedLossCents: 0,
    taxableBaseCents: 0,
    taxDueCents: 0,
    closingLossCents: 0,
    status: "OK" as const,
  };

  return {
    year,
    taxExercise: year + 1,
    rateBps: FOREIGN_TAX_RATE_BPS,
    status: current.status,
    ruleSources: ruleSources(),
    summary: {
      saleResultCents: current.saleResultCents,
      incomeCents: current.incomeCents,
      netResultBeforeLossCents: current.netResultBeforeLossCents,
      openingLossCents: current.openingLossCents,
      compensatedLossCents: current.compensatedLossCents,
      taxableBaseCents: current.taxableBaseCents,
      taxDueCents: current.taxDueCents,
      closingLossCents: current.closingLossCents,
      pendingCount: pending.filter((item) => item.year <= year).length,
    },
    annualRows,
    sales: sales.filter((item) => Number(item.date.slice(0, 4)) === year),
    incomes: incomeItems.filter(
      (item) => Number(item.date.slice(0, 4)) === year,
    ),
    pending: pending.filter((item) => item.year <= year),
  };
}

function requirementKey(
  currency: SupportedCurrency,
  date: LogicalDate,
  quoteSide: QuoteSide,
) {
  return [currency, dateString(date), quoteSide].join("|");
}

export async function refreshForeignInvestmentPtaxForUser(
  userId: string,
  year: number,
) {
  const { events, incomes, rates: initialRates } =
    await loadForeignTaxInputs(userId, year);
  const requirements = new Map<
    string,
    { currency: SupportedCurrency; date: LogicalDate; quoteSide: QuoteSide }
  >();

  for (const event of events) {
    if (event.type !== "BUY" && event.type !== "SELL") continue;
    const currency = event.asset.currency as SupportedCurrency;
    if (currency === "BRL") continue;
    const date = { year: event.year, month: event.month, day: event.day };
    const quoteSide = event.type === "BUY" ? "BUY" : "SELL";
    requirements.set(requirementKey(currency, date, quoteSide), {
      currency,
      date,
      quoteSide,
    });
  }

  for (const income of incomes) {
    const currency = income.asset.currency as SupportedCurrency;
    if (currency === "BRL") continue;
    const date = { year: income.year, month: income.month, day: income.day };
    requirements.set(requirementKey(currency, date, "SELL"), {
      currency,
      date,
      quoteSide: "SELL",
    });
  }

  const rates = [...initialRates];
  let reused = 0;
  let fetched = 0;
  const failed: Array<{
    currency: SupportedCurrency;
    date: string;
    quoteSide: QuoteSide;
    message: string;
  }> = [];

  for (const requirement of requirements.values()) {
    if (findFiscalRate({ rates, ...requirement })) {
      reused += 1;
      continue;
    }

    try {
      const rate = await fetchPtaxExchangeRate({
        from: requirement.currency,
        to: "BRL",
        referenceDate: requirement.date,
        quoteSide: requirement.quoteSide,
      });
      const saved = await prisma.exchangeRate.upsert({
        where: {
          userId_fromCurrency_toCurrency_source_quoteSide_referenceYear_referenceMonth_referenceDay:
            {
              userId,
              fromCurrency: rate.from,
              toCurrency: rate.to,
              source: "BCB_PTAX",
              quoteSide: rate.quoteSide,
              referenceYear: rate.referenceDate.year,
              referenceMonth: rate.referenceDate.month,
              referenceDay: rate.referenceDate.day,
            },
        },
        update: {
          numerator: rate.numerator,
          denominator: rate.denominator,
        },
        create: {
          userId,
          fromCurrency: rate.from,
          toCurrency: rate.to,
          numerator: rate.numerator,
          denominator: rate.denominator,
          source: "BCB_PTAX",
          quoteSide: rate.quoteSide,
          referenceYear: rate.referenceDate.year,
          referenceMonth: rate.referenceDate.month,
          referenceDay: rate.referenceDate.day,
        },
      });
      rates.push(toRateModel(saved));
      fetched += 1;
    } catch (error) {
      failed.push({
        currency: requirement.currency,
        date: dateString(requirement.date),
        quoteSide: requirement.quoteSide,
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível consultar a PTAX.",
      });
    }
  }

  return {
    year,
    requested: requirements.size,
    reused,
    fetched,
    failed,
  };
}

export async function getForeignInvestmentAnnualTaxReport(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const url = new URL(request.url);
    const input = querySchema.parse({ year: url.searchParams.get("year") });
    return success(
      await getForeignInvestmentAnnualTaxReportForUser(userId, input.year),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failure(error.issues[0]?.message ?? "Ano inválido", 400);
    }
    if (isUnauthorizedError(error)) {
      return failure("Não autenticado", 401);
    }
    return failure("Erro ao apurar aplicações financeiras no exterior", 500);
  }
}

export async function refreshForeignInvestmentPtax(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = refreshSchema.parse(await request.json());
    return success(
      await refreshForeignInvestmentPtaxForUser(userId, input.year),
      "PTAX das aplicações no exterior atualizada",
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failure(error.issues[0]?.message ?? "Ano inválido", 400);
    }
    if (isUnauthorizedError(error)) {
      return failure("Não autenticado", 401);
    }
    return failure("Erro ao atualizar PTAX das aplicações no exterior", 500);
  }
}
