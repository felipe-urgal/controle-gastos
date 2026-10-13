import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  userId: vi.fn(),
  failure: { current: new Error('boom') as unknown },
}));

vi.mock('@/app/lib/auth', () => ({ getAuthenticatedUserId: mocks.userId }));
vi.mock('@/app/lib/search/global-search-rate-limit', () => ({
  consumeGlobalSearchRateLimit: vi.fn().mockResolvedValue({ limited: false, retryAfterSeconds: 0 }),
}));
vi.mock('@/app/lib/prisma', () => {
  const reject = () => Promise.reject(mocks.failure.current);
  const delegate = new Proxy({}, { get: () => reject });
  return {
    prisma: new Proxy(
      { $queryRaw: reject, $queryRawUnsafe: reject },
      { get: (target, key) => (key in target ? target[key as keyof typeof target] : delegate) },
    ),
  };
});

import { getGlobalSearch, isSearchTimeoutError } from '@/app/lib/search/global-search';

const SECRET_TERM = 'termo-sigiloso-do-usuario';

function lastTelemetry(spy: ReturnType<typeof vi.spyOn>) {
  const line = spy.mock.calls
    .map((call) => String(call[0]))
    .find((text) => text.includes('global_search_request'));
  return line ? { raw: line, ...JSON.parse(line) } : null;
}

describe('global search telemetry status', () => {
  beforeEach(() => {
    mocks.userId.mockResolvedValue('user-1');
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('classifies timeouts by name/code, including nested causes', () => {
    expect(isSearchTimeoutError(Object.assign(new Error('x'), { name: 'TimeoutError' }))).toBe(true);
    expect(isSearchTimeoutError({ code: '57014' })).toBe(true);
    expect(isSearchTimeoutError({ code: 'P2024' })).toBe(true);
    expect(isSearchTimeoutError({ meta: { code: '57014' } })).toBe(true);
    expect(isSearchTimeoutError({ cause: { code: '57014' } })).toBe(true);
    expect(isSearchTimeoutError(new Error('query returned zero rows'))).toBe(false);
    expect(isSearchTimeoutError(null)).toBe(false);
  });

  it('emits status=timeout without logging the search term', async () => {
    mocks.failure.current = Object.assign(new Error(SECRET_TERM), { code: '57014' });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const response = await getGlobalSearch(
      new Request(`http://localhost/api/search?q=${SECRET_TERM}`),
    );
    expect(response.status).toBeGreaterThanOrEqual(500);
    const info = vi.mocked(console.info);
    const entry = lastTelemetry(info) ?? lastTelemetry(warn);
    expect(entry).toMatchObject({ event: 'global_search_request', status: 'timeout' });
    expect(entry?.queryLength).toBe(SECRET_TERM.length);
    expect(entry?.raw).not.toContain(SECRET_TERM);
  });

  it('keeps generic failures as status=error', async () => {
    mocks.failure.current = new Error('database exploded');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await getGlobalSearch(new Request('http://localhost/api/search?q=mercado'));
    const entry = lastTelemetry(vi.mocked(console.info)) ?? lastTelemetry(warn);
    expect(entry).toMatchObject({ status: 'error' });
  });
});
