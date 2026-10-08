export type GlobalSearchResultType =
  | 'TRANSACTION'
  | 'ACCOUNT'
  | 'CATEGORY'
  | 'IMPORT_RULE'
  | 'MERCHANT'
  | 'TAG'
  | 'DEBT'
  | 'TEMPLATE'
  | 'GOAL';

export type GlobalSearchResult = {
  id: string;
  type: GlobalSearchResultType;
  title: string;
  subtitle: string | null;
  href: string;
};

export type GlobalSearchGroup = {
  type: GlobalSearchResultType;
  items: GlobalSearchResult[];
};

export type GlobalSearchData = {
  query: string;
  groups: GlobalSearchGroup[];
  total: number;
  limitPerGroup: number;
  totalLimit: number;
};
