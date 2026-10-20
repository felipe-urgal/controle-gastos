import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

// `formatAmount` vive em import-helpers; o restante da página não pode formatar dinheiro por conta própria.
const source = readFileSync(new URL('./import-helpers.ts', import.meta.url), 'utf8');
const page = ['./index.tsx', './import-detail.tsx'].map((file) => readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n');

describe('Import Inbox currency formatting', () => {
  it('delegates visible money formatting to the canonical currency formatter', () => {
    expect(source).toContain("import { formatCurrency } from '@/app/lib/currency/format-currency';");
    expect(source).not.toContain('new Intl.NumberFormat');
    expect(page).not.toContain('new Intl.NumberFormat');
    expect(source).toContain("if (!showValues) return '••••';");
    expect(source).toContain('return formatCurrency(cents, currency);');
  });
});
