import Link from 'next/link';

import TransactionImportPage from '@/app/components/pages/transactions/import';

export default function Page() {
  return (
    <>
      <div className="mb-3 flex items-center justify-end gap-2">
        <a
          href="/exemplos/importacao-transacoes.csv"
          download
          className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] px-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          Modelo CSV
        </a>

        <details className="group relative">
          <summary className="inline-flex min-h-10 cursor-pointer list-none items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] px-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">
            Ajuda CSV
          </summary>
          <div className="absolute right-0 z-40 mt-2 max-h-[70dvh] w-[min(92vw,720px)] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--background)] p-4 shadow-[var(--shadow-surface)] sm:p-5">
            <p className="text-sm text-[var(--text-muted)]">
              O CSV precisa ter as colunas <strong className="text-[var(--foreground)]">data</strong>, <strong className="text-[var(--foreground)]">descricao</strong> e <strong className="text-[var(--foreground)]">valor</strong>. A coluna <strong className="text-[var(--foreground)]">id</strong> é opcional e ajuda na identificação de duplicadas.
            </p>

            <pre className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs leading-relaxed text-[var(--foreground)]"><code>{`data;descricao;valor;id\n01/09/2026;Supermercado;-185,90;abc-001\n05/09/2026;Salário;4500,00;abc-002\n10/09/2026;Internet;-99,90;abc-003`}</code></pre>

            <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--text-muted)]">
              <p className="font-semibold text-[var(--foreground)]">Como interpretar</p>
              <ul className="mt-2 space-y-1.5 leading-relaxed">
                <li>• valor positivo = receita;</li>
                <li>• valor negativo = despesa;</li>
                <li>• datas aceitas: 01/09/2026, 01-09-2026 ou 2026-09-01;</li>
                <li>• separador pode ser ponto e vírgula ou vírgula;</li>
                <li>• descrição precisa ter entre 2 e 100 caracteres.</li>
              </ul>
            </div>
          </div>
        </details>

        <Link
          href="/transacoes/importar/regras"
          className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] px-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          Regras
        </Link>
      </div>

      <TransactionImportPage />
    </>
  );
}
