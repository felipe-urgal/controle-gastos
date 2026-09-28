import { describe, expect, it } from 'vitest';

import {
  GLOBAL_SEARCH_LIMIT_PER_GROUP,
  GLOBAL_SEARCH_MIN_QUERY_LENGTH,
  GLOBAL_SEARCH_TOTAL_LIMIT,
  globalSearchQuerySchema,
} from '@/app/lib/search/global-search-schema';

describe('globalSearchQuerySchema', () => {
  it('normaliza espaços e aceita caracteres especiais e acentos', () => {
    expect(globalSearchQuerySchema.parse({ q: '  Café & Mercado  ' })).toEqual({
      q: 'Café & Mercado',
    });
  });

  it('rejeita termo curto', () => {
    const result = globalSearchQuerySchema.safeParse({ q: 'a' });
    expect(result.success).toBe(false);
  });

  it('mantém limites explícitos e coerentes', () => {
    expect(GLOBAL_SEARCH_MIN_QUERY_LENGTH).toBe(2);
    expect(GLOBAL_SEARCH_LIMIT_PER_GROUP).toBe(5);
    expect(GLOBAL_SEARCH_TOTAL_LIMIT).toBe(20);
    expect(GLOBAL_SEARCH_LIMIT_PER_GROUP * 4).toBe(GLOBAL_SEARCH_TOTAL_LIMIT);
  });
});
