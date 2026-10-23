import { describe, expect, it } from 'vitest';

import { monthlySeries, recentFirst, reviewQueue, summarizeYear, visibleMonths } from '@/app/components/pages/payroll/payroll-year-model';
import type { PayrollSummary } from '@/app/types/payroll';

function summary(month: number, overrides: Partial<PayrollSummary> = {}): PayrollSummary {
  return {
    employerName: 'Acme',
    employerCnpj: '12.345.678/0001-90',
    year: 2026,
    month,
    grossIncomeCents: 1_000_00,
    grossIncomeComplete: true,
    netPaidCents: 800_00,
    netPaidComplete: true,
    irrfCents: 100_00,
    irrfComplete: true,
    advanceNetPaidCents: 300_00,
    advanceNetPaidComplete: true,
    regularNetPaidCents: 500_00,
    regularNetPaidComplete: true,
    matchedAdvances: 1,
    pendingAdvances: 0,
    regularDocumentCount: 1,
    reviewRequired: false,
    reviewReason: null,
    documentCount: 2,
    ...overrides,
  };
}

const incomplete = (month: number) => summary(month, { netPaidCents: null, netPaidComplete: false, grossIncomeCents: null, grossIncomeComplete: false, irrfCents: null, irrfComplete: false, reviewRequired: true, reviewReason: 'Falta a folha' });

describe('summarizeYear', () => {
  it('soma só o que é conhecido e conta o restante', () => {
    const totals = summarizeYear([summary(1), summary(2), incomplete(3)]);
    expect(totals).toMatchObject({ netPaidCents: 1_600_00, netKnownCount: 2, netUnknownCount: 1, grossCents: 2_000_00, irrfCents: 200_00, irrfMissingCount: 1, averageNetCents: 800_00, reviewCount: 1 });
  });

  it('não trata valor incompleto como zero', () => {
    const totals = summarizeYear([incomplete(1)]);
    expect(totals).toMatchObject({ netPaidCents: 0, netKnownCount: 0, averageNetCents: null });
  });

  it('lida com ano vazio', () => {
    expect(summarizeYear([])).toMatchObject({ netPaidCents: 0, averageNetCents: null, reviewCount: 0 });
  });
});

describe('monthlySeries', () => {
  it('devolve 12 meses com status por mês', () => {
    const series = monthlySeries([summary(1), incomplete(2)], 2026);
    expect(series).toHaveLength(12);
    expect(series[0]).toMatchObject({ status: 'COMPLETE', netPaidCents: 800_00, barCents: 800_00 });
    expect(series[1]).toMatchObject({ status: 'INCOMPLETE', netPaidCents: null, advanceCents: 300_00, barCents: 300_00 });
    expect(series[2]).toMatchObject({ status: 'EMPTY', barCents: 0 });
  });

  it('agrega empregadores e fica incompleto se algum valor é desconhecido', () => {
    const two = monthlySeries([summary(1), summary(1, { employerCnpj: 'outro' })], 2026);
    expect(two[0]).toMatchObject({ status: 'COMPLETE', netPaidCents: 1_600_00 });
    const mixed = monthlySeries([summary(1), { ...incomplete(1), employerCnpj: 'outro' }], 2026);
    expect(mixed[0]).toMatchObject({ status: 'INCOMPLETE', netPaidCents: null });
  });

  it('ignora outros anos', () => {
    expect(monthlySeries([summary(1, { year: 2025 })], 2026)[0].status).toBe('EMPTY');
  });
});

describe('visibleMonths', () => {
  const series = monthlySeries([summary(1), summary(8), summary(10)], 2026);

  it('mostra o ano todo sem limite', () => {
    expect(visibleMonths(series, null)).toHaveLength(12);
  });

  it('mostra os últimos meses até o mais recente com documento', () => {
    expect(visibleMonths(series, 6).map((point) => point.month)).toEqual([5, 6, 7, 8, 9, 10]);
  });

  it('mantém a janela de 6 meses no começo do ano e usa o fim do ano sem dados', () => {
    expect(visibleMonths(monthlySeries([summary(3)], 2026), 6).map((point) => point.month)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(visibleMonths(monthlySeries([], 2026), 6).map((point) => point.month)).toEqual([7, 8, 9, 10, 11, 12]);
  });
});

describe('recentFirst / reviewQueue', () => {
  it('ordena da competência mais recente para a mais antiga', () => {
    expect(recentFirst([summary(1), summary(3), summary(2)]).map((item) => item.month)).toEqual([3, 2, 1]);
  });

  it('lista só o que exige revisão, do mais recente ao mais antigo', () => {
    expect(reviewQueue([incomplete(2), summary(3), incomplete(5)]).map((item) => item.month)).toEqual([5, 2]);
  });
});
