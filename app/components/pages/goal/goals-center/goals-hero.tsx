'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { buildLede, summarizeActive } from '@/app/components/pages/goal/goals-center/goals-model';
import { Chip, MoneyText } from '@/app/components/ui';
import { CountUp, reducedTransition } from '@/app/components/ui/motion';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { FinancialGoal } from '@/app/types/financial-goal';

export default function GoalsHero({
  goals,
  currency,
  currencies,
  onCurrency,
  now,
  showValues,
}: {
  goals: FinancialGoal[];
  currency: string;
  currencies: string[];
  onCurrency: (currency: string) => void;
  now: Date;
  showValues: boolean;
}) {
  const reduce = useReducedMotion();
  const money = (cents: number) => (showValues ? formatCurrency(cents, currency) : '••••');
  const summary = summarizeActive(goals, currency, now);

  return (
    <motion.section
      aria-labelledby="goals-hero-label"
      initial={reduce ? false : { opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reducedTransition(reduce, { type: 'spring', stiffness: 150, damping: 16, delay: 0.1 })}
      className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id="goals-hero-label" className="text-sm font-semibold text-[var(--text-muted)]">Você já juntou nas metas ativas</p>
        {currencies.length > 1 && (
          <div className="flex gap-2" role="group" aria-label="Moeda">
            {currencies.map((code) => (
              <Chip key={code} layoutId="goals-currency" selected={code === currency} onClick={() => onCurrency(code)}>
                {code}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <strong className="money break-words text-3xl font-semibold leading-none tracking-[-0.035em] sm:text-5xl">
        <CountUp amount={summary.current} format={money} />
        <span className="ml-2 text-base font-semibold tracking-normal text-[var(--text-muted)]">de {money(summary.target)}</span>
      </strong>

      <div>
        <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-subtle)]" role="img" aria-label={`${summary.percent}% do total das metas ativas`}>
          {/* A barra sobe com uma mola que passa um pouco do ponto e volta, e um brilho a atravessa ao terminar. */}
          <motion.div
            className="relative h-full overflow-hidden rounded-full bg-[var(--primary)]"
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${summary.percent}%` }}
            transition={reducedTransition(reduce, { type: 'spring', stiffness: 70, damping: 11, delay: 0.5 })}
          >
            {!reduce && (
              <motion.span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '400%' }}
                transition={{ duration: 0.9, ease: 'easeInOut', delay: 1.5 }}
              />
            )}
          </motion.div>
        </div>
        <div className="mt-1.5 flex justify-between gap-2 text-sm text-[var(--text-muted)]">
          <strong className="text-[var(--foreground)]"><CountUp amount={summary.percent} format={(value) => `${value}%`} /></strong>
          <span>Faltam <span className="money">{money(summary.remaining)}</span></span>
        </div>
      </div>

      <p className="max-w-[64ch] text-sm text-[var(--text-muted)]">
        <MoneyText>{buildLede(summary, money)}</MoneyText>
      </p>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Stat index={0} label="Metas ativas" value={String(summary.count)} detail={summary.behind === 0 ? 'todas no ritmo' : `${summary.behind} ${summary.behind === 1 ? 'abaixo do ritmo ou vencida' : 'abaixo do ritmo ou vencidas'}`} />
        <Stat index={1} label="Sugestão mensal" value={money(summary.monthly)} detail="soma das metas com prazo" />
      </div>
    </motion.section>
  );
}

function Stat({ index, label, value, detail }: { index: number; label: string; value: string; detail: string }) {
  const reduce = useReducedMotion();

  return (
    // Os quadrinhos sobem como degraus (o segundo mais alto que o primeiro); no hover (ou toque) o valor cresce.
    <motion.div
      className="grid min-w-0 content-start gap-0.5 rounded-[var(--radius-md)] bg-[var(--surface-raised)] px-3 py-3 sm:px-4 sm:py-3.5"
      initial={reduce ? false : { opacity: 0, y: 24 + index * 14 }}
      animate={{ opacity: 1, y: 0, transition: reducedTransition(reduce, { type: 'spring', stiffness: 220, damping: 18, delay: 0.7 + index * 0.12 }) }}
      whileHover="hover"
      whileTap="hover"
    >
      <span className="truncate text-xs font-semibold text-[var(--text-muted)] sm:text-sm">{label}</span>
      <motion.span className="money origin-left truncate text-base font-semibold sm:text-xl" variants={{ hover: { scale: 1.08, transition: { type: 'spring', stiffness: 400, damping: 16 } } }}>
        {value}
      </motion.span>
      <span className="text-xs text-[var(--text-muted)]">{detail}</span>
    </motion.div>
  );
}
