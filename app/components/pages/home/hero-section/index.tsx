import Link from 'next/link';
import { FaArrowRight, FaCalendarAlt, FaCheck, FaMoneyBillWave } from 'react-icons/fa';

import FinancialMock from '@/app/components/pages/home/financial-mock';

const capabilities = [
  'Contas e categorias organizadas',
  'Transações e recorrências mensais',
  'Calendário financeiro e exportação',
];

export default function HeroSection() {
  return (
    <section className="border-b border-[var(--border)]" aria-labelledby="landing-title">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,0.92fr)_minmax(480px,1.08fr)] lg:items-center lg:gap-14 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <div className="mb-5 inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text-muted)]">
            <FaMoneyBillWave className="text-[var(--primary)]" aria-hidden="true" />
            Controle financeiro pessoal
          </div>

          <h1
            id="landing-title"
            className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-[-0.035em] text-[var(--foreground)] sm:text-5xl lg:text-[3.6rem]"
          >
            Organize seu dinheiro com uma visão clara do que acontece.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--text-muted)] sm:text-xl">
            Registre receitas e despesas, acompanhe contas, categorias e recorrências e consulte suas movimentações pelo calendário em um único lugar.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-5 text-base font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            >
              Criar conta
              <FaArrowRight aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] px-5 text-base font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            >
              Já tenho uma conta
            </Link>
          </div>

          <ul className="mt-8 grid gap-3 text-base text-[var(--text-muted)]" aria-label="Recursos disponíveis">
            {capabilities.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-xs text-[var(--primary)]">
                  <FaCheck aria-hidden="true" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative lg:pl-2">
          <div className="mb-4 flex items-center justify-between gap-4 text-sm text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-2 font-semibold text-[var(--foreground)]">
              <FaCalendarAlt className="text-[var(--primary)]" aria-hidden="true" />
              Exemplo visual do produto
            </span>
            <span>Dados ilustrativos</span>
          </div>
          <FinancialMock />
        </div>
      </div>
    </section>
  );
}
