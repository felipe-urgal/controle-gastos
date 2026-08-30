'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaWallet } from 'react-icons/fa';

import { useAuth } from '@/app/context';
import { Footer, HeroSection, HowItWorks } from '@/app/components/pages/home';

export default function HomeClient() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/contas');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="public-landing min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <a
        href="#conteudo-principal"
        className="sr-only z-50 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-3 text-base font-semibold text-[var(--on-primary)] focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>

      <header className="border-b border-[var(--border)] bg-[var(--background)]/95">
        <div className="mx-auto flex min-h-[72px] w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            aria-label="Controle de Gastos — início"
            className="flex min-w-0 items-center gap-3 rounded-[var(--radius-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] text-[var(--on-primary)]">
              <FaWallet aria-hidden="true" />
            </span>
            <span className="truncate text-base font-bold tracking-tight text-[var(--foreground)] sm:text-lg">
              Controle de Gastos
            </span>
          </Link>

          <nav className="ml-auto flex items-center gap-2" aria-label="Navegação pública">
            <Link
              href="/login"
              className="flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-3 text-base font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] sm:px-4"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-base font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            >
              Criar conta
            </Link>
          </nav>
        </div>
      </header>

      <main id="conteudo-principal" tabIndex={-1}>
        <HeroSection />
        <HowItWorks />
      </main>

      <Footer />
    </div>
  );
}
