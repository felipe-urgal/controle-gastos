// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TimelineTransactionRow } from '@/app/components/pages/transactions/index/desktop-transactions';
import { MobileTransactionRow } from '@/app/components/pages/transactions/index/mobile-transactions';
import type { TransactionDTO } from '@/app/types/transaction';

const transaction = {
  id: 't1',
  amount: 4590,
  type: 'EXPENSE',
  kind: 'NORMAL',
  reconciliationStatus: 'UNCLEARED',
  description: 'Mercado',
  status: 'COMPLETED',
  year: 2026,
  month: 11,
  day: 3,
  tags: [],
  account: { id: 'acc1', name: 'Nubank', currency: 'BRL', type: 'CREDIT_DEBIT', color: null, icon: null },
  category: { id: 'cat1', name: 'Mercado', type: 'EXPENSE', color: '#000', icon: 'tag' },
} as unknown as TransactionDTO;

afterEach(cleanup);

describe.each([
  ['desktop', TimelineTransactionRow],
  ['mobile', MobileTransactionRow],
])('linha %s no modo de seleção', (_name, Row) => {
  it('é uma caixa de marcação: anuncia o estado, alterna com clique e Espaço e não abre a transação', () => {
    const onToggle = vi.fn();
    render(<Row transaction={transaction} showValues onCompleted={() => undefined} selection={{ active: true, selected: false, selectable: true, onToggle }} />);

    const row = screen.getByRole('checkbox', { name: /Marcar transação Mercado/ });
    expect(row.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(row);
    fireEvent.keyDown(row, { key: ' ' });
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('linha marcada diz "Desmarcar"; linha que não entra no lote fica desabilitada e não alterna', () => {
    const onToggle = vi.fn();
    const { rerender } = render(<Row transaction={transaction} showValues onCompleted={() => undefined} selection={{ active: true, selected: true, selectable: true, onToggle }} />);
    expect(screen.getByRole('checkbox', { name: /Desmarcar transação Mercado/ }).getAttribute('aria-checked')).toBe('true');

    rerender(<Row transaction={transaction} showValues onCompleted={() => undefined} selection={{ active: true, selected: false, selectable: false, onToggle }} />);
    const blocked = screen.getByRole('checkbox');
    expect(blocked.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(blocked);
    fireEvent.keyDown(blocked, { key: ' ' });
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('fora do modo de seleção continua sendo um link para a transação', () => {
    render(<Row transaction={transaction} showValues onCompleted={() => undefined} selection={{ active: false, selected: false, selectable: true, onToggle: () => undefined }} />);
    expect(screen.getByRole('link', { name: /Abrir transação Mercado/ }).getAttribute('href')).toBe('/transacoes/show/t1');
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});
