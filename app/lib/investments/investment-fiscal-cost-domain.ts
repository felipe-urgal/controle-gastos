import {
  INVESTMENT_QUANTITY_SCALE,
  calculateInvestmentGrossCents,
  formatInvestmentQuantity,
} from "@/app/lib/investments/investment-domain";
import type { InvestmentFiscalEventType } from "@/app/lib/investments/investment-fiscal-domain";

export type FiscalCostEvent = {
  id: string;
  type: InvestmentFiscalEventType;
  quantityUnits: bigint;
  year: number;
  month: number;
  day: number;
  sequence?: number | null;
  createdAt: Date;
  operation: {
    unitPriceCents: number;
    feesCents: number;
  } | null;
};

export type FiscalCostAdjustment = {
  id: string;
  quantityUnits: bigint;
  costBasisCents: number;
  year: number;
  month: number;
  day: number;
  createdAt: Date;
};

export type FiscalCostPending = {
  code:
    | "MISSING_OPERATION_VALUE"
    | "INSUFFICIENT_FISCAL_POSITION"
    | "UNSUPPORTED_FISCAL_EVENT";
  eventId: string;
  message: string;
};

export type FiscalCostState = {
  quantityUnits: bigint;
  costBasisCents: number;
  averageUnitCostCents: number | null;
  pending: FiscalCostPending[];
  lastAdjustmentId: string | null;
};

type TimelineItem =
  | { kind: "EVENT"; value: FiscalCostEvent }
  | { kind: "ADJUSTMENT"; value: FiscalCostAdjustment };

function compareLogicalDate(
  left: { year: number; month: number; day: number; createdAt: Date },
  right: { year: number; month: number; day: number; createdAt: Date },
) {
  if (left.year !== right.year) return left.year - right.year;
  if (left.month !== right.month) return left.month - right.month;
  if (left.day !== right.day) return left.day - right.day;
  return 0;
}

function roundedProportionalCost(
  totalCostCents: bigint,
  soldQuantityUnits: bigint,
  totalQuantityUnits: bigint,
) {
  return (
    totalCostCents * soldQuantityUnits + totalQuantityUnits / BigInt(2)
  ) / totalQuantityUnits;
}

function averageCostCents(costBasisCents: bigint, quantityUnits: bigint) {
  if (quantityUnits <= BigInt(0)) return null;
  const rounded =
    (costBasisCents * INVESTMENT_QUANTITY_SCALE + quantityUnits / BigInt(2)) /
    quantityUnits;
  if (rounded > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Custo fiscal médio excede o limite seguro.");
  }
  return Number(rounded);
}

export function deriveFiscalCostBasis(args: {
  events: readonly FiscalCostEvent[];
  adjustments: readonly FiscalCostAdjustment[];
}): FiscalCostState {
  const timeline: TimelineItem[] = [
    ...args.events.map((value) => ({ kind: "EVENT" as const, value })),
    ...args.adjustments.map((value) => ({ kind: "ADJUSTMENT" as const, value })),
  ].sort((left, right) => {
    const date = compareLogicalDate(left.value, right.value);
    if (date !== 0) return date;
    if (left.kind !== right.kind) {
      // On the same logical date the adjustment is an end-of-day verified
      // baseline and therefore supersedes events imported for that date.
      return left.kind === "EVENT" ? -1 : 1;
    }
    if (left.kind === "EVENT" && right.kind === "EVENT") {
      const leftSequence = left.value.sequence ?? Number.MAX_SAFE_INTEGER;
      const rightSequence = right.value.sequence ?? Number.MAX_SAFE_INTEGER;
      if (leftSequence !== rightSequence) return leftSequence - rightSequence;
    }
    const created =
      left.value.createdAt.getTime() - right.value.createdAt.getTime();
    return created !== 0 ? created : left.value.id.localeCompare(right.value.id);
  });

  let quantityUnits = BigInt(0);
  let costBasisCents = BigInt(0);
  let pending: FiscalCostPending[] = [];
  let lastAdjustmentId: string | null = null;

  for (const item of timeline) {
    if (item.kind === "ADJUSTMENT") {
      quantityUnits = item.value.quantityUnits;
      costBasisCents = BigInt(item.value.costBasisCents);
      pending = [];
      lastAdjustmentId = item.value.id;
      continue;
    }

    const event = item.value;
    switch (event.type) {
      case "BUY": {
        if (!event.operation) {
          pending.push({
            code: "MISSING_OPERATION_VALUE",
            eventId: event.id,
            message: "Compra sem valor de operação suficiente para compor o custo fiscal.",
          });
          quantityUnits += event.quantityUnits;
          break;
        }
        quantityUnits += event.quantityUnits;
        costBasisCents += BigInt(
          calculateInvestmentGrossCents(
            event.quantityUnits,
            event.operation.unitPriceCents,
          ) + event.operation.feesCents,
        );
        break;
      }

      case "SELL": {
        if (quantityUnits <= BigInt(0) || event.quantityUnits > quantityUnits) {
          pending.push({
            code: "INSUFFICIENT_FISCAL_POSITION",
            eventId: event.id,
            message:
              "Venda sem quantidade fiscal anterior suficiente. Informe um ajuste de custo/posição antes desta venda.",
          });
          quantityUnits =
            event.quantityUnits >= quantityUnits
              ? BigInt(0)
              : quantityUnits - event.quantityUnits;
          costBasisCents = BigInt(0);
          break;
        }

        const removedCost =
          event.quantityUnits === quantityUnits
            ? costBasisCents
            : roundedProportionalCost(
                costBasisCents,
                event.quantityUnits,
                quantityUnits,
              );
        quantityUnits -= event.quantityUnits;
        costBasisCents -= removedCost;
        break;
      }

      case "CUSTODY_TRANSFER_IN":
      case "CUSTODY_TRANSFER_OUT":
        // Custody changes do not change global fiscal ownership or cost.
        break;

      case "BONUS":
        quantityUnits += event.quantityUnits;
        break;

      case "SPLIT":
      case "REVERSE_SPLIT":
      case "OTHER":
        pending.push({
          code: "UNSUPPORTED_FISCAL_EVENT",
          eventId: event.id,
          message: `Evento fiscal ${event.type} exige revisão antes de compor o custo fiscal.`,
        });
        break;
    }
  }

  if (
    costBasisCents > BigInt(Number.MAX_SAFE_INTEGER) ||
    costBasisCents < BigInt(0)
  ) {
    throw new RangeError("Custo fiscal acumulado excede o limite seguro.");
  }

  return {
    quantityUnits,
    costBasisCents: Number(costBasisCents),
    averageUnitCostCents: averageCostCents(costBasisCents, quantityUnits),
    pending,
    lastAdjustmentId,
  };
}

export function fiscalQuantityMismatchMessage(args: {
  fiscalQuantityUnits: bigint;
  economicQuantityUnits: bigint;
}) {
  if (args.fiscalQuantityUnits === args.economicQuantityUnits) return null;
  return [
    "Quantidade fiscal não conciliada com a posição econômica.",
    `Fiscal: ${formatInvestmentQuantity(args.fiscalQuantityUnits)}.`,
    `Posição: ${formatInvestmentQuantity(args.economicQuantityUnits)}.`,
    "Informe/revise a classificação fiscal ou registre um ajuste auditável.",
  ].join(" ");
}
