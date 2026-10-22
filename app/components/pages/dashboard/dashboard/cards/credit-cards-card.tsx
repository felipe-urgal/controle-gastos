'use client';

import Link from 'next/link';
import { IconRenderer } from '@/app/components/ui';
import { MonthlyDashboard } from '@/app/types/dashboard';
import { FaChevronRight, FaCreditCard } from 'react-icons/fa';
import { dashboardLogicalDateLabel, displayMoney } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';

export function CreditCardsCard({
  cards,
  showValues,
  currency,
}: {
  cards: MonthlyDashboard['cards'];
  showValues: boolean;
  currency: string;
}) {
  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-[14px]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <FaCreditCard className="text-[var(--orbit-primary)]" aria-hidden="true" />
            Cartões
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Estado atual de limite e próxima fatura, sem somar crédito ao saldo disponível.
          </p>
        </div>
        <Link href="/contas" className="inline-flex min-h-11 items-center px-2 -mx-2 text-xs font-semibold text-[var(--orbit-primary)]">
          Ver contas
        </Link>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {cards.slice(0, 3).map((card) => {
          const usage =
            card.creditLimit > 0
              ? Math.min(100, Math.round((card.usedLimit / card.creditLimit) * 100))
              : 0;

          return (
            <Link
              key={card.id}
              href={`/contas/show/${card.id}`}
              className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-raised)] p-3 transition-colors hover:bg-[var(--surface-hover)]"
            >
              <div className="flex items-center gap-3">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-white"
                  style={{ backgroundColor: card.color }}
                  aria-hidden="true"
                >
                  <IconRenderer iconName={card.icon || 'credit-card'} size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[var(--foreground)]">{card.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {usage}% do limite em uso
                  </p>
                </div>
                <FaChevronRight className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[var(--text-muted)]">Disponível</p>
                  <strong className="mt-1 block text-[var(--foreground)]">
                    <span className="money">{displayMoney(card.availableLimit, showValues, currency)}</span>
                  </strong>
                </div>
                <div>
                  <p className="text-[var(--text-muted)]">Próxima fatura</p>
                  <strong className="mt-1 block text-[var(--foreground)]">
                    {card.nextStatement
                      ? <span className="money">{displayMoney(card.nextStatement.amount, showValues, currency)}</span>
                      : 'Sem fatura'}
                  </strong>
                </div>
              </div>

              {card.nextStatement && (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Vence {dashboardLogicalDateLabel(card.nextStatement.dueDate)}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </article>
  );
}
