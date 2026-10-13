import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PeriodicSummaryCard } from '@/app/components/pages/dashboard/dashboard/periodic-summary-card';
import type { PeriodicFinancialSummaryState } from '@/app/types/periodic-financial-summary';

const state: PeriodicFinancialSummaryState = {
  enabled: true,
  frequency: 'WEEKLY',
  summary: {
    id: 'weekly-1',
    generatedAt: '2026-10-05T06:00:00.000Z',
    content: {
      contentVersion: 2,
      frequency: 'WEEKLY',
      currency: 'BRL',
      period: {
        start: { year: 2026, month: 9, day: 28 },
        end: { year: 2026, month: 10, day: 4 },
      },
      totals: { income: 123_456, expense: 45_678, balance: 77_778 },
      topCategories: [{ categoryId: 'food', categoryName: 'Alimentação', amount: 45_678 }],
    },
  },
};

const render = (data: PeriodicFinancialSummaryState, showValues = true) =>
  renderToStaticMarkup(
    <PeriodicSummaryCard state={data} loading={false} error="" showValues={showValues} />,
  );

describe('PeriodicSummaryCard', () => {
  it('renders only closed-week snapshot with provenance, never stale future numbers', () => {
    const html = render(state);
    expect(html).toContain('Resumo semanal');
    expect(html).toContain('Snapshot gerado em');
    expect(html).not.toContain('Próx. 7 dias');
    expect(html).not.toContain('Disponível para gastar');
  });

  it('masks monetary values when showValues is false', () => {
    const html = render(state, false);
    expect(html).toContain('••••');
    expect(html).not.toContain('1.234,56');
    expect(html).not.toContain('456,78');
  });

  it('keeps the card visible with a retry action on error, never as absence', () => {
    const html = renderToStaticMarkup(
      <PeriodicSummaryCard state={null} loading={false} error="Falhou" showValues onRetry={() => {}} />,
    );
    expect(html).toContain('Falhou');
    expect(html).toContain('Tentar novamente');
  });

  it('states that later corrections do not change the snapshot', () => {
    expect(render(state)).toContain('correções posteriores não alteram');
  });

  it('flags legacy v1 snapshots as generated with the previous rule', () => {
    const legacy = {
      ...state,
      summary: state.summary && {
        ...state.summary,
        content: { ...state.summary.content, contentVersion: 1 },
      },
    };
    expect(render(legacy)).toContain('regra anterior');
    expect(render(state)).not.toContain('regra anterior');
  });

  it('hides the card after opt-out', () => {
    expect(render({ ...state, enabled: false, summary: null })).toBe('');
  });
});
