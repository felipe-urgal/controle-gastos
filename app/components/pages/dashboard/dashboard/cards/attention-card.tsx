'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { reducedTransition } from '@/app/components/pages/dashboard/dashboard/cards/card-motion';
import Link from 'next/link';
import { MoneyText } from '@/app/components/ui';
import { FaCheckCircle, FaChevronRight, FaExclamationCircle, FaInfoCircle } from 'react-icons/fa';

import type { AttentionItem, AttentionTone } from '@/app/components/pages/dashboard/dashboard/dashboard-attention';

const toneStyles: Record<AttentionTone, { box: string; Icon: typeof FaInfoCircle }> = {
  urgent: { box: 'bg-[var(--danger-subtle)] text-[var(--expense)]', Icon: FaExclamationCircle },
  warning: { box: 'bg-[var(--warning-subtle)] text-[var(--warning)]', Icon: FaExclamationCircle },
  info: { box: 'bg-[var(--primary-subtle)] text-[var(--primary)]', Icon: FaInfoCircle },
};

export function AttentionCard({
  items,
  loading,
  insightsError,
}: {
  items: AttentionItem[];
  loading: boolean;
  /** Os insights são uma seção independente: a falha dela não esconde os demais itens. */
  insightsError: string;
}) {
  const reduce = useReducedMotion();

  return (
    <section
      className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-[14px] sm:p-5"
      aria-labelledby="dashboard-attention-title"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="dashboard-attention-title" className="text-lg font-bold">
          O que fazer agora
        </h2>
        {items.length > 0 && (
          <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--text-muted)]">
            {items.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-3 space-y-2" role="status" aria-label="Carregando pontos de atenção">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-14 animate-pulse rounded-[var(--radius-md)] bg-[var(--skeleton)]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] px-3 py-3 text-sm text-[var(--text-muted)]">
          <FaCheckCircle className="shrink-0 text-[var(--income)]" aria-hidden="true" />
          Nada pendente por aqui. Faturas, orçamentos e categorias estão em dia.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item, index) => {
            const { box, Icon } = toneStyles[item.tone];
            const urgent = item.tone === 'urgent';
            const content = (
              <>
                <span className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-md)] ${box}`}>
                  {urgent && !reduce && (
                    <motion.span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-[var(--radius-md)] bg-[var(--expense)]"
                      initial={{ scale: 1, opacity: 0.35 }}
                      animate={{ scale: 1.55, opacity: 0 }}
                      transition={reducedTransition(reduce, { duration: 1.6, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.8 })}
                    />
                  )}
                  <motion.span
                    className="relative grid place-items-center"
                    animate={urgent && !reduce ? { rotate: [0, -14, 12, -8, 0] } : undefined}
                    transition={reducedTransition(reduce, { duration: 0.6, delay: 0.5 + index * 0.1 })}
                  >
                    <Icon aria-hidden="true" />
                  </motion.span>
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm leading-snug text-[var(--foreground)]">{item.title}</strong>
                  {item.detail && (
                    <span className="mt-0.5 block text-xs text-[var(--text-muted)]"><MoneyText>{item.detail}</MoneyText></span>
                  )}
                </span>
                {item.href && (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--primary)]">
                    {item.action}
                    <FaChevronRight className="text-xs" aria-hidden="true" />
                  </span>
                )}
              </>
            );
            const className =
              'flex min-h-[56px] items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2';

            return (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                transition={reducedTransition(reduce, { type: 'spring', stiffness: 360, damping: 30, delay: 0.1 + index * 0.09 })}
              >
                {item.href ? (
                  <Link
                    href={item.href}
                    className={`${className} transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]`}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className={className}>{content}</div>
                )}
              </motion.li>
            );
          })}
        </ul>
      )}

      {insightsError && !loading && (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Não foi possível carregar os insights deste período.
        </p>
      )}
    </section>
  );
}
