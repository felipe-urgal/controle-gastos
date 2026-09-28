import { describe, expect, it } from 'vitest';

import {
  assertImportRulePatternIsSafe,
  findImportRuleRelationship,
  normalizeImportRulePattern,
} from '@/app/lib/import-rules/import-rule-guards';
import type { ImportRuleInput, ImportRuleModel } from '@/app/types/import-rule';

const baseInput: ImportRuleInput = {
  name: 'Mercado',
  isActive: true,
  priority: 10,
  accountId: '11111111-1111-4111-8111-111111111111',
  transactionType: 'EXPENSE',
  descriptionOperator: 'EQUALS',
  descriptionPattern: 'Mercado Central',
  minAmountCents: null,
  maxAmountCents: null,
  categoryId: '22222222-2222-4222-8222-222222222222',
  normalizedDescription: null,
};

function model(patch: Partial<ImportRuleModel> = {}): ImportRuleModel {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    ...baseInput,
    ...patch,
  };
}

describe('import rule guards', () => {
  it('normaliza matcher sem regex ou transformação opaca', () => {
    expect(normalizeImportRulePattern('  Mercado   CENTRAL ')).toBe(
      'mercado central',
    );
  });

  it('permite igualdade curta, mas bloqueia contains/starts-with amplos demais', () => {
    expect(() => assertImportRulePatternIsSafe('EQUALS', 'TV')).not.toThrow();
    expect(() => assertImportRulePatternIsSafe('CONTAINS', 'a')).toThrow(
      /pelo menos 3 caracteres/,
    );
    expect(() => assertImportRulePatternIsSafe('STARTS_WITH', 'ab')).toThrow(
      /pelo menos 3 caracteres/,
    );
  });

  it('identifica regra equivalente ignorando caixa e espaços do padrão', () => {
    expect(
      findImportRuleRelationship(
        { ...baseInput, descriptionPattern: ' mercado  central ' },
        [model()],
      ),
    ).toMatchObject({ kind: 'EQUIVALENT' });
  });

  it('identifica conflito quando o mesmo matcher aponta para outro resultado', () => {
    expect(
      findImportRuleRelationship(
        { ...baseInput, categoryId: '44444444-4444-4444-8444-444444444444' },
        [model()],
      ),
    ).toMatchObject({ kind: 'CONFLICT' });
  });

  it('ignora a própria regra durante edição', () => {
    const rule = model();
    expect(
      findImportRuleRelationship(baseInput, [rule], {
        excludeRuleId: rule.id,
      }),
    ).toEqual({ kind: 'NONE' });
  });
});
