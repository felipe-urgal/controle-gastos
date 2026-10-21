'use client';

import Link from 'next/link';
import { DashboardHome } from '@/app/types/dashboard';
import { FaArrowRight, FaArrowUp, FaBarcode, FaExchangeAlt, FaPlus } from 'react-icons/fa';
import { dashboardLogicalDateLabel, displayMoney } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';

export function CurrentCashCard({
  accounts,
  total,
  showValues,
  currency,
  asOf,
}: {
  accounts: DashboardHome['current']['cash']['accounts'];
  total: number;
  showValues: boolean;
  currency: string;
  asOf: DashboardHome['scope']['currentAsOf'];
}) {
  return (
    <article
      className="relative min-h-[278px] overflow-hidden rounded-[14px] border border-[var(--orbit-primary)]/55 p-5"
      style={{
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--orbit-primary) 32%, var(--surface)) 0%, color-mix(in srgb, var(--orbit-primary) 14%, var(--surface)) 48%, var(--surface) 100%)',
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
        Hoje · {dashboardLogicalDateLabel(asOf)}
      </p>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-bold leading-tight">Saldo realizado em contas correntes</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Investimentos ficam no patrimônio e não entram como dinheiro disponível.
          </p>
        </div>
        <Link
          href="/contas"
          className="hidden min-h-11 shrink-0 items-center gap-3 rounded-[10px] border border-[var(--orbit-primary)]/60 bg-[var(--orbit-primary-subtle)] px-4 text-sm font-semibold sm:inline-flex"
        >
          Ver contas <FaArrowRight className="text-[var(--orbit-primary)]" aria-hidden="true" />
        </Link>
      </div>

      <strong className={`mt-5 block text-[36px] font-extrabold leading-none tracking-tight ${total < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}>
        {displayMoney(total, showValues, currency)}
      </strong>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        {accounts.length === 0
          ? 'Nenhuma conta corrente ativa nesta moeda.'
          : `${accounts.length} ${accounts.length === 1 ? 'conta corrente ativa' : 'contas correntes ativas'}`}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Link href="/transacoes/nova?type=expense" className="flex min-h-[68px] flex-col items-center justify-center gap-2 rounded-[9px] bg-[var(--orbit-primary)] px-2 text-center text-xs font-bold text-[var(--orbit-on-primary)] shadow-sm">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white/90 text-[var(--orbit-primary)]"><FaPlus size={10} aria-hidden="true" /></span> Nova transação
        </Link>
        <Link href="/transacoes/nova?mode=transfer" className="flex min-h-[68px] flex-col items-center justify-center gap-2 rounded-[9px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-center text-xs font-semibold">
          <FaExchangeAlt aria-hidden="true" /> Transferir
        </Link>
        <Link href="/transacoes/nova?type=expense" className="flex min-h-[68px] flex-col items-center justify-center gap-2 rounded-[9px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-center text-xs font-semibold">
          <FaBarcode aria-hidden="true" /> Pagar conta
        </Link>
        <Link href="/transacoes/nova?type=income" className="flex min-h-[68px] flex-col items-center justify-center gap-2 rounded-[9px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-center text-xs font-semibold">
          <FaArrowUp aria-hidden="true" /> Adicionar dinheiro
        </Link>
      </div>
    </article>
  );
}
