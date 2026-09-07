import Link from 'next/link';

import TransactionImportPage from '@/app/components/pages/transactions/import';

export default function Page() {
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Link
          href="/transacoes/importar/regras"
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] px-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          Gerenciar regras
        </Link>
      </div>
      <TransactionImportPage />
    </>
  );
}
