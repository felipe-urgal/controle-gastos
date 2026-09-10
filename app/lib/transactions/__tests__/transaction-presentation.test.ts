import { describe, expect, it } from 'vitest';

import {
  getTransactionContextLabel,
  getTransferCounterpartLabel,
  getTransferDirectionLabel,
  isTransferTransaction,
} from '@/app/lib/transactions/transaction-presentation';

describe('transaction presentation', () => {
  it('descreve a contraparte conforme a direção da transferência', () => {
    const source = {
      kind: 'TRANSFER',
      transferRole: 'SOURCE',
      account: { name: 'Conta principal' },
      counterpartAccount: { name: 'Reserva' },
    };
    const destination = {
      kind: 'TRANSFER',
      transferRole: 'DESTINATION',
      account: { name: 'Reserva' },
      counterpartAccount: { name: 'Conta principal' },
    };

    expect(isTransferTransaction(source)).toBe(true);
    expect(getTransferDirectionLabel(source)).toBe('Transferência enviada');
    expect(getTransferCounterpartLabel(source)).toBe('Para Reserva');
    expect(getTransactionContextLabel(source)).toBe('Para Reserva · Conta principal');

    expect(getTransferDirectionLabel(destination)).toBe('Transferência recebida');
    expect(getTransferCounterpartLabel(destination)).toBe('De Conta principal');
    expect(getTransactionContextLabel(destination)).toBe('De Conta principal · Reserva');
  });

  it('preserva categoria e conta para transações normais', () => {
    const transaction = {
      kind: 'NORMAL',
      account: { name: 'Conta principal' },
      category: { name: 'Mercado' },
    };

    expect(isTransferTransaction(transaction)).toBe(false);
    expect(getTransferDirectionLabel(transaction)).toBeNull();
    expect(getTransferCounterpartLabel(transaction)).toBeNull();
    expect(getTransactionContextLabel(transaction)).toBe('Mercado · Conta principal');
  });

  it('falha de forma legível quando a contraparte não estiver disponível', () => {
    expect(getTransactionContextLabel({
      kind: 'TRANSFER',
      transferRole: 'SOURCE',
      account: { name: 'Conta principal' },
      counterpartAccount: null,
    })).toBe('Para Contraparte indisponível · Conta principal');
  });
});
