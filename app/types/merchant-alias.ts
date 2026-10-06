export type MerchantAliasOperator = "EQUALS" | "STARTS_WITH" | "CONTAINS";

export type MerchantAliasDTO = {
  id: string;
  pattern: string;
  operator: MerchantAliasOperator;
  priority: number;
  merchant: { id: string; name: string; isActive: boolean };
  createdAt: string;
  updatedAt: string;
};

export type MerchantAliasPreviewDTO = {
  normalizedPattern: string;
  exactEquivalent: {
    aliasId: string;
    pattern: string;
    operator: MerchantAliasOperator;
    merchant: { id: string; name: string; isActive: boolean };
  } | null;
  overlapCount: number;
  overlaps: Array<{
    aliasId: string;
    pattern: string;
    operator: MerchantAliasOperator;
    priority: number;
    exact: boolean;
    merchant: { id: string; name: string; isActive: boolean };
  }>;
  test: {
    matchesCandidate: boolean;
    conflict: boolean;
    winner: {
      aliasId: string;
      merchantId: string;
      merchantName: string;
    } | null;
    candidates: Array<{
      aliasId: string;
      merchantId: string;
      merchantName: string;
      operator: string;
      pattern: string;
      candidate: boolean;
    }>;
  } | null;
  canSave: boolean;
  canMove: boolean;
};
