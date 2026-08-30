import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheck,
  FaMoneyBillWave,
  FaWallet,
} from 'react-icons/fa';

import styles from '@/app/components/layout/auth-shell/auth-shell.module.css';

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  footer?: ReactNode;
};

const capabilities = [
  'Contas e categorias organizadas',
  'Transações e recorrências mensais',
  'Calendário financeiro para acompanhar o tempo',
];

export default function AuthShell({
  eyebrow,
  title,
  description,
  children,
  backHref = '/',
  backLabel = 'Voltar ao início',
  footer,
}: AuthShellProps) {
  return (
    <div className={`${styles.root} min-h-screen bg-[var(--background)] text-[var(--foreground)]`}>
      <a
        href="#auth-form"
        className="sr-only z-50 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-3 text-base font-semibold text-[var(--on-primary)] focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o formulário
      </a>

      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] lg:grid-cols-[minmax(360px,0.78fr)_minmax(520px,1.22fr)]">
        <aside className="hidden border-r border-[var(--border)] bg-[var(--surface)] px-10 py-10 lg:flex lg:flex-col xl:px-14 xl:py-12">
          <Link
            href="/"
            className="flex w-fit items-center gap-3 rounded-[var(--radius-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)]"
            aria-label="Controle de Gastos — início"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] text-[var(--on-primary)]">
              <FaWallet aria-hidden="true" />
            </span>
            <span>
              <span className="block text-lg font-bold tracking-tight">Controle de Gastos</span>
              <span className="block text-sm text-[var(--text-muted)]">Finanças pessoais</span>
            </span>
          </Link>

          <div className="my-auto max-w-md py-12">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
              Um fluxo, uma visão
            </p>
            <h2 className="mt-4 text-4xl font-bold leading-tight tracking-[-0.03em] text-[var(--foreground)] xl:text-[2.75rem]">
              Entre e continue organizando suas finanças com clareza.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-[var(--text-muted)]">
              A autenticação protege o acesso ao mesmo ambiente onde você organiza contas, categorias, movimentações e calendário.
            </p>

            <ul className="mt-8 space-y-4 text-base text-[var(--text-muted)]" aria-label="Recursos do produto">
              {capabilities.map((capability) => (
                <li key={capability} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-xs text-[var(--primary)]">
                    <FaCheck aria-hidden="true" />
                  </span>
                  <span>{capability}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-[var(--border)] pt-6 text-sm text-[var(--text-muted)]">
            <span className="flex items-center gap-2"><FaWallet className="text-[var(--primary)]" aria-hidden="true" /> Contas</span>
            <span className="flex items-center gap-2"><FaMoneyBillWave className="text-[var(--primary)]" aria-hidden="true" /> Transações</span>
            <span className="flex items-center gap-2"><FaCalendarAlt className="text-[var(--primary)]" aria-hidden="true" /> Calendário</span>
          </div>
        </aside>

        <main className="flex min-h-screen flex-col px-4 py-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 sm:py-8 lg:px-10 lg:py-10 xl:px-16">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <Link
              href={backHref}
              className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] px-2 text-base font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            >
              <FaArrowLeft aria-hidden="true" />
              {backLabel}
            </Link>

            <Link
              href="/"
              aria-label="Controle de Gastos — início"
              className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] text-[var(--on-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] lg:hidden"
            >
              <FaWallet aria-hidden="true" />
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center py-8 sm:py-10">
            <section id="auth-form" tabIndex={-1} className="w-full max-w-[520px]">
              <div className="mb-7">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">{eyebrow}</p>
                <h1 className="mt-3 text-3xl font-bold tracking-[-0.025em] text-[var(--foreground)] sm:text-4xl">{title}</h1>
                <p className="mt-3 text-base leading-relaxed text-[var(--text-muted)] sm:text-lg">{description}</p>
              </div>

              <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-surface)] sm:p-7">
                {children}
              </div>

              {footer && <div className="mt-6 text-center text-base text-[var(--text-muted)]">{footer}</div>}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
