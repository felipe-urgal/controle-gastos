import { describe, expect, it } from 'vitest';

import { parseDashboardUrlState } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';

const params = (query: string) => new URLSearchParams(query);

describe('parseDashboardUrlState', () => {
  it('usa o padrão quando a URL não traz parâmetros', () => {
    expect(parseDashboardUrlState(params(''), '2026-10')).toEqual({ period: '2026-10', currency: 'BRL' });
  });

  it('lê período e moeda válidos', () => {
    expect(parseDashboardUrlState(params('m=2026-03&c=USD'), '2026-10')).toEqual({ period: '2026-03', currency: 'USD' });
  });

  it.each(['2026-13', '2026-00', '1999-12', '2101-01', 'março', '2026-3'])('ignora o período inválido %s', (value) => {
    expect(parseDashboardUrlState(params(`m=${value}`), '2026-10').period).toBe('2026-10');
  });

  it('ignora moeda desconhecida', () => {
    expect(parseDashboardUrlState(params('c=GBP'), '2026-10').currency).toBe('BRL');
  });
});
