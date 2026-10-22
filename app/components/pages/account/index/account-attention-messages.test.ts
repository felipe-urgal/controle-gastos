import { describe, expect, it } from 'vitest';

import { accountAttentionMessage } from '@/app/components/pages/account/index/account-attention-messages';
import type { AccountAttentionItem } from '@/app/types/account';

const base: AccountAttentionItem = {
  kind: 'CARD_DUE_SOON',
  accountId: 'a1',
  name: 'Nubank',
  currency: 'BRL',
  amount: 124_000,
  dueDate: { year: 2026, month: 10, day: 24 },
  daysUntilDue: 2,
  limitUsedPercent: null,
};

describe('accountAttentionMessage', () => {
  it('descreve fatura que vence em poucos dias como urgente', () => {
    const message = accountAttentionMessage(base, true);

    expect(message.title).toBe('Fatura Nubank vence em 2 dias');
    expect(message.detail).toContain('dia 24/10');
    expect(message.tone).toBe('urgent');
  });

  it('usa "hoje" e "amanhã" e deixa 4 a 7 dias como alerta comum', () => {
    expect(accountAttentionMessage({ ...base, daysUntilDue: 0 }, true).title).toBe('Fatura Nubank vence hoje');
    expect(accountAttentionMessage({ ...base, daysUntilDue: 1 }, true).title).toBe('Fatura Nubank vence amanhã');
    expect(accountAttentionMessage({ ...base, daysUntilDue: 6 }, true).tone).toBe('warning');
  });

  it('informa quantos dias a fatura vencida está atrasada', () => {
    const message = accountAttentionMessage({ ...base, kind: 'CARD_OVERDUE', daysUntilDue: -3 }, true);

    expect(message).toMatchObject({ title: 'Fatura Nubank venceu há 3 dias', action: 'Pagar', tone: 'urgent' });
    expect(accountAttentionMessage({ ...base, kind: 'CARD_OVERDUE', daysUntilDue: -1 }, true).title).toBe('Fatura Nubank venceu há 1 dia');
  });

  it('descreve saldo negativo e cartão perto do limite', () => {
    expect(accountAttentionMessage({ ...base, kind: 'NEGATIVE_BALANCE', name: 'Carteira', amount: -4_500, dueDate: null, daysUntilDue: null }, true).title).toBe('Carteira está com saldo negativo');
    const limit = accountAttentionMessage({ ...base, kind: 'CARD_NEAR_LIMIT', dueDate: null, daysUntilDue: null, limitUsedPercent: 92 }, true);
    expect(limit.title).toBe('Nubank usou 92% do limite');
  });

  it('oculta os valores quando o modo de ocultar está ligado', () => {
    const message = accountAttentionMessage(base, false);

    expect(message.detail).toBe('•••• · dia 24/10');
  });
});
