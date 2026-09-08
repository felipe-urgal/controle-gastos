import Link from 'next/link';

import TransactionImportPage from '@/app/components/pages/transactions/import';

export default function Page() {
  return (
    <>
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap justify-end gap-2">
          <a
            href="/exemplos/importacao-transacoes.csv"
            download
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] px-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            Baixar modelo CSV
          </a>
          <Link
            href="/transacoes/importar/regras"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] px-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            Gerenciar regras
          </Link>
        </div>

        <details className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] sm:px-5">
            Ver exemplo de CSV e formato aceito
          </summary>
          <div className="grid gap-4 border-t border-[var(--border)] px-4 py-4 text-sm sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
            <div>
              <p className="text-[var(--text-muted)]">
                O CSV precisa ter as colunas <strong className="text-[var(--foreground)]">data</strong>, <strong className="text-[var(--foreground)]">descricao</strong> e <strong className="text-[var(--foreground)]">valor</strong>. A coluna <strong className="text-[var(--foreground)]">id</strong> é opcional e ajuda na identificação de duplicadas.
              </p>
              <pre className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-xs leading-relaxed text-[var(--foreground)]"><code>{`data;descricao;valor;id\n01/09/2026;Supermercado;-185,90;abc-001\n05/09/2026;Salário;4500,00;abc-002\n10/09/2026;Internet;-99,90;abc-003`}</code></pre>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4 text-[var(--text-muted)]">
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
      </div>

      <TransactionImportPage />
    </>
  );
}
