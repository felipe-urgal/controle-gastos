'use client';

import Link from 'next/link';
import { IconRenderer } from '@/app/components/ui';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { SupportedCurrency } from '@/app/types/financial-summary';
import { NetWorthAccount } from '@/app/types/net-worth';
import { displayMoney, valuationBasisLabel } from '@/app/components/pages/net-worth/net-worth-page/net-worth-helpers';
import { rankAccounts } from '@/app/components/pages/net-worth/net-worth-page/net-worth-model';

export function DistributionCard({
  accounts,
  currency,
  showValues,
}: {
  accounts: NetWorthAccount[];
  currency: SupportedCurrency;
  showValues: boolean;
}) {
  const ranked = rankAccounts(accounts);

  return (
    <article className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-5">
      <div>
        <h2 className="text-lg font-bold text-[var(--foreground)]">
          Onde está o seu dinheiro
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Contas ordenadas pelo valor, com a fatia de cada uma.
        </p>
      </div>

      {accounts.length === 0 ? (
        <p className="mt-4 rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-3 text-sm text-[var(--text-muted)]">
          Nenhum ativo registrado nesta moeda.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-[var(--border)]">
          {ranked.map(({ account, share, barPercent }) => {
            const investment = account.type === 'INVESTMENT';
            const detailHref = investment
              ? '/investimentos'
              : `/contas/show/${account.id}`;

            return (
              <Link
                key={account.id}
                href={detailHref}
                className="grid min-h-[72px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 py-3"
              >
                <span
                  className="grid h-11 w-11 place-items-center rounded-[var(--radius-md)] text-white"
                  style={{ backgroundColor: account.color || 'var(--primary)' }}
                  aria-hidden="true"
                >
                  <IconRenderer
                    iconName={
                      account.icon ||
                      (investment ? 'chart-line' : 'wallet')
                    }
                    size={18}
                  />
                </span>

                <span className="min-w-0">
                  <strong className="block truncate text-sm text-[var(--foreground)]">
                    {account.name}
                  </strong>
                  <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]" role="img" aria-label={`${share.toLocaleString('pt-BR')}% dos ativos`}>
                    <span className={`block h-full rounded-full ${account.balance < 0 ? 'bg-[var(--expense)]' : 'bg-[var(--primary)]'}`} style={{ width: `${barPercent}%` }} />
                  </span>
                  <span className="mt-1.5 block text-xs text-[var(--text-muted)]">
                    {investment
                      ? `Investimento · ${valuationBasisLabel(account.valuationBasis)}`
                      : 'Conta corrente · saldo transacional'}
                    {!account.isActive ? ' · Inativa' : ''}
                  </span>
                  {investment && account.cashBalance !== undefined && (
                    <span className="mt-1 block text-xs leading-relaxed text-[var(--text-muted)]">
                      O valor das posições substitui o saldo transacional
                      {showValues
                        ? ` (${formatCurrency(account.cashBalance, currency)})`
                        : ''};
                      os dois não são somados sem conciliação auditável.
                    </span>
                  )}
                  {investment &&
                    (account.staleMarketPositionCount ?? 0) > 0 && (
                      <span className="mt-1 block text-xs font-semibold text-[var(--warning)]">
                        {account.staleMarketPositionCount}{' '}
                        {account.staleMarketPositionCount === 1
                          ? 'cotação stale'
                          : 'cotações stale'}
                      </span>
                    )}
                </span>

                <span className="text-right">
                  <strong
                    className={
                      account.balance < 0
                        ? 'money block text-sm font-semibold text-[var(--expense)]'
                        : 'money block text-sm font-semibold text-[var(--foreground)]'
                    }
                  >
                    {displayMoney(account.balance, showValues, currency)}
                  </strong>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    {share.toLocaleString('pt-BR')}%
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-4 rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-3 text-xs leading-relaxed text-[var(--text-muted)]">
        Transferências entre suas contas não alteram o total consolidado.
        Em contas de investimento, posições substituem o saldo transacional
        quando existe uma posição calculável. Caixa e posições não são somados
        automaticamente para evitar dupla contagem.
      </div>
    </article>
  );
}
