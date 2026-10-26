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
  it('trata fatura que vence em poucos dias como urgente e a mais distante como alerta comum', () => {
    expect(accountAttentionMessage(base, true).tone).toBe('urgent');
    expect(accountAttentionMessage({ ...base, daysUntilDue: 6 }, true).tone).toBe('warning');
  });

  it('fatura vencida é urgente e oferece pagar', () => {
    const message = accountAttentionMessage({ ...base, kind: 'CARD_OVERDUE', daysUntilDue: -3 }, true);

    expect(message).toMatchObject({ action: 'Pagar', tone: 'urgent' });
  });

  it('oculta os valores quando o modo de ocultar está ligado', () => {
    expect(accountAttentionMessage(base, true).detail).not.toContain('••••');
    expect(accountAttentionMessage(base, false).detail).toContain('••••');
  });
});
