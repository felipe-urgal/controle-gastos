'use client';

import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { FaChevronRight } from 'react-icons/fa';

import { CARD_EASE, CARD_VIEWPORT, reducedTransition } from '@/app/components/ui/motion';
import { dashboardLogicalDateLabel, displayMoney } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';
import type { DashboardNetWorthSummary, MonthlyDashboard } from '@/app/types/dashboard';

/** Faturas abertas dos cartões: soma (mesma moeda do dashboard) e a data de vencimento mais próxima. */
export function summarizeCardStatements(cards: MonthlyDashboard['cards']) {
  const open = cards.flatMap((card) => (card.nextStatement && card.nextStatement.amount > 0 ? [card.nextStatement] : []));
  if (open.length === 0) return null;

  const nextDue = open
    .map((statement) => statement.dueDate)
    .reduce((earliest, due) =>
      due.year * 10000 + due.month * 100 + due.day < earliest.year * 10000 + earliest.month * 100 + earliest.day ? due : earliest,
    );

  return {
    total: open.reduce((sum, statement) => sum + statement.amount, 0),
    count: open.length,
    nextDue,
  };
}

const MotionLink = motion.create(Link);

/** Cada tile tem o seu efeito: `tilt` (inclina com o mouse), `mask` (texto sobe da máscara) e `shimmer` (brilho que varre). */
type TileEffect = 'tilt' | 'mask' | 'shimmer';

function Tile({ href, label, effect, children }: { href: string; label: string; effect: TileEffect; children: ReactNode }) {
  const reduce = useReducedMotion();
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rotateX = useSpring(tiltX, { stiffness: 220, damping: 18 });
  const rotateY = useSpring(tiltY, { stiffness: 220, damping: 18 });
  const tilt = effect === 'tilt' && !reduce;
  // Metas: uma ondulação sai do ponto por onde o mouse entrou.
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);

  return (
    <motion.div
      className="min-w-0"
      style={tilt ? { transformPerspective: 700 } : undefined}
      initial={effect === 'tilt' ? { rotateY: -40, opacity: 0 } : false}
      whileInView={effect === 'tilt' ? { rotateY: 0, opacity: 1 } : undefined}
      viewport={CARD_VIEWPORT}
      transition={reducedTransition(reduce, { type: 'spring', stiffness: 160, damping: 16 })}
    >
      <MotionLink
        href={href}
        style={tilt ? { rotateX, rotateY, transformPerspective: 700 } : undefined}
        onMouseMove={
          tilt
            ? (event) => {
                const box = event.currentTarget.getBoundingClientRect();
                tiltY.set(((event.clientX - box.left) / box.width - 0.5) * 10);
                tiltX.set(-((event.clientY - box.top) / box.height - 0.5) * 10);
              }
            : undefined
        }
        onPointerEnter={
          effect === 'mask' && !reduce
            ? (event) => {
                const box = event.currentTarget.getBoundingClientRect();
                setRipple({ x: event.clientX - box.left, y: event.clientY - box.top, id: Date.now() });
              }
            : undefined
        }
        onMouseLeave={
          tilt
            ? () => {
                tiltX.set(0);
                tiltY.set(0);
              }
            : undefined
        }
        className="relative flex h-full min-h-11 items-center justify-between gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
      >
        <span className="min-w-0">
          <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">{label}</span>
          {effect === 'mask' ? (
            // A máscara (pai, sempre visível) observa a viewport; o texto (filho, recortado) só herda a animação.
            <motion.span className="mt-1 block overflow-hidden text-sm" initial="hidden" whileInView="shown" viewport={CARD_VIEWPORT}>
              <motion.span
                className="block"
                variants={{ hidden: reduce ? {} : { y: '110%' }, shown: { y: 0 } }}
                transition={reducedTransition(reduce, { duration: 0.6, ease: CARD_EASE, delay: 0.1 })}
              >
                {children}
              </motion.span>
            </motion.span>
          ) : (
            <span className="mt-1 block text-sm">{children}</span>
          )}
        </span>
        <FaChevronRight className="shrink-0 text-xs text-[var(--text-muted)]" aria-hidden="true" />
        <AnimatePresence>
          {ripple && (
            <motion.span
              key={ripple.id}
              aria-hidden="true"
              className="pointer-events-none absolute h-10 w-10 rounded-full bg-[var(--primary)]"
              style={{ left: ripple.x - 20, top: ripple.y - 20 }}
              initial={{ scale: 0, opacity: 0.3 }}
              animate={{ scale: 14, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              onAnimationComplete={() => setRipple(null)}
            />
          )}
        </AnimatePresence>
        {effect === 'shimmer' && !reduce && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent"
            initial={{ x: '-150%' }}
            whileInView={{ x: '450%' }}
            viewport={CARD_VIEWPORT}
            transition={reducedTransition(reduce, { duration: 1.1, ease: 'easeInOut', delay: 0.3 })}
          />
        )}
      </MotionLink>
    </motion.div>
  );
}

/** Cartões, metas e patrimônio em uma faixa compacta; cartões e metas só aparecem quando existem. */
export function OverviewStrip({
  cards,
  goals,
  netWorth,
  period,
  currency,
  showValues,
}: {
  cards: MonthlyDashboard['cards'];
  goals: MonthlyDashboard['goals'];
  netWorth: { data: DashboardNetWorthSummary | null; loading: boolean; error: string };
  period: MonthlyDashboard['period'];
  currency: string;
  showValues: boolean;
}) {
  const statements = summarizeCardStatements(cards);
  const goal = goals[0];
  const money = (amount: number) => displayMoney(amount, showValues, currency);
  const monthEnd = `${String(period.month).padStart(2, '0')}/${period.year}`;

  return (
    <section className="grid gap-[14px] [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]" aria-label="Cartões, metas e patrimônio">
      {cards.length > 0 && (
        <Tile href="/contas" label="Cartões" effect="tilt">
          {statements ? (
            <>
              <strong className="money">{money(statements.total)}</strong>
              <span className="text-[var(--text-muted)]">
                {' '}em {statements.count === 1 ? 'fatura' : 'faturas'} · vence {dashboardLogicalDateLabel(statements.nextDue)}
              </span>
            </>
          ) : (
            <strong>Nenhuma fatura em aberto</strong>
          )}
        </Tile>
      )}
      {goal && (
        <Tile href="/metas" label="Metas" effect="mask">
          <strong className="truncate">{goal.name}</strong>
          <span className="text-[var(--text-muted)]">
            {' '}· {goal.percentage.toLocaleString('pt-BR')}%{goals.length > 1 ? ` · +${goals.length - 1}` : ''}
            {goal.monthlyContributionSuggestion !== null && (
              <> · <span className="money">{money(goal.monthlyContributionSuggestion)}</span>/mês</>
            )}
          </span>
        </Tile>
      )}
      <Tile href="/patrimonio" label={`Patrimônio · ${monthEnd}`} effect="shimmer">
        {netWorth.loading ? (
          <span className="text-[var(--text-muted)]">Carregando…</span>
        ) : netWorth.error ? (
          <span className="text-[var(--expense)]">Indisponível</span>
        ) : netWorth.data?.total === null || netWorth.data?.total === undefined ? (
          <span className="text-[var(--text-muted)]">Sem saldo realizado</span>
        ) : (
          <strong className="money">{money(netWorth.data.total)}</strong>
        )}
      </Tile>
    </section>
  );
}
