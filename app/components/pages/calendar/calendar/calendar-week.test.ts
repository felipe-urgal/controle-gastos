import { describe, expect, it } from 'vitest';

import {
  addDays,
  canRescheduleEvent,
  rescheduleBody,
  startOfWeek,
  weekDates,
} from '@/app/components/pages/calendar/calendar/calendar-week';

describe('semana', () => {
  it('começa no domingo e tem sete dias, atravessando a virada de mês e de ano', () => {
    // 30/12/2026 é quarta-feira.
    const days = weekDates(new Date(2026, 11, 30));
    expect(days.map((day) => day.getDay())).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(days[0]).toEqual(new Date(2026, 11, 27));
    expect(days[6]).toEqual(new Date(2027, 0, 2));
    expect(startOfWeek(new Date(2026, 10, 1))).toEqual(new Date(2026, 10, 1));
    expect(addDays(new Date(2026, 1, 28), 1)).toEqual(new Date(2026, 2, 1));
    expect(addDays(new Date(2026, 2, 1), -7)).toEqual(new Date(2026, 1, 22));
  });
});

describe('reagendar', () => {
  it('só lançamento normal pendente pode mudar de data', () => {
    expect(canRescheduleEvent({ sourceKind: 'TRANSACTION', status: 'PENDING' })).toBe(true);
    expect(canRescheduleEvent({ sourceKind: 'TRANSACTION', status: 'COMPLETED' })).toBe(false);
    expect(canRescheduleEvent({ sourceKind: 'TRANSACTION', status: 'CANCELLED' })).toBe(false);
    expect(canRescheduleEvent({ sourceKind: 'TRANSFER', status: 'PENDING' })).toBe(false);
    expect(canRescheduleEvent({ sourceKind: 'CARD_STATEMENT', status: 'PENDING' })).toBe(false);
    expect(canRescheduleEvent({ sourceKind: 'DEBT_INSTALLMENT', status: null })).toBe(false);
  });

  it('monta a data nova e ignora soltar no mesmo dia', () => {
    const event = { date: { year: 2026, month: 11, day: 10 } };
    expect(rescheduleBody(event, new Date(2026, 11, 3))).toEqual({ year: 2026, month: 12, day: 3 });
    expect(rescheduleBody(event, new Date(2026, 10, 10))).toBeNull();
  });
});
