import { buildInstallmentOccurrences } from '@/app/lib/transactions/installments';
import { generateLogicalRecurrenceDates } from '@/app/lib/transactions/logical-recurrence';
import { parseIsoLogicalDate } from '@/app/lib/transactions/monthly-recurrence';
import { getRecurrencePresetRule, type RecurrencePreset } from '@/app/lib/transactions/recurrence-presets';
import type { RecurrenceMode } from '@/app/components/pages/transactions/form/transaction-form-shared';

type LogicalDate = { year: number; month: number; day: number };

export function buildRecurrencePreview(params: {
  enabled: boolean;
  start: LogicalDate;
  preset: RecurrencePreset;
  mode: RecurrenceMode;
  occurrenceCount: number;
  endDate: string;
}) {
  const empty = { dates: [] as ReturnType<typeof generateLogicalRecurrenceDates>, error: null as string | null };
  if (!params.enabled) return empty;

  const rule = getRecurrencePresetRule(params.preset);

  try {
    if (params.mode === 'count') {
      return {
        dates: generateLogicalRecurrenceDates(params.start, {
          ...rule,
          mode: 'count',
          occurrences: params.occurrenceCount,
        }),
        error: null,
      };
    }

    const endDate = parseIsoLogicalDate(params.endDate);
    if (!endDate) return { ...empty, error: 'Informe uma data final válida' };

    return {
      dates: generateLogicalRecurrenceDates(params.start, { ...rule, mode: 'endDate', endDate }),
      error: null,
    };
  } catch (error) {
    return { ...empty, error: error instanceof Error ? error.message : 'Recorrência inválida' };
  }
}

export function buildInstallmentPreview(params: {
  enabled: boolean;
  categoryType: 'INCOME' | 'EXPENSE' | null;
  totalCents: number;
  count: number;
  start: LogicalDate;
  firstStatus: Parameters<typeof buildInstallmentOccurrences>[0]['firstStatus'];
}) {
  const empty = { occurrences: [] as ReturnType<typeof buildInstallmentOccurrences>, error: null as string | null };
  if (!params.enabled) return empty;

  if (!params.categoryType) return { ...empty, error: 'Selecione uma categoria de despesa' };
  if (params.categoryType !== 'EXPENSE') {
    return { ...empty, error: 'Parcelamento está disponível apenas para categorias de despesa' };
  }

  try {
    return {
      occurrences: buildInstallmentOccurrences({
        totalCents: params.totalCents,
        count: params.count,
        start: params.start,
        firstStatus: params.firstStatus,
      }),
      error: null,
    };
  } catch (error) {
    return { ...empty, error: error instanceof Error ? error.message : 'Parcelamento inválido' };
  }
}
