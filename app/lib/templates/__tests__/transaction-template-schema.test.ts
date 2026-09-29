import { describe, expect, it } from 'vitest';
import { transactionTemplateCreateSchema } from '@/app/lib/templates/transaction-template-schema';
describe('transaction template schema', () => {
  it('accepts optional template fields', () => {
    expect(transactionTemplateCreateSchema.parse({ name: 'Almoço', type: 'EXPENSE' })).toMatchObject({
      name: 'Almoço', type: 'EXPENSE', description: '', status: 'COMPLETED', isFavorite: false, position: 0,
    });
  });
  it('rejects non-positive fixed amounts', () => {
    expect(() => transactionTemplateCreateSchema.parse({ name: 'Inválido', type: 'EXPENSE', amount: 0 })).toThrow();
  });
});
