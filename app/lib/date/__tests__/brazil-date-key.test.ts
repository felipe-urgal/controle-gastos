import { describe, expect, it } from 'vitest';

import { brazilDateKey } from '@/app/lib/date/date-helpers';

describe('brazilDateKey', () => {
  it('mantém o dia civil do Brasil depois das 21h (UTC já no dia seguinte)', () => {
    expect(brazilDateKey(new Date('2026-11-05T01:30:00Z'))).toBe('2026-11-04');
  });

  it('usa o dia seguinte só a partir da meia-noite do Brasil', () => {
    expect(brazilDateKey(new Date('2026-11-05T03:00:00Z'))).toBe('2026-11-05');
  });
});
