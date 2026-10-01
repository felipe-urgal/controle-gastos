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
