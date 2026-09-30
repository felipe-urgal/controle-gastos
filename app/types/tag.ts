export type TagDTO = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type TagReportCurrency = {
  currency: string;
  transactionCount: number;
  income: number;
  expense: number;
  balance: number;
};

export type TagReport = {
  tag: { id: string; name: string };
  currencies: TagReportCurrency[];
};
