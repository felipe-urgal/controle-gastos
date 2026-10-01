import { describe, expect, it } from 'vitest';

import { isPeriodicSummaryCronAuthorized } from '@/app/api/cron/periodic-summary/route';

describe('periodic summary cron authorization', () => {
  it('rejects missing or invalid cron credentials', () => {
    const previous = process.env.CRON_SECRET;
    process.env.CRON_SECRET = 'secret';

    try {
      expect(
        isPeriodicSummaryCronAuthorized(
          new Request('http://localhost/api/cron/periodic-summary'),
        ),
      ).toBe(false);
      expect(
        isPeriodicSummaryCronAuthorized(
          new Request('http://localhost/api/cron/periodic-summary', {
            headers: { authorization: 'Bearer wrong' },
          }),
        ),
      ).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = previous;
    }
  });

  it('accepts the configured bearer secret', () => {
    const previous = process.env.CRON_SECRET;
    process.env.CRON_SECRET = 'secret';

    try {
      expect(
        isPeriodicSummaryCronAuthorized(
          new Request('http://localhost/api/cron/periodic-summary', {
            headers: { authorization: 'Bearer secret' },
          }),
        ),
      ).toBe(true);
    } finally {
      if (previous === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = previous;
    }
  });
});
