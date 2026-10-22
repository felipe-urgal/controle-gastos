import { describe, expect, it } from 'vitest';

import {
  formPreview,
  groupTemplates,
  missingFields,
  templateTags,
} from '@/app/components/pages/transaction-templates/transaction-templates-model';
import type { TransactionTemplateDTO } from '@/app/types/transaction-template';

const money = (cents: number) => 'R$ ' + (cents / 100).toFixed(2).replace('.', ',');

function template(partial: Partial<TransactionTemplateDTO> & { id: string }): TransactionTemplateDTO {
  return {
    name: partial.id,
    type: 'EXPENSE',
    description: '',
    amount: null,
    isFavorite: false,
    account: null,
    category: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...partial,
  };
}

describe('transaction-templates-model', () => {
  it('separa o que o modelo preenche do que fica para a hora de usar e destaca inativos', () => {
    expect(templateTags(template({ id: 'a' }))).toEqual([
      { label: 'Conta ao usar', tone: 'todo' },
      { label: 'Categoria ao usar', tone: 'todo' },
    ]);
    expect(
      templateTags(
        template({
          id: 'b',
          account: { id: '1', name: 'Nubank', currency: 'BRL', isActive: true },
          category: { id: '2', name: 'Saúde', type: 'EXPENSE', isActive: false },
        }),
      ),
    ).toEqual([
      { label: 'Nubank', tone: 'filled' },
      { label: 'Categoria inativa · escolha outra', tone: 'warn' },
    ]);
  });

  it('agrupa favoritos primeiro sem perder a ordem recebida', () => {
    const groups = groupTemplates([
      template({ id: 'x', isFavorite: true }),
      template({ id: 'y' }),
      template({ id: 'z', isFavorite: true }),
    ]);
    expect(groups.favorites.map((item) => item.id)).toEqual(['x', 'z']);
    expect(groups.others.map((item) => item.id)).toEqual(['y']);
  });

  it('lista o que falta escolher e trata valor zero como ausente', () => {
    expect(missingFields({ amount: null, accountId: null, categoryId: null })).toEqual(['valor', 'conta', 'categoria']);
    expect(missingFields({ amount: 5590, accountId: 'a', categoryId: null })).toEqual(['categoria']);
    expect(missingFields({ amount: 5590, accountId: 'a', categoryId: 'c' })).toEqual([]);
  });

  it('monta o resumo "ao usar, preenche" com o que falta', () => {
    const preview = formPreview({
      form: { name: ' Netflix ', type: 'EXPENSE', amount: 5590, accountId: 'a', categoryId: null },
      accountName: 'Cartão Itaú',
      money,
    });
    expect(preview).toEqual({ summary: 'Despesa · Netflix · R$ 55,90 · Cartão Itaú', missing: 'Falta escolher: categoria' });
    expect(formPreview({ form: { name: '', type: 'INCOME' }, accountName: null, money }).summary).toBe('Receita · Sem nome');
  });
});
