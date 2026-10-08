export type GlobalSearchResultType =
  | 'TRANSACTION'
  | 'ACCOUNT'
  | 'CATEGORY'
  | 'IMPORT_RULE';

export type GlobalSearchResult = {
  id: string;
  type: GlobalSearchResultType;
  title: string;
  subtitle: string | null;
  href: string;
  matchedField?: string;
  matchedText?: string | null;
  matchKind?: 'exact' | 'prefix' | 'contains' | 'fuzzy';
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
