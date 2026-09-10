import { describe, expect, it } from 'vitest';

import { toAccountDTO } from '@/app/lib/mappers/account.mapper';

describe('toAccountDTO', () => {
  it('expõe a contraparte nas transações recentes de uma conta', () => {
    const account = {
      id: 'account-source',
      name: 'Conta principal',
      type: 'CREDIT_DEBIT',
      balance: 10_000,
      currency: 'BRL',
      isActive: true,
      color: '#111111',
      icon: 'wallet',
      description: null,
      userId: 'user-1',
      createdAt: new Date('2026-09-10T12:00:00.000Z'),
      updatedAt: new Date('2026-09-10T12:00:00.000Z'),
      transactions: [
        {
          id: 'transaction-source',
          userId: 'user-1',
          amount: 2_500,
          type: 'EXPENSE',
          kind: 'TRANSFER',
          transferRole: 'SOURCE',
          category: null,
          transfer: {
            transactions: [
              {
                id: 'transaction-source',
                userId: 'user-1',
                transferRole: 'SOURCE',
                account: { id: 'account-source', name: 'Conta principal' },
              },
              {
                id: 'transaction-destination',
                userId: 'user-1',
                transferRole: 'DESTINATION',
                account: { id: 'account-destination', name: 'Reserva' },
              },
            ],
          },
        },
      ],
    };

    const dto = toAccountDTO(account as any);

    expect(dto.transactions[0]).toMatchObject({
      id: 'transaction-source',
      kind: 'TRANSFER',
      transferRole: 'SOURCE',
      counterpartAccount: {
        id: 'account-destination',
        name: 'Reserva',
      },
    });
    expect(dto.transactions[0].transfer).toBeUndefined();
  });

  it('não expõe contraparte de outro usuário em estado inconsistente', () => {
    const now = new Date('2026-09-10T12:00:00.000Z');
    const dto = toAccountDTO({
      id: 'account-1',
      name: 'Conta principal',
      type: 'CREDIT_DEBIT',
      balance: 10_000,
      currency: 'BRL',
      isActive: true,
      color: '#111111',
      icon: 'wallet',
      description: null,
      userId: 'user-1',
      createdAt: now,
      updatedAt: now,
      transactions: [
        {
          id: 'transaction-source',
          userId: 'user-1',
          kind: 'TRANSFER',
          transferRole: 'SOURCE',
          transfer: {
            transactions: [
              {
                id: 'transaction-destination',
                userId: 'user-2',
                transferRole: 'DESTINATION',
                account: { id: 'secret-account', name: 'Conta externa' },
              },
            ],
          },
        },
      ],
    } as any);

    expect(dto.transactions[0].counterpartAccount).toBeNull();
  });

  it('mantém transação normal sem contraparte inventada', () => {
    const now = new Date('2026-09-10T12:00:00.000Z');
    const dto = toAccountDTO({
      id: 'account-1',
      name: 'Conta principal',
      type: 'CREDIT_DEBIT',
      balance: 10_000,
      currency: 'BRL',
      isActive: true,
      color: '#111111',
      icon: 'wallet',
      description: null,
      userId: 'user-1',
      createdAt: now,
      updatedAt: now,
      transactions: [
        {
          id: 'transaction-normal',
          userId: 'user-1',
          kind: 'NORMAL',
          category: { id: 'category-1', name: 'Mercado' },
          transfer: null,
        },
      ],
    } as any);

    expect(dto.transactions[0]).toMatchObject({
      id: 'transaction-normal',
      kind: 'NORMAL',
      category: { id: 'category-1', name: 'Mercado' },
      counterpartAccount: null,
    });
  });
});
