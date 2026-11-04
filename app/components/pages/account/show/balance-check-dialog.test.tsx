// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  balancePreview: vi.fn(),
  categories: vi.fn(),
  createIdempotent: vi.fn(),
}));

vi.mock('@/app/services/account-service', () => ({ accountService: { balancePreview: mocks.balancePreview } }));
vi.mock('@/app/services/category-service', () => ({ categoryService: { getAll: mocks.categories } }));
vi.mock('@/app/services/transaction-service', () => ({ transactionService: { createIdempotent: mocks.createIdempotent } }));

import BalanceCheckDialog from '@/app/components/pages/account/show/balance-check-dialog';

const account = { id: 'acc1', name: 'Itaú', currency: 'BRL' };

function renderDialog() {
  const onClose = vi.fn();
  const onAdjusted = vi.fn();
  render(<BalanceCheckDialog account={account} onClose={onClose} onAdjusted={onAdjusted} />);
  return { onClose, onAdjusted };
}

function typeStatement(value: string) {
  fireEvent.change(screen.getByLabelText('Saldo no extrato'), { target: { value } });
}

beforeEach(() => {
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
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } });
  mocks.categories.mockResolvedValue({
    data: {
      items: [
        { id: 'c-in', name: 'Outras receitas', type: 'INCOME', isActive: true },
        { id: 'c-out', name: 'Outras despesas', type: 'EXPENSE', isActive: true },
        { id: 'c-off', name: 'Antiga', type: 'EXPENSE', isActive: false },
      ],
    },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('BalanceCheckDialog', () => {
  it('pede um saldo válido antes de consultar', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }));

    expect(await screen.findByText(/Informe o saldo do extrato/)).toBeTruthy();
    expect(mocks.balancePreview).not.toHaveBeenCalled();
  });

  it('recusa data futura', async () => {
    renderDialog();
    typeStatement('100,00');
    fireEvent.change(screen.getByLabelText('Data do extrato'), { target: { value: '2100-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }));

    expect(await screen.findByText(/não pode ser futura/)).toBeTruthy();
    expect(mocks.balancePreview).not.toHaveBeenCalled();
  });

  it('quando bate, diz que confere e não oferece ajuste', async () => {
    mocks.balancePreview.mockResolvedValue({ data: { realizedBalance: 10_000 } });
    renderDialog();
    typeStatement('100,00');
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }));

    expect(await screen.findByText('O saldo confere com o extrato.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Criar ajuste/ })).toBeNull();
    expect(mocks.balancePreview).toHaveBeenCalledWith('acc1', expect.objectContaining({ year: expect.any(Number) }), 10_000);
  });

  it('com diferença, mostra o valor e só habilita o ajuste depois de escolher a categoria', async () => {
    mocks.balancePreview.mockResolvedValue({ data: { realizedBalance: 7_500 } });
    renderDialog();
    typeStatement('100,00');
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }));

    const create = await screen.findByRole('button', { name: /Criar ajuste de/ });
    expect(create.textContent).toMatch(/25,00/);
    expect((create as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/falta registrar alguma entrada/)).toBeTruthy();
    expect(mocks.createIdempotent).not.toHaveBeenCalled();
  });

  it('mostra o erro da consulta e volta ao formulário', async () => {
    mocks.balancePreview.mockRejectedValue(new Error('Conta não encontrada'));
    renderDialog();
    typeStatement('100,00');
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }));

    expect(await screen.findByText('Conta não encontrada')).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Conferir' })).toBeTruthy());
  });
});
