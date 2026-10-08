import { normalizeGlobalSearchQuery } from '@/app/lib/search/global-search-schema';

export function normalizeGlobalSearchMatch(value: string): string {
  return normalizeGlobalSearchQuery(value).toLocaleLowerCase('pt-BR');
}

// Keep accents significant for exact/prefix/contains matches. Fuzzy search
// remains the bounded fallback for misspellings and accent differences.
export function scoreGlobalSearchMatch(value: string, rawQuery: string): number {
  const candidate = normalizeGlobalSearchMatch(value);
  const query = normalizeGlobalSearchMatch(rawQuery);
  if (!candidate || !query) return 0;
  if (candidate === query) return 400;
  if (candidate.startsWith(query)) return 300;
  if (candidate.includes(query)) return 200;
  return 0;
}
