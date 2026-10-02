import {
  INVESTMENT_QUANTITY_SCALE,
  calculateInvestmentGrossCents,
  formatInvestmentQuantity,
} from "@/app/lib/investments/investment-domain";
import type { InvestmentFiscalEventType } from "@/app/lib/investments/investment-fiscal-domain";

export type RealizedResultEvent = {
  id: string;
  type: InvestmentFiscalEventType;
  quantityUnits: bigint;
  year: number;
  month: number;
  day: number;
  createdAt: Date;
  assetId: string;
  symbol: string;
  assetType: string;
  currency: string;
  operation: {
    unitPriceCents: number;
    feesCents: number;
  } | null;
};

export type RealizedResultAdjustment = {
  id: string;
  assetId: string;
  quantityUnits: bigint;
  costBasisCents: number;
  year: number;
  month: number;
  day: number;
  createdAt: Date;
};

export type RealizedSale = {
  eventId: string;
  assetId: string;
  symbol: string;
  assetType: string;
  currency: string;
  year: number;
  month: number;
  day: number;
  quantity: string;
  grossProceedsCents: number;
  feesCents: number;
  netProceedsCents: number;
  allocatedCostCents: number;
  realizedResultCents: number;
  status: "OK" | "PENDING";
  pending: string[];
};

type TimelineItem =
  | { kind: "EVENT"; value: RealizedResultEvent }
  | { kind: "ADJUSTMENT"; value: RealizedResultAdjustment };

function compareLogicalDate(
  left: { year: number; month: number; day: number },
  right: { year: number; month: number; day: number },
) {
  if (left.year !== right.year) return left.year - right.year;
  if (left.month !== right.month) return left.month - right.month;
  if (left.day !== right.day) return left.day - right.day;
  return 0;
}

function safeNumber(value: bigint) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new RangeError("Valor fiscal excede o limite seguro.");
  }
  return Number(value);
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

export function deriveRealizedInvestmentResults(args: {
  events: readonly RealizedResultEvent[];
  adjustments: readonly RealizedResultAdjustment[];
}) {
  const byAsset = new Map<
    string,
    { events: RealizedResultEvent[]; adjustments: RealizedResultAdjustment[] }
  >();

  for (const event of args.events) {
    const current = byAsset.get(event.assetId) ?? { events: [], adjustments: [] };
    current.events.push(event);
    byAsset.set(event.assetId, current);
  }
  for (const adjustment of args.adjustments) {
    const current = byAsset.get(adjustment.assetId) ?? { events: [], adjustments: [] };
    current.adjustments.push(adjustment);
    byAsset.set(adjustment.assetId, current);
  }

  const sales: RealizedSale[] = [];

  for (const { events, adjustments } of byAsset.values()) {
    const timeline: TimelineItem[] = [
      ...events.map((value) => ({ kind: "EVENT" as const, value })),
      ...adjustments.map((value) => ({ kind: "ADJUSTMENT" as const, value })),
    ].sort((left, right) => {
      const date = compareLogicalDate(left.value, right.value);
      if (date !== 0) return date;
      if (left.kind !== right.kind) return left.kind === "EVENT" ? -1 : 1;
      const created =
        left.value.createdAt.getTime() - right.value.createdAt.getTime();
      return created !== 0
        ? created
        : left.value.id.localeCompare(right.value.id);
    });

    let quantityUnits = BigInt(0);
    let costBasisCents = BigInt(0);
    let unresolved = false;

    for (const item of timeline) {
      if (item.kind === "ADJUSTMENT") {
        quantityUnits = item.value.quantityUnits;
        costBasisCents = BigInt(item.value.costBasisCents);
        unresolved = false;
        continue;
      }

      const event = item.value;
      if (event.type === "BUY") {
        if (!event.operation) {
          quantityUnits += event.quantityUnits;
          unresolved = true;
          continue;
        }
        quantityUnits += event.quantityUnits;
        costBasisCents += BigInt(
          calculateInvestmentGrossCents(
            event.quantityUnits,
            event.operation.unitPriceCents,
          ) + event.operation.feesCents,
        );
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
        unresolved = true;
        continue;
      }

      if (event.type !== "SELL") continue;

      const pending: string[] = [];
      if (!event.operation) {
        pending.push("Venda sem valor de operação suficiente para apuração.");
      }
      if (unresolved) {
        pending.push("Histórico fiscal anterior contém evento pendente de revisão.");
      }
      if (quantityUnits <= BigInt(0) || event.quantityUnits > quantityUnits) {
        pending.push(
          "Quantidade fiscal anterior insuficiente para calcular o custo da venda.",
        );
      }

      const grossProceedsCents = event.operation
        ? calculateInvestmentGrossCents(
            event.quantityUnits,
            event.operation.unitPriceCents,
          )
        : 0;
      const feesCents = event.operation?.feesCents ?? 0;
      const netProceedsCents = grossProceedsCents - feesCents;

      let allocatedCost = BigInt(0);
      if (
        quantityUnits > BigInt(0) &&
        event.quantityUnits <= quantityUnits &&
        !unresolved
      ) {
        allocatedCost =
          event.quantityUnits === quantityUnits
            ? costBasisCents
            : proportionalCost(
                costBasisCents,
                event.quantityUnits,
                quantityUnits,
              );
      }

      sales.push({
        eventId: event.id,
        assetId: event.assetId,
        symbol: event.symbol,
        assetType: event.assetType,
        currency: event.currency,
        year: event.year,
        month: event.month,
        day: event.day,
        quantity: formatInvestmentQuantity(event.quantityUnits),
        grossProceedsCents,
        feesCents,
        netProceedsCents,
        allocatedCostCents: safeNumber(allocatedCost),
        realizedResultCents:
          pending.length === 0
            ? netProceedsCents - safeNumber(allocatedCost)
            : 0,
        status: pending.length === 0 ? "OK" : "PENDING",
        pending,
      });

      if (quantityUnits > BigInt(0) && event.quantityUnits <= quantityUnits) {
        quantityUnits -= event.quantityUnits;
        costBasisCents -= allocatedCost;
      } else {
        quantityUnits = BigInt(0);
        costBasisCents = BigInt(0);
      }
    }
  }

  return sales.sort((left, right) => {
    if (left.year !== right.year) return left.year - right.year;
    if (left.month !== right.month) return left.month - right.month;
    if (left.day !== right.day) return left.day - right.day;
    return left.eventId.localeCompare(right.eventId);
  });
}
