import { afterEach, describe, expect, it, vi } from 'vitest';
import { transactionService } from '@/app/services/transaction-service';

afterEach(() => vi.unstubAllGlobals());

describe('normal transaction idempotency without storage', () => {
  it('sends and reuses the same Idempotency-Key even if localStorage is denied', async () => {
    vi.stubGlobal('window', {
      location: { origin: 'http://localhost:3000' },
      get localStorage() { throw new Error('Storage denied'); },
    });
    const keys: string[] = [];
    const fetchMock = vi.fn(async (_url: string, options: RequestInit) => {
      const headers = new Headers(options.headers);
      keys.push(headers.get('Idempotency-Key') ?? '');
      if (keys.length === 1) throw new TypeError('Response lost');
      return {
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { id: 'transaction-1' } }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    const attemptKey = 'stable-attempt-key';
    const payload = { amount: 100, description: 'Compra repetida' };
    await expect(transactionService.createIdempotent(payload, attemptKey)).rejects.toThrow('Response lost');
    const result = await transactionService.createIdempotent(payload, attemptKey);
    expect(result.data.id).toBe('transaction-1');
    expect(keys).toEqual([attemptKey, attemptKey]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
