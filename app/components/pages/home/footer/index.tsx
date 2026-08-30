import Link from 'next/link';
import { FaWallet } from 'react-icons/fa';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--background)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-subtle)] text-[var(--primary)]">
            <FaWallet aria-hidden="true" />
          </span>
          <div>
            <p className="text-base font-semibold text-[var(--foreground)]">Controle de Gastos</p>
            <p className="text-sm text-[var(--text-muted)]">© {currentYear}. Finanças pessoais com clareza.</p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-[var(--text-muted)]" aria-label="Links do rodapé">
          <Link
            href="/login"
            className="rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)] hover:text-[var(--foreground)]"
          >
            Entrar
          </Link>
          <Link
            href="/signup"
            className="rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)] hover:text-[var(--foreground)]"
          >
            Criar conta
          </Link>
        </nav>
      </div>
    </footer>
  );
}
