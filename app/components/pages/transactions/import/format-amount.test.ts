import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./index.tsx', import.meta.url), 'utf8');

describe('Import Inbox currency formatting', () => {
  it('delegates visible money formatting to the canonical currency formatter', () => {
    expect(source).toContain("import { formatCurrency } from '@/app/lib/currency/format-currency';");
    expect(source).not.toContain('new Intl.NumberFormat');
    expect(source).toContain("if (!showValues) return '••••';");
    expect(source).toContain('return formatCurrency(cents, currency);');
  });
});
