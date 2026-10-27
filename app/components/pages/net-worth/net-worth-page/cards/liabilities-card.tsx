'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { RiseArticle } from '@/app/components/ui/motion';

import Link from 'next/link';
import { SupportedCurrency } from '@/app/types/financial-summary';
import { NetWorthDebt } from '@/app/types/net-worth';
import { displayMoney } from '@/app/components/pages/net-worth/net-worth-page/net-worth-helpers';

const MotionLink = motion.create(Link);

export function LiabilitiesCard({
  debts,
  currency,
  showValues,
}: {
  debts: NetWorthDebt[];
  currency: SupportedCurrency;
  showValues: boolean;
}) {
  const reduce = useReducedMotion();

  return (
    <RiseArticle className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Dívidas</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Dívidas com saldo devedor nesta moeda.
          </p>
        </div>
        <Link href="/dividas" className="inline-flex min-h-11 shrink-0 items-center px-1 text-sm font-bold text-[var(--primary)]">
          Gerenciar
        </Link>
      </div>

      {debts.length === 0 ? (
        <p className="mt-4 rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-3 text-sm text-[var(--text-muted)]">
          Nenhum passivo com saldo devedor.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-[var(--border)]">
          {debts.map((debt, index) => (
            <MotionLink
              key={debt.id}
              href={`/dividas#debt-${encodeURIComponent(debt.id)}`}
              // As dívidas "pesam": caem de leve e assentam; no hover o saldo se destaca.
              initial={reduce ? false : { opacity: 0, y: -22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ type: 'spring', stiffness: 260, damping: 13, delay: Math.min(index, 8) * 0.08 }}
              whileHover="hover"
              whileTap={{ scale: 0.98 }}
              className="flex min-h-[64px] items-center justify-between gap-4 py-2.5"
            >
              <span className="min-w-0">
                <strong className="block truncate text-sm text-[var(--foreground)]">{debt.name}</strong>
                <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
                  {debt.institution || 'Passivo manual'}
                </span>
              </span>
              <motion.strong className="money shrink-0 origin-right text-sm font-semibold text-[var(--expense)]" variants={{ hover: { scale: 1.1, transition: { type: 'spring', stiffness: 400, damping: 16 } } }}>
                {showValues ? '−' : ''}{displayMoney(debt.balance, showValues, currency)}
              </motion.strong>
            </MotionLink>
          ))}
        </div>
      )}
    </RiseArticle>
  );
}
