import Link from 'next/link';

import TransactionImportPage from '@/app/components/pages/transactions/import';

export default function Page() {
  return (
    <>
      <div className="orbit-page-container !pb-0">
        <div className="flex items-center justify-end gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <a
            href="/exemplos/importacao-transacoes.csv"
            download
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] px-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            Modelo CSV
          </a>
          <details className="group relative shrink-0">
            <summary className="inline-flex min-h-10 cursor-pointer list-none items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] px-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">
              Ajuda CSV
            </summary>
            <div className="fixed inset-x-3 top-[5.5rem] bottom-[calc(var(--app-mobile-bottom-nav-height)+env(safe-area-inset-bottom)+0.75rem)] z-[70] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--background)] p-4 shadow-[var(--shadow-surface)] sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-[70dvh] sm:w-[min(92vw,720px)] sm:p-5">
              <p className="text-sm text-[var(--text-muted)]">
                O CSV precisa ter as colunas <strong className="text-[var(--foreground)]">data</strong>, <strong className="text-[var(--foreground)]">descricao</strong> e <strong className="text-[var(--foreground)]">valor</strong>. A coluna <strong className="text-[var(--foreground)]">id</strong> é opcional e ajuda na identificação de duplicadas.
              </p>
              <pre className="mt-3 max-w-full overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs leading-relaxed text-[var(--foreground)]"><code>{`data;descricao;valor;id\n01/09/2026;Supermercado;-185,90;abc-001\n05/09/2026;Salário;4500,00;abc-002\n10/09/2026;Internet;-99,90;abc-003`}</code></pre>
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
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] px-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            Regras
          </Link>
        </div>
      </div>
      <TransactionImportPage />
    </>
  );
}
