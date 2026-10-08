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


/**
 * Keep the visual groups separate, but select the strongest result when Enter
 * is pressed. Equal matches retain their displayed order (actions, pages, data).
 * Auxiliary keywords never outrank an exact entity or page name.
 */
export type GlobalSearchSelectionCandidate = {
  kind: 'action' | 'navigation' | 'data';
  title: string;
  subtitle?: string | null;
  keywords?: string | null;
  matchedText?: string | null;
  matchKind?: 'exact' | 'prefix' | 'contains' | 'fuzzy';
};

export function chooseGlobalSearchInitialIndex(
  candidates: readonly GlobalSearchSelectionCandidate[],
  query: string,
): number {
  if (candidates.length === 0) return -1;
  const term = normalizeGlobalSearchMatch(query).replace(/^#/, '');
  if (!term) return 0;

  let selected = -1;
  let bestScore = 0;
  candidates.forEach((candidate, index) => {
    const titleScore = scoreGlobalSearchMatch(
      candidate.title.replace(/^#/, ''), term,
    );
    const auxiliaryScore = candidate.kind === 'data'
      ? Math.max(
          0,
          scoreGlobalSearchMatch(candidate.matchedText ?? '', term) - 25,
          candidate.matchKind === 'fuzzy' ? 100 : 0,
        )
      : Math.max(
          0,
          scoreGlobalSearchMatch(candidate.subtitle ?? '', term) - 150,
          scoreGlobalSearchMatch(candidate.keywords ?? '', term) - 150,
        );
    const score = Math.max(titleScore, auxiliaryScore);
    if (score > bestScore) {
      bestScore = score;
      selected = index;
    }
  });
  return selected >= 0 ? selected : 0;
}
