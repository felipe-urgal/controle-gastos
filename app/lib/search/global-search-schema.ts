import { z } from 'zod';

export const GLOBAL_SEARCH_MIN_QUERY_LENGTH = 2;
export const GLOBAL_SEARCH_LIMIT_PER_GROUP = 5;
export const GLOBAL_SEARCH_TOTAL_LIMIT = 20;

export const globalSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(
      GLOBAL_SEARCH_MIN_QUERY_LENGTH,
      `Busca deve ter pelo menos ${GLOBAL_SEARCH_MIN_QUERY_LENGTH} caracteres`,
    )
    .max(100, 'Busca deve ter no máximo 100 caracteres'),
});

export type GlobalSearchQuery = z.infer<typeof globalSearchQuerySchema>;
