export type InvestmentFiscalEventType =
  | "BUY"
  | "SELL"
  | "CUSTODY_TRANSFER_IN"
  | "CUSTODY_TRANSFER_OUT"
  | "BONUS"
  | "SPLIT"
  | "REVERSE_SPLIT"
  | "OTHER";

export type InvestmentFiscalEventSemantics = {
  quantityDirection: -1 | 0 | 1;
  changesCostBasis: boolean;
  realizesResult: boolean;
};

export function investmentFiscalEventSemantics(
  type: InvestmentFiscalEventType,
): InvestmentFiscalEventSemantics {
  switch (type) {
    case "BUY":
      return { quantityDirection: 1, changesCostBasis: true, realizesResult: false };
    case "SELL":
      return { quantityDirection: -1, changesCostBasis: true, realizesResult: true };
    case "CUSTODY_TRANSFER_IN":
      return { quantityDirection: 1, changesCostBasis: false, realizesResult: false };
    case "CUSTODY_TRANSFER_OUT":
      return { quantityDirection: -1, changesCostBasis: false, realizesResult: false };
    case "BONUS":
      return { quantityDirection: 1, changesCostBasis: false, realizesResult: false };
    case "SPLIT":
    case "REVERSE_SPLIT":
    case "OTHER":
      return { quantityDirection: 0, changesCostBasis: false, realizesResult: false };
  }
}
