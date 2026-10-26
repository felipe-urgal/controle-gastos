'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { CARD_EASE, CARD_VIEWPORT, reducedTransition } from '@/app/components/pages/dashboard/dashboard/cards/card-motion';
import { displayMoney } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';
import type { DashboardCategoryLimit } from '@/app/types/dashboard';

/** Mesma regra do planejamento: orçamento consumido = realizado + comprometido. */
export function categoryBudgetState(limit: DashboardCategoryLimit): { percent: number; tone: 'ok' | 'near' | 'over' } {
  const percent = limit.planningPercentage ?? limit.percentage;
  if (limit.isOverBudget || percent > 100) return { percent, tone: 'over' };
  return { percent, tone: percent >= 90 ? 'near' : 'ok' };
}

const barTone = { ok: 'bg-[var(--primary)]', near: 'bg-[var(--warning)]', over: 'bg-[var(--expense)]' } as const;
const textTone = { ok: 'text-[var(--text-muted)]', near: 'text-[var(--warning)]', over: 'text-[var(--expense)]' } as const;

/** Barra que preenche da esquerda até `percent` e recebe um brilho que a atravessa uma vez. */
export function FillBar({ percent, className, delay = 0 }: { percent: number; className: string; delay?: number }) {
  const reduce = useReducedMotion();

  return (
    <motion.span
      className={`relative block h-full overflow-hidden rounded-full ${className}`}
      initial={'hidden'}
      whileInView="shown"
      viewport={CARD_VIEWPORT}
      variants={{ hidden: { width: 0 }, shown: { width: `${Math.min(100, percent)}%` } }}
      transition={reducedTransition(reduce, { duration: 0.9, ease: CARD_EASE, delay })}
    >
      {/* O brilho herda a animação do preenchimento (pai): sozinho ele começa fora da área visível e nunca dispararia. */}
      {!reduce && (
        <motion.span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/45 to-transparent"
          variants={{ hidden: { x: '-100%' }, shown: { x: '300%' } }}
          transition={reducedTransition(reduce, { duration: 0.8, ease: 'easeInOut', delay: delay + 0.7 })}
        />
      )}
    </motion.span>
  );
}

export function CategoryBudgetBar({
  limit,
  showValues,
  currency,
  delay = 0,
}: {
  limit: DashboardCategoryLimit;
  showValues: boolean;
  currency: string;
  delay?: number;
}) {
  const { percent, tone } = categoryBudgetState(limit);

  return (
    <div className="min-w-0">
      <div
        className="h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]"
        role="img"
        aria-label={`${Math.round(percent)}% do orçamento de ${limit.category.name} consumido`}
      >
        <FillBar percent={percent} className={barTone[tone]} delay={delay} />
      </div>
      <p className={`mt-1 truncate text-xs ${textTone[tone]}`}>
        <span className="money">{Math.round(percent)}%</span> de <span className="money">{displayMoney(limit.amount, showValues, currency)}</span>
      </p>
    </div>
  );
}
