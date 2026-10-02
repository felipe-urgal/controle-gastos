import { z } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import {
  deriveFiscalCostBasis,
  fiscalQuantityMismatchMessage,
} from "@/app/lib/investments/investment-fiscal-cost-domain";
import {
  deriveInvestmentPositions,
  formatInvestmentQuantity,
  parseInvestmentQuantity,
  type InvestmentOperationForPosition,
} from "@/app/lib/investments/investment-domain";
import { prisma } from "@/app/lib/prisma";

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

type FiscalEventRow = Awaited<
  ReturnType<typeof readFiscalSnapshotRows>
>["fiscalEvents"][number];
type FiscalAdjustmentRow = Awaited<
  ReturnType<typeof readFiscalSnapshotRows>
>["adjustments"][number];
type OperationRow = Awaited<
  ReturnType<typeof readFiscalSnapshotRows>
>["operations"][number];

function isOnOrBeforeYearEnd(
  value: { year: number; month: number; day: number },
  year: number,
) {
  return (
    value.year < year ||
    (value.year === year &&
      (value.month < 12 || (value.month === 12 && value.day <= 31)))
  );
}

function toPositionOperation(
  operation: OperationRow,
): InvestmentOperationForPosition {
  return {
    id: operation.id,
    type: operation.type,
    quantityUnits: operation.quantityUnits,
    unitPriceCents: operation.unitPriceCents,
    feesCents: operation.feesCents,
    year: operation.year,
    month: operation.month,
    day: operation.day,
    createdAt: operation.createdAt,
    accountId: operation.account.id,
    accountName: operation.account.name,
    assetId: operation.asset.id,
    assetSymbol: operation.asset.symbol,
    assetName: operation.asset.name,
    assetType: operation.asset.type,
    currency: operation.asset.currency,
  };
}

function institutionContext(events: readonly FiscalEventRow[]) {
  const institutions = new Set<string>();

  for (const event of events) {
    institutions.add(event.account.name);
    if (event.sourceInstitution) institutions.add(event.sourceInstitution);
    if (event.destinationInstitution) {
      institutions.add(event.destinationInstitution);
    }
  }

  return [...institutions].sort((left, right) => left.localeCompare(right));
}

async function readFiscalSnapshotRows(userId: string) {
  const [assets, fiscalEvents, adjustments, operations] = await Promise.all([
    prisma.investmentAsset.findMany({
      where: { userId },
      select: {
        id: true,
        symbol: true,
        name: true,
        type: true,
        currency: true,
      },
      orderBy: [{ currency: "asc" }, { symbol: "asc" }],
    }),
    prisma.investmentFiscalEvent.findMany({
      where: { userId },
      include: {
        account: { select: { id: true, name: true } },
        operation: {
          select: { unitPriceCents: true, feesCents: true },
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
      where: { userId },
      orderBy: [
        { year: "asc" },
        { month: "asc" },
        { day: "asc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
    }),
    prisma.investmentOperation.findMany({
      where: { userId },
      include: {
        account: {
          select: { id: true, name: true, currency: true },
        },
        asset: {
          select: {
            id: true,
            symbol: true,
            name: true,
            type: true,
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
  ]);

  return { assets, fiscalEvents, adjustments, operations };
}

function buildSnapshotForYear(
  rows: Awaited<ReturnType<typeof readFiscalSnapshotRows>>,
  year: number,
) {
  const operations = rows.operations.filter((item) =>
    isOnOrBeforeYearEnd(item, year),
  );
  const economicPositions = deriveInvestmentPositions(
    operations.map(toPositionOperation),
  );

  const items = rows.assets
    .map((asset) => {
      const events = rows.fiscalEvents.filter(
        (event) =>
          event.assetId === asset.id && isOnOrBeforeYearEnd(event, year),
      );
      const adjustments = rows.adjustments.filter(
        (adjustment) =>
          adjustment.assetId === asset.id &&
          isOnOrBeforeYearEnd(adjustment, year),
      );
      const economicAssetPositions = economicPositions.filter(
        (position) => position.assetId === asset.id,
      );
      const economicQuantityUnits = economicAssetPositions.reduce(
        (total, position) =>
          total + (parseInvestmentQuantity(position.quantity) ?? BigInt(0)),
        BigInt(0),
      );

      if (
        events.length === 0 &&
        adjustments.length === 0 &&
        economicQuantityUnits === BigInt(0)
      ) {
        return null;
      }

      const derived = deriveFiscalCostBasis({
        events: events.map((event) => ({
          id: event.id,
          type: event.type,
          quantityUnits: event.quantityUnits,
          year: event.year,
          month: event.month,
          day: event.day,
          createdAt: event.createdAt,
          operation: event.operation,
        })),
        adjustments: adjustments.map((adjustment) => ({
          id: adjustment.id,
          quantityUnits: adjustment.quantityUnits,
          costBasisCents: adjustment.costBasisCents,
          year: adjustment.year,
          month: adjustment.month,
          day: adjustment.day,
          createdAt: adjustment.createdAt,
        })),
      });

      const mismatch = fiscalQuantityMismatchMessage({
        fiscalQuantityUnits: derived.quantityUnits,
        economicQuantityUnits,
      });
      const pending = [
        ...derived.pending.map((item) => ({
          code: item.code,
          eventId: item.eventId,
          message: item.message,
        })),
        ...(mismatch
          ? [
              {
                code: "FISCAL_QUANTITY_MISMATCH" as const,
                eventId: null,
                message: mismatch,
              },
            ]
          : []),
      ];

      return {
        assetId: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        assetType: asset.type,
        currency: asset.currency,
        quantity: formatInvestmentQuantity(derived.quantityUnits),
        economicQuantity: formatInvestmentQuantity(economicQuantityUnits),
        costBasisCents: derived.costBasisCents,
        averageUnitCostCents: derived.averageUnitCostCents,
        status: pending.length === 0 ? ("OK" as const) : ("PENDING" as const),
        pending,
        institutions: institutionContext(events),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const totalsByCurrency = items.reduce<Record<string, number>>(
    (totals, item) => {
      totals[item.currency] =
        (totals[item.currency] ?? 0) + item.costBasisCents;
      return totals;
    },
    {},
  );

  return { year, referenceDate: `${year}-12-31`, items, totalsByCurrency };
}

export async function getInvestmentFiscalYearEndSnapshotForUser(
  userId: string,
  year: number,
) {
  const rows = await readFiscalSnapshotRows(userId);
  const current = buildSnapshotForYear(rows, year);
  const previous = buildSnapshotForYear(rows, year - 1);

  const previousByAsset = new Map(
    previous.items.map((item) => [item.assetId, item]),
  );
  const currentByAsset = new Map(current.items.map((item) => [item.assetId, item]));

  const comparison = [...new Set([...currentByAsset.keys(), ...previousByAsset.keys()])]
    .map((assetId) => {
      const currentItem = currentByAsset.get(assetId) ?? null;
      const previousItem = previousByAsset.get(assetId) ?? null;
      const base = currentItem ?? previousItem;
      if (!base) return null;

      return {
        assetId,
        symbol: base.symbol,
        currency: base.currency,
        previousQuantity: previousItem?.quantity ?? "0",
        currentQuantity: currentItem?.quantity ?? "0",
        previousCostBasisCents: previousItem?.costBasisCents ?? 0,
        currentCostBasisCents: currentItem?.costBasisCents ?? 0,
        status:
          currentItem?.status === "PENDING" || previousItem?.status === "PENDING"
            ? ("PENDING" as const)
            : ("OK" as const),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((left, right) => left.symbol.localeCompare(right.symbol));

  return { current, previous, comparison };
}

export async function getInvestmentFiscalYearEndSnapshot(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const url = new URL(request.url);
    const input = querySchema.parse({ year: url.searchParams.get("year") });
    return success(
      await getInvestmentFiscalYearEndSnapshotForUser(userId, input.year),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failure(error.issues[0]?.message ?? "Ano inválido", 400);
    }
    if (isUnauthorizedError(error)) {
      return failure("Não autenticado", 401);
    }
    return failure("Erro ao gerar snapshot fiscal", 500);
  }
}
