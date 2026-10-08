import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
  consumeRateLimit: vi.fn(),
}));

vi.mock('@/app/lib/auth', () => ({
  getAuthenticatedUserId: mocks.getAuthenticatedUserId,
}));
vi.mock('@/app/lib/security/rate-limit', () => ({
  consumeRateLimit: mocks.consumeRateLimit,
}));
vi.mock('@/app/lib/prisma', () => ({
  prisma: {},
}));

import { getGlobalSearch } from '@/app/lib/search/global-search';

describe('global search rate limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedUserId.mockResolvedValue('owned-user');
  });

  it('retorna 429 e Retry-After antes de consultar dados', async () => {
    mocks.consumeRateLimit.mockResolvedValue({ limited: true, retryAfterSeconds: 30 });
    const response = await getGlobalSearch(
      new Request('http://localhost/api/search?q=mercado'),
    );
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('30');
    expect(await response.json()).toMatchObject({
      success: false,
      error: { code: 'GLOBAL_SEARCH_RATE_LIMITED' },
    });
    expect(mocks.consumeRateLimit).toHaveBeenCalledWith({
      action: 'global-search-read',
      identifier: 'owned-user',
      maxAttempts: 90,
      windowMs: 60_000,
      blockMs: 30_000,
    });
  });

  it('bloqueia por usuário, sem usar orçamento mutacional', async () => {
    mocks.consumeRateLimit.mockResolvedValue({ limited: true, retryAfterSeconds: 1 });
    await getGlobalSearch(new Request('http://localhost/api/search?q=conta'));
    const policy = mocks.consumeRateLimit.mock.calls[0]?.[0];
    expect(policy.action).not.toMatch(/mutation|import/);
    expect(policy.identifier).toBe('owned-user');
  });
});
