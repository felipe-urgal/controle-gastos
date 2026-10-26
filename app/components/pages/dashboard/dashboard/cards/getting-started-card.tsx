'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { CARD_EASE, reducedTransition } from '@/app/components/ui/motion';
import Link from 'next/link';

export type GettingStartedStep = { id: 'account' | 'transaction' | 'budget'; label: string; href: string; done: boolean };

/** Primeiros passos de uma conta nova; vazio quando conta e movimentações já existem. */
export function gettingStartedSteps({
  hasAccount,
  hasTransactions,
  hasBudget,
}: {
  hasAccount: boolean;
  hasTransactions: boolean;
  hasBudget: boolean;
}): GettingStartedStep[] {
  if (hasAccount && hasTransactions) return [];

  return [
    { id: 'account', label: 'Crie sua primeira conta', href: '/contas/nova', done: hasAccount },
    { id: 'transaction', label: 'Lance uma receita ou despesa', href: '/transacoes/nova', done: hasTransactions },
    { id: 'budget', label: 'Defina um orçamento para o mês', href: '/categorias', done: hasBudget },
  ];
}

/** Círculo do passo: concluído, o aro e o check se desenham em sequência. */
function StepMark({ done }: { done: boolean }) {
  const reduce = useReducedMotion();

  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="none" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={done ? 'Concluído' : 'Pendente'}>
      <motion.circle
        cx="10"
        cy="10"
        r="8"
        strokeWidth="1.8"
        stroke={done ? 'var(--income)' : 'var(--text-muted)'}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={reducedTransition(reduce, { duration: 0.5, ease: CARD_EASE })}
      />
      {done && (
        <motion.path
          d="M6 10.5 L9 13.5 L14 7.5"
          strokeWidth="2"
          stroke="var(--income)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={reducedTransition(reduce, { duration: 0.4, ease: CARD_EASE, delay: 0.35 })}
        />
      )}
    </svg>
  );
}

export function GettingStartedCard({ steps }: { steps: GettingStartedStep[] }) {
  const reduce = useReducedMotion();
  if (steps.length === 0) return null;

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-[14px] sm:p-5" aria-labelledby="dashboard-start-title">
      <h2 id="dashboard-start-title" className="text-lg font-bold">Comece por aqui</h2>
      <p className="mt-0.5 text-xs text-[var(--text-muted)]">Três passos para o dashboard começar a mostrar o seu mês.</p>
      <ol className="mt-3 grid gap-2 md:grid-cols-3">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              href={step.href}
              className="flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-sm font-semibold transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            >
              <StepMark done={step.done} />
              <span className={`relative ${step.done ? 'text-[var(--text-muted)]' : ''}`}>
                {step.label}
                {step.done && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-1/2 h-px origin-left bg-[var(--text-muted)]"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={reducedTransition(reduce, { duration: 0.4, ease: CARD_EASE, delay: 0.6 })}
                  />
                )}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
