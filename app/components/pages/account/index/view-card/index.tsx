'use client';

import { IconRenderer } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { typeConfig } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { ViewProps } from '@/app/lib/interface/accounts.interface';
import { highlightText } from '@/app/lib/string/highlight-text';

export default function ViewCard({ account, searchTerm = '' }: ViewProps) {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const balance = showValues ? formatCurrency(account.balance, account.currency) : '••••';

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-white"
            style={{ backgroundColor: account.color || '#64748B' }}
            aria-hidden="true"
          >
            <IconRenderer iconName={account.icon || 'wallet'} size={18} />
          </span>

          <div className="min-w-0">
            <h3 className="break-words text-base font-semibold text-[var(--foreground)]">
              {highlightText(account.name, searchTerm)}
            </h3>
            <p className="mt-1 text-sm font-medium text-[var(--text-muted)]">
              {typeConfig[account.type].label}
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-sm font-semibold ${
            account.isActive
              ? 'border-[var(--income)]/35 bg-[var(--surface-subtle)] text-[var(--income)]'
              : 'border-[var(--border-strong)] bg-[var(--surface-subtle)] text-[var(--text-muted)]'
          }`}
        >
          {account.isActive ? 'Ativa' : 'Inativa'}
        </span>
      </div>

      <p className="min-h-10 line-clamp-2 text-sm leading-relaxed text-[var(--text-muted)]">
        {account.description
          ? highlightText(account.description, searchTerm)
          : 'Sem descrição cadastrada.'}
      </p>

      <div className="border-t border-[var(--border)] pt-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-[var(--text-muted)]">Saldo atual</span>
          <span className="text-sm font-semibold text-[var(--text-muted)]">{account.currency}</span>
        </div>
        <p
          className={`mt-2 max-w-full break-words text-2xl font-bold tracking-tight [overflow-wrap:anywhere] ${
            account.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'
          }`}
        >
          {balance}
        </p>
        <p className="mt-2 text-sm text-[var(--text-subtle)]">
          Criada em {new Date(account.createdAt).toLocaleDateString('pt-BR')}
        </p>
      </div>
    </div>
  );
}
