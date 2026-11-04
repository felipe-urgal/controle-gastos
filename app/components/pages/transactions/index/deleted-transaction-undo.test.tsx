// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createIdempotent } = vi.hoisted(() => ({ createIdempotent: vi.fn() }));
vi.mock('@/app/services/transaction-service', () => ({ transactionService: { createIdempotent } }));

import { DeletedTransactionUndo } from '@/app/components/pages/transactions/index/deleted-transaction-undo';
import { TRANSACTIONS_CHANGED_EVENT } from '@/app/lib/transactions/transaction-events';
import { rememberDeletedTransaction } from '@/app/lib/transactions/undo-delete';
import type { TransactionDTO } from '@/app/types/transaction';

const transaction = {
  id: 't1',
  amount: 4590,
  type: 'EXPENSE',
  kind: 'NORMAL',
  description: 'Mercado',
  status: 'COMPLETED',
  year: 2026,
  month: 11,
  day: 3,
  account: { id: 'acc1', name: 'Nubank', currency: 'BRL', type: 'CREDIT_DEBIT', color: null, icon: null },
  category: { id: 'cat1', name: 'Mercado', type: 'EXPENSE', color: '#000', icon: 'x' },
} as unknown as TransactionDTO;

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('DeletedTransactionUndo', () => {
  it('não mostra nada quando nada foi excluído', async () => {
    const { container } = render(<DeletedTransactionUndo />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(container.textContent).toBe('');
  });

  it('oferece desfazer, recria com os mesmos dados, avisa a lista e confirma', async () => {
    createIdempotent.mockResolvedValue({ data: { id: 'novo' } });
    const changed = vi.fn();
    window.addEventListener(TRANSACTIONS_CHANGED_EVENT, changed);
    rememberDeletedTransaction(transaction);

    render(<DeletedTransactionUndo />);
    fireEvent.click(await screen.findByRole('button', { name: 'Desfazer' }));

    await screen.findByText('“Mercado” foi restaurada.');
    expect(createIdempotent).toHaveBeenCalledTimes(1);
    expect(createIdempotent).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 4590, description: 'Mercado', accountId: 'acc1', categoryId: 'cat1', year: 2026, month: 11, day: 3 }),
      expect.any(String),
    );
    expect(changed).toHaveBeenCalledTimes(1);
    window.removeEventListener(TRANSACTIONS_CHANGED_EVENT, changed);
  });

  it('mostra o motivo se não conseguir desfazer', async () => {
    createIdempotent.mockRejectedValue(new Error('Conta inativa'));
    rememberDeletedTransaction(transaction);

    render(<DeletedTransactionUndo />);
    fireEvent.click(await screen.findByRole('button', { name: 'Desfazer' }));

    expect(await screen.findByText('Conta inativa')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Desfazer' })).toBeNull();
  });

  it('some depois da janela de 10 segundos e o aviso não volta ao recarregar', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    rememberDeletedTransaction(transaction);

    const first = render(<DeletedTransactionUndo />);
    await screen.findByRole('button', { name: 'Desfazer' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_500);
    });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Desfazer' })).toBeNull());

    first.unmount();
    const second = render(<DeletedTransactionUndo />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(second.container.textContent).toBe('');
  });
});
