import { describe, expect, it } from 'vitest';

import {
  badgeLabel,
  NOTIFICATION_TYPE_COPY,
  PREFERENCE_TYPES,
  relativeTimeLabel,
} from '@/app/components/pages/notification/notification-model';

const now = new Date('2026-11-10T15:00:00.000Z');
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

describe('badgeLabel', () => {
  it('mostra o número até 9 e "9+" acima disso', () => {
    expect(badgeLabel(1)).toBe('1');
    expect(badgeLabel(9)).toBe('9');
    expect(badgeLabel(10)).toBe('9+');
    expect(badgeLabel(250)).toBe('9+');
  });
});

describe('relativeTimeLabel', () => {
  it('escolhe a unidade pelo tempo decorrido', () => {
    expect(relativeTimeLabel(ago(10_000), now)).toBe('agora');
    expect(relativeTimeLabel(ago(5 * MINUTE), now)).toBe('há 5 min');
    expect(relativeTimeLabel(ago(3 * HOUR), now)).toBe('há 3 h');
    expect(relativeTimeLabel(ago(30 * HOUR), now)).toBe('ontem');
    expect(relativeTimeLabel(ago(4 * 24 * HOUR), now)).toBe('há 4 dias');
  });

  it('depois de uma semana mostra a data', () => {
    expect(relativeTimeLabel('2026-10-20T12:00:00.000Z', now)).toBe('20/10');
  });

  it('data no futuro (relógio adiantado) não vira texto negativo', () => {
    expect(relativeTimeLabel(new Date(now.getTime() + HOUR).toISOString(), now)).toBe('agora');
  });
});

describe('textos das preferências', () => {
  it('cobrem só tipos que já têm regra e têm título e descrição', () => {
    expect(PREFERENCE_TYPES).toEqual([
      'CARD_STATEMENT_DUE',
      'COMMITMENT_DUE',
      'INCOME_OVERDUE',
      'BUDGET_LIMIT',
      'FORECAST_NEGATIVE',
    ]);
    for (const type of PREFERENCE_TYPES) {
      expect(NOTIFICATION_TYPE_COPY[type]?.title).toBeTruthy();
      expect(NOTIFICATION_TYPE_COPY[type]?.description).toBeTruthy();
    }
  });
});
