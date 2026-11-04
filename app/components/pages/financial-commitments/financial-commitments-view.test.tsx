// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import FinancialCommitmentsView from '@/app/components/pages/financial-commitments/financial-commitments-view';
import { canCompleteCommitment, completeActionLabel } from '@/app/components/pages/financial-commitments/financial-commitments-model';
import type { FinancialCommitment, FinancialCommitmentsData } from '@/app/types/financial-commitment';

const asOf = { year: 2026, month: 11, day: 4 };

function commitment(partial: Partial<FinancialCommitment> & { id: string }): FinancialCommitment {
  return {
    type: 'PENDING',
    direction: 'PAYABLE',
    state: 'UPCOMING',
    title: partial.id,
    amount: 15000,
    currency: 'BRL',
    date: { year: 2026, month: 11, day: 10 },
    href: `/transacoes/show/${partial.id}`,
    accountName: 'Itaú',
    source: { kind: 'TRANSACTION', id: partial.id },
    ...partial,
  };
}

function dataWith(items: FinancialCommitment[]): FinancialCommitmentsData {
  const payable = items.filter((item) => item.direction === 'PAYABLE');
  const receivable = items.filter((item) => item.direction === 'RECEIVABLE');
  return {
    asOf,
    through: { year: 2026, month: 12, day: 4 },
    currency: 'BRL',
    days: 30,
    items,
    totals: {
      payable: { count: payable.length, amount: payable.reduce((sum, item) => sum + (item.amount ?? 0), 0) },
      receivable: { count: receivable.length, amount: receivable.reduce((sum, item) => sum + (item.amount ?? 0), 0) },
      milestoneCount: 0,
      overdueCount: 0,
    },
  };
}

class FakeIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  })) as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('canCompleteCommitment', () => {
  it('só lançamento pendente de verdade pode ser concluído', () => {
    expect(canCompleteCommitment(commitment({ id: 'a' }))).toBe(true);
    expect(canCompleteCommitment(commitment({ id: 'b', type: 'INSTALLMENT' }))).toBe(true);
    expect(canCompleteCommitment(commitment({ id: 'c', type: 'CARD_STATEMENT', source: { kind: 'CARD', id: 'c' } }))).toBe(false);
    expect(canCompleteCommitment(commitment({ id: 'd', type: 'GOAL_DEADLINE', direction: 'MILESTONE', source: { kind: 'GOAL', id: 'd' } }))).toBe(false);
  });

  it('o rótulo segue a direção', () => {
    expect(completeActionLabel(commitment({ id: 'a', direction: 'PAYABLE' }))).toBe('Pago');
    expect(completeActionLabel(commitment({ id: 'b', direction: 'RECEIVABLE' }))).toBe('Recebido');
  });
});

describe('FinancialCommitmentsView — concluir', () => {
  it('conclui o lançamento e confirma na tela', async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined);
    render(
      <FinancialCommitmentsView
        data={dataWith([commitment({ id: 'Aluguel' }), commitment({ id: 'Freela', direction: 'RECEIVABLE' })])}
        showValues
        onComplete={onComplete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Marcar “Aluguel” como pago' }));

    await screen.findByText('“Aluguel” marcado como pago.');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ id: 'Aluguel' }));
    expect(screen.getByRole('button', { name: 'Marcar “Freela” como recebido' })).toBeTruthy();
  });

  it('mostra o motivo quando a API recusa e deixa tentar de novo', async () => {
    const onComplete = vi.fn().mockRejectedValueOnce(new Error('Transação pendente não encontrada')).mockResolvedValueOnce(undefined);
    render(<FinancialCommitmentsView data={dataWith([commitment({ id: 'Aluguel' })])} showValues onComplete={onComplete} />);

    const button = screen.getByRole('button', { name: 'Marcar “Aluguel” como pago' });
    fireEvent.click(button);
    expect(await screen.findByText('Transação pendente não encontrada')).toBeTruthy();

    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);
    await screen.findByText('“Aluguel” marcado como pago.');
  });

  it('não oferece concluir para fatura nem meta, nem sem a ação', () => {
    const items = [
      commitment({ id: 'Fatura', type: 'CARD_STATEMENT', source: { kind: 'CARD', id: 'f' } }),
      commitment({ id: 'Meta', type: 'GOAL_DEADLINE', direction: 'MILESTONE', amount: null, source: { kind: 'GOAL', id: 'm' } }),
    ];
    const { unmount } = render(<FinancialCommitmentsView data={dataWith(items)} showValues onComplete={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Marcar/ })).toBeNull();
    unmount();

    render(<FinancialCommitmentsView data={dataWith([commitment({ id: 'Aluguel' })])} showValues />);
    expect(screen.queryByRole('button', { name: /Marcar/ })).toBeNull();
  });
});
