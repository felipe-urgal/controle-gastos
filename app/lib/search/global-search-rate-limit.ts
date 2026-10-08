import { consumeRateLimit } from '@/app/lib/security/rate-limit';

// Read-specific budget. The 250ms client debounce can issue ~4 searches/second;
// ordinary use stays under this budget, sustained bursts are throttled.
export const GLOBAL_SEARCH_RATE_LIMIT_POLICY = {
  action: 'global-search-read',
  maxAttempts: 90,
  windowMs: 60_000,
  blockMs: 30_000,
} as const;

export function consumeGlobalSearchRateLimit(userId: string) {
  return consumeRateLimit({ ...GLOBAL_SEARCH_RATE_LIMIT_POLICY, identifier: userId });
}
