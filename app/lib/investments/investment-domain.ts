export const INVESTMENT_QUANTITY_DECIMALS = 8;
export const INVESTMENT_QUANTITY_SCALE = 100_000_000n;
const MAX_BIGINT = 9_223_372_036_854_775_807n;

export class InvestmentPositionError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "SELL_EXCEEDS_POSITION"
      | "AMOUNT_TOO_LARGE" = "SELL_EXCEEDS_POSITION",
  ) {
    super(message);
    this.name = "InvestmentPositionError";
  }
}

export type InvestmentOperationForPosition = {
  id: string;
  type: "BUY" | "SELL";
  quantityUnits: bigint;
  unitPriceCents: number;
  feesCents: number;
  year: number;
  month: number;
  day: number;
  createdAt: Date;
  accountId: string;
  accountName: string;
  assetId: string;
  assetSymbol: string;
  assetName: string | null;
  assetType: string;
  currency: string;
};

export type InvestmentPosition = {
  accountId: string;
  accountName: string;
  assetId: string;
  symbol: string;
  name: string | null;
  assetType: string;
  currency: string;
  quantity: string;
  investedCents: number;
  averageUnitCostCents: number;
};

export function parseInvestmentQuantity(value: string) {
  const normalized = value.trim().replace(",", ".");
  const match = /^(\d+)(?:\.(\d{1,8}))?$/.exec(normalized);
  if (!match) return null;

  const whole = BigInt(match[1]);
  const fraction = (match[2] ?? "").padEnd(INVESTMENT_QUANTITY_DECIMALS, "0");
  const units = whole * INVESTMENT_QUANTITY_SCALE + BigInt(fraction || "0");

  if (units <= 0n || units > MAX_BIGINT) return null;
  return units;
}

export function formatInvestmentQuantity(units: bigint) {
  const sign = units < 0n ? "-" : "";
  const absolute = units < 0n ? -units : units;
  const whole = absolute / INVESTMENT_QUANTITY_SCALE;
  const fraction = (absolute % INVESTMENT_QUANTITY_SCALE)
    .toString()
    .padStart(INVESTMENT_QUANTITY_DECIMALS, "0")
    .replace(/0+$/, "");

  return `${sign}${whole.toString()}${fraction ? `.${fraction}` : ""}`;
}

function safeNumber(value: bigint) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < 0n) {
    throw new InvestmentPositionError(
      "Valor financeiro da posição excede o limite seguro.",
      "AMOUNT_TOO_LARGE",
    );
  }
  return Number(value);
}

function roundHalfUp(numerator: bigint, denominator: bigint) {
  if (denominator <= 0n) throw new RangeError("Denominador inválido.");
  return (numerator + denominator / 2n) / denominator;
}

export function calculateInvestmentGrossCents(
  quantityUnits: bigint,
  unitPriceCents: number,
) {
  if (quantityUnits <= 0n || !Number.isSafeInteger(unitPriceCents) || unitPriceCents <= 0) {
    throw new RangeError("Quantidade e preço devem ser positivos.");
  }

  return safeNumber(
    roundHalfUp(
      quantityUnits * BigInt(unitPriceCents),
      INVESTMENT_QUANTITY_SCALE,
    ),
  );
}

function operationOrder(
  left: InvestmentOperationForPosition,
  right: InvestmentOperationForPosition,
) {
  if (left.year !== right.year) return left.year - right.year;
  if (left.month !== right.month) return left.month - right.month;
  if (left.day !== right.day) return left.day - right.day;
  const created = left.createdAt.getTime() - right.createdAt.getTime();
  if (created !== 0) return created;
  return left.id.localeCompare(right.id);
}

export function deriveInvestmentPositions(
  operations: readonly InvestmentOperationForPosition[],
) {
  const state = new Map<
    string,
    {
      operation: InvestmentOperationForPosition;
      quantityUnits: bigint;
      costBasisCents: bigint;
    }
  >();

  for (const operation of [...operations].sort(operationOrder)) {
    const key = `${operation.accountId}:${operation.assetId}`;
    const current = state.get(key) ?? {
      operation,
      quantityUnits: 0n,
      costBasisCents: 0n,
    };
    const grossCents = BigInt(
      calculateInvestmentGrossCents(
        operation.quantityUnits,
        operation.unitPriceCents,
      ),
    );

    if (operation.type === "BUY") {
      current.quantityUnits += operation.quantityUnits;
      current.costBasisCents += grossCents + BigInt(operation.feesCents);
      if (current.costBasisCents > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new InvestmentPositionError(
          "Custo acumulado da posição excede o limite seguro.",
          "AMOUNT_TOO_LARGE",
        );
      }
    } else {
      if (
        current.quantityUnits <= 0n ||
        operation.quantityUnits > current.quantityUnits
      ) {
        throw new InvestmentPositionError(
          `Venda de ${formatInvestmentQuantity(operation.quantityUnits)} excede a posição disponível de ${formatInvestmentQuantity(current.quantityUnits)}.`,
        );
      }

      const removedCost =
        operation.quantityUnits === current.quantityUnits
          ? current.costBasisCents
          : roundHalfUp(
              current.costBasisCents * operation.quantityUnits,
              current.quantityUnits,
            );
      current.quantityUnits -= operation.quantityUnits;
      current.costBasisCents -= removedCost;
    }

    current.operation = operation;
    state.set(key, current);
  }

  return [...state.values()]
    .filter((item) => item.quantityUnits > 0n)
    .map((item): InvestmentPosition => {
      const operation = item.operation;
      return {
        accountId: operation.accountId,
        accountName: operation.accountName,
        assetId: operation.assetId,
        symbol: operation.assetSymbol,
        name: operation.assetName,
        assetType: operation.assetType,
        currency: operation.currency,
        quantity: formatInvestmentQuantity(item.quantityUnits),
        investedCents: safeNumber(item.costBasisCents),
        averageUnitCostCents: safeNumber(
          roundHalfUp(
            item.costBasisCents * INVESTMENT_QUANTITY_SCALE,
            item.quantityUnits,
          ),
        ),
      };
    })
    .sort(
      (left, right) =>
        left.currency.localeCompare(right.currency) ||
        left.symbol.localeCompare(right.symbol) ||
        left.accountName.localeCompare(right.accountName),
    );
}
