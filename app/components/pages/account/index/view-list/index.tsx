'use client';

import { IconRenderer } from '@/app/components/ui';
import { typeConfig } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { ViewProps } from '@/app/lib/interface/accounts.interface';
import { highlightText } from '@/app/lib/string/highlight-text';

export default function ViewList({ account, searchTerm = '' }: ViewProps) {
  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(250px,1.5fr)_minmax(140px,.7fr)_minmax(180px,.9fr)_auto] md:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-white"
          style={{ backgroundColor: account.color || '#64748B' }}
          aria-hidden="true"
        >
          <IconRenderer iconName={account.icon || 'wallet'} size={18} />
        </span>

        <div className="min-w-0">
          <p className="break-words text-base font-semibold text-[var(--foreground)] md:truncate">
            {highlightText(account.name, searchTerm)}
          </p>
          <p className="mt-1 break-words text-sm text-[var(--text-muted)] md:truncate">
            {account.description
              ? highlightText(account.description, searchTerm)
              : 'Sem descrição'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 md:block">
        <span className="text-sm text-[var(--text-subtle)] md:hidden">Tipo</span>
        <span className="text-sm font-medium text-[var(--text-muted)]">
          {typeConfig[account.type].label}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 md:block">
        <span className="text-sm text-[var(--text-subtle)] md:hidden">Status</span>
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-sm font-semibold ${
            account.isActive
              ? 'border-[var(--primary)]/35 bg-[var(--primary-subtle)] text-[var(--income)]'
              : 'border-[var(--border-strong)] bg-[var(--surface-subtle)] text-[var(--text-muted)]'
          }`}
        >
          {account.isActive ? 'Ativa' : 'Inativa'}
        </span>
      </div>

      <div className="flex items-end justify-between gap-3 md:block md:text-right">
        <span className="text-sm text-[var(--text-subtle)] md:hidden">Saldo</span>
        <div className="min-w-0 max-w-full text-right">
          <p className="max-w-full text-xl font-bold tracking-tight text-[var(--foreground)] [overflow-wrap:anywhere] md:whitespace-nowrap">
            {formatCurrency(account.balance, account.currency)}
          </p>
          <p className="mt-0.5 text-sm font-medium text-[var(--text-muted)]">{account.currency}</p>
        </div>
      </div>
    </div>
  );
}
