'use client';

import Link from 'next/link';
import { FaCheckCircle, FaRegCircle } from 'react-icons/fa';

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

export function GettingStartedCard({ steps }: { steps: GettingStartedStep[] }) {
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
              {step.done ? (
                <FaCheckCircle className="shrink-0 text-[var(--income)]" aria-label="Concluído" />
              ) : (
                <FaRegCircle className="shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
              )}
              <span className={step.done ? 'text-[var(--text-muted)] line-through' : ''}>{step.label}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
