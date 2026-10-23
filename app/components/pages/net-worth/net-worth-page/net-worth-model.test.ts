import { describe, expect, it } from 'vitest';

import {
  liabilityShare,
  rankAccounts,
  summarizeQuality,
  summarizeVariation,
} from '@/app/components/pages/net-worth/net-worth-page/net-worth-model';
import type { NetWorthAccount, NetWorthValuationQuality } from '@/app/types/net-worth';

function account(id: string, balance: number): NetWorthAccount {
  return { id, name: id, type: 'CREDIT_DEBIT', currency: 'BRL', isActive: true, color: null, icon: null, balance, valuationBasis: 'TRANSACTION_BALANCE' };
}

function valuation(overrides: Partial<NetWorthValuationQuality> = {}): NetWorthValuationQuality {
  return {
    basis: 'TRANSACTION_BALANCE',
    compositionStatus: 'COMPLETE',
    unreconciledTransactionBalance: 0,
    asOf: { year: 2026, month: 10, day: 23 },
    positionAccountCount: 0,
    positionCount: 0,
    marketPositionCount: 0,
    costPositionCount: 0,
    staleMarketPositionCount: 0,
    quoteCoveragePercentage: 100,
    oldestQuoteReferenceAt: null,
    latestQuoteReferenceAt: null,
    comparableToHistory: true,
    ...overrides,
  };
}

describe('summarizeVariation', () => {
  it('calcula valor e percentual entre o primeiro e o último ponto', () => {
    expect(summarizeVariation([100_00, 125_00])).toEqual({ amount: 25_00, percent: 25 });
    expect(summarizeVariation([200_00, 150_00])).toEqual({ amount: -50_00, percent: -25 });
  });

  it('não inventa percentual quando o ponto inicial não é positivo', () => {
    expect(summarizeVariation([0, 50_00])).toEqual({ amount: 50_00, percent: null });
    expect(summarizeVariation([-10_00, 50_00])).toEqual({ amount: 60_00, percent: null });
  });

  it('retorna null sem pelo menos dois pontos', () => {
    expect(summarizeVariation([])).toBeNull();
    expect(summarizeVariation([100_00])).toBeNull();
  });
});

describe('liabilityShare', () => {
  it('limita entre 0 e 100 e ignora ativos não positivos', () => {
    expect(liabilityShare(200_00, 50_00)).toBe(25);
    expect(liabilityShare(100_00, 300_00)).toBe(100);
    expect(liabilityShare(0, 10_00)).toBeNull();
    expect(liabilityShare(-5_00, 10_00)).toBeNull();
  });
});

describe('rankAccounts', () => {
  it('ordena pelo maior valor absoluto com fatia e barra relativas', () => {
    const ranked = rankAccounts([account('a', 25_00), account('b', 75_00), account('c', -50_00)]);
    expect(ranked.map((item) => item.account.id)).toEqual(['b', 'c', 'a']);
    expect(ranked.map((item) => item.share)).toEqual([50, 33.3, 16.7]);
    expect(ranked[0].barPercent).toBe(100);
    expect(ranked[2].barPercent).toBeCloseTo(33.33, 1);
  });

  it('lida com lista vazia e saldos zerados', () => {
    expect(rankAccounts([])).toEqual([]);
    expect(rankAccounts([account('a', 0)])[0]).toMatchObject({ share: 0, barPercent: 0 });
  });
});

describe('summarizeQuality', () => {
  it('prioriza cotação desatualizada', () => {
    expect(summarizeQuality(valuation({ positionCount: 3, staleMarketPositionCount: 1 }))).toEqual({ tone: 'warning', headline: '1 cotação desatualizada' });
    expect(summarizeQuality(valuation({ positionCount: 3, staleMarketPositionCount: 2 })).headline).toBe('2 cotações desatualizadas');
  });

  it('sinaliza composição não conciliada', () => {
    expect(summarizeQuality(valuation({ compositionStatus: 'UNRECONCILED_TRANSACTION_BALANCE' })).tone).toBe('warning');
  });

  it('mostra valores atualizados quando nada exige atenção', () => {
    expect(summarizeQuality(valuation())).toEqual({ tone: 'ok', headline: 'Valores atualizados' });
  });
});
