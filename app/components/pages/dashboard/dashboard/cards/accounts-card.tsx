'use client';

import { SectionMessage } from '@/app/components/pages/dashboard/dashboard/cards/section-message';
import Link from 'next/link';
import { IconRenderer } from '@/app/components/ui';
import { DashboardHome } from '@/app/types/dashboard';
import { FaChevronRight, FaEye } from 'react-icons/fa';
import { displayMoney } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';

export function AccountsCard({
  accounts,
  showValues,
  currency,
}: {
  accounts: DashboardHome['current']['cash']['accounts'];
  showValues: boolean;
  currency: string;
}) {
  return (
    <article className="min-h-[278px] rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-[14px]">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
        Contas correntes <FaEye aria-hidden="true" />
      </div>
      <h2 className="mt-2 text-lg font-bold">Detalhamento do saldo atual</h2>
      <p className="mt-1 text-xs text-[var(--text-muted)]">Somente contas de caixa em {currency}; investimentos ficam no patrimônio.</p>

      <div className="mt-3 divide-y divide-[var(--border)] border-t border-[var(--border)]">
        {accounts.length === 0 ? (
          <SectionMessage tone="empty">Nenhuma conta ativa nesta moeda.</SectionMessage>
        ) : (
          accounts.slice(0, 4).map((account) => (
            <Link key={account.id} href="/contas" className="flex min-h-11 items-center justify-between gap-3 py-1">
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-[7px] text-white"
                  style={{ backgroundColor: account.color }}
                >
                  <IconRenderer iconName={account.icon || 'wallet'} size={13} />
                </span>
                <span className="truncate text-xs font-semibold">{account.name}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs font-semibold">
                {displayMoney(account.balance, showValues, account.currency)}
                <FaChevronRight className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
              </span>
            </Link>
          ))
        )}
      </div>
    </article>
  );
}
