import { describe, expect, it } from 'vitest';

import {
  buildInstallmentPreview,
  buildRecurrencePreview,
} from '@/app/components/pages/transactions/form/transaction-form-previews';

const start = { year: 2026, month: 11, day: 4 };

describe('buildRecurrencePreview', () => {
  it('não gera nada quando desabilitado', () => {
    const result = buildRecurrencePreview({
      enabled: false, start, preset: 'monthly', mode: 'count', occurrenceCount: 3, endDate: '',
    });
    expect(result).toEqual({ dates: [], error: null });
  });

  it('gera o número de ocorrências pedido', () => {
    const result = buildRecurrencePreview({
      enabled: true, start, preset: 'monthly', mode: 'count', occurrenceCount: 3, endDate: '',
    });
    expect(result.error).toBeNull();
    expect(result.dates).toHaveLength(3);
  });

  it('rejeita data final inválida', () => {
    const result = buildRecurrencePreview({
      enabled: true, start, preset: 'monthly', mode: 'endDate', occurrenceCount: 3, endDate: 'xx',
    });
    expect(result).toEqual({ dates: [], error: 'Informe uma data final válida' });
  });
});

describe('buildInstallmentPreview', () => {
  const base = { enabled: true, totalCents: 10000, count: 3, start, firstStatus: 'PENDING' as const };

  it('exige categoria de despesa', () => {
    expect(buildInstallmentPreview({ ...base, categoryType: null }).error).toBe('Selecione uma categoria de despesa');
    expect(buildInstallmentPreview({ ...base, categoryType: 'INCOME' }).error).toBe(
      'Parcelamento está disponível apenas para categorias de despesa',
    );
  });

  it('divide o total sem perder centavos', () => {
    const { occurrences, error } = buildInstallmentPreview({ ...base, categoryType: 'EXPENSE' });
    expect(error).toBeNull();
    expect(occurrences).toHaveLength(3);
    expect(occurrences.reduce((sum, item) => sum + item.amount, 0)).toBe(10000);
  });
});
