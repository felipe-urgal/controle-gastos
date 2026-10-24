'use client';

import { useState } from 'react';
import { FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

import { Button, Input, MoneyText } from '@/app/components/ui';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { investmentService, type CustodyStatementComparison } from '@/app/services/investment-service';

const statusLabel: Record<CustodyStatementComparison['comparison'][number]['status'], { text: string; tone: string }> = {
  MATCH: { text: 'Confere', tone: 'bg-[var(--surface-raised)] text-[var(--income)]' },
  QUANTITY_DIFFERENT: { text: 'Quantidade diferente', tone: 'bg-[var(--danger-subtle)] text-[var(--expense)]' },
  ONLY_IN_STATEMENT: { text: 'Só no extrato', tone: 'bg-[var(--warning-subtle)] text-[var(--warning)]' },
  ONLY_IN_APP: { text: 'Só no app', tone: 'bg-[var(--warning-subtle)] text-[var(--warning)]' },
};

function dateLabel(value: string | null) {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function CustodyStatementCard({ showValues }: { showValues: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CustodyStatementComparison | null>(null);
  const money = (cents: number | null) => (cents === null ? '—' : showValues ? formatCurrency(cents, 'BRL') : '••••');

  async function compare() {
    if (!file) return;
    setWorking(true);
    setError('');
    try {
      const response = await investmentService.compareCustodyStatement(file);
      setResult(response.data);
    } catch (requestError) {
      setResult(null);
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível analisar o extrato de custódia');
    } finally {
      setWorking(false);
    }
  }

  const differences = result?.comparison.filter((row) => row.status !== 'MATCH').length ?? 0;

  return (
    <article className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-5">
      <h2 className="text-lg font-bold text-[var(--foreground)]">Conferir extrato de custódia</h2>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Compare o Extrato de Custódia do Nubank com a sua carteira. Nada é importado nem gravado: o documento só aponta diferenças de posição.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Input
          label="Extrato de custódia (PDF)"
          type="file"
          accept=".pdf,application/pdf"
          disabled={working}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setResult(null);
            setError('');
          }}
        />
        <Button onClick={() => void compare()} disabled={!file || working} isLoading={working} loadingText="Analisando">
          Conferir
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-[var(--radius-md)] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-5 grid gap-4">
          <p className="flex flex-wrap items-center gap-2 text-sm" role="status">
            {differences === 0 ? (
              <FaCheckCircle className="text-[var(--income)]" aria-hidden="true" />
            ) : (
              <FaExclamationTriangle className="text-[var(--warning)]" aria-hidden="true" />
            )}
            <span>
              Extrato de {dateLabel(result.referenceDate)}:{' '}
              {result.comparison.length === 0
                ? 'sem posições de bolsa para comparar.'
                : differences === 0
                  ? 'todas as posições da bolsa conferem com a carteira.'
                  : `${differences} ${differences === 1 ? 'diferença encontrada' : 'diferenças encontradas'} na bolsa.`}
            </span>
          </p>

          {result.summary.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {result.summary.map((row) => (
                <div key={row.label} className="rounded-[var(--radius-md)] bg-[var(--surface-raised)] px-3.5 py-3">
                  <span className="block text-sm font-semibold text-[var(--text-muted)]">{row.label}</span>
                  <strong className="money text-base font-semibold">{money(row.grossCents)}</strong>
                  <span className="block text-xs text-[var(--text-muted)]">saldo bruto</span>
                </div>
              ))}
            </div>
          )}

          {result.comparison.length > 0 && (
            <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)]">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead className="bg-[var(--surface-raised)] text-xs text-[var(--text-muted)]">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Ativo</th>
                    <th className="px-3 py-2 text-right font-semibold">Extrato</th>
                    <th className="px-3 py-2 text-right font-semibold">App</th>
                    <th className="px-3 py-2 font-semibold">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {result.comparison.map((row) => (
                    <tr key={row.symbol}>
                      <td className="px-3 py-2.5">
                        <strong className="block">{row.symbol}</strong>
                        {row.name && <span className="block text-xs text-[var(--text-muted)]">{row.name}</span>}
                      </td>
                      <td className="money px-3 py-2.5 text-right">
                        {row.statementQuantity ?? '—'}
                        <span className="block text-xs text-[var(--text-muted)]">{money(row.statementValueCents)}</span>
                      </td>
                      <td className="money px-3 py-2.5 text-right">
                        {row.appQuantity ?? '—'}
                        {row.quantityDifference && row.status === 'QUANTITY_DIFFERENT' && (
                          <span className="block text-xs text-[var(--expense)]">dif. {row.quantityDifference}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusLabel[row.status].tone}`}>{statusLabel[row.status].text}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.fixedIncome.length > 0 && (
            <details className="rounded-[var(--radius-lg)] border border-[var(--border)]">
              <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-bold">Caixinhas de renda fixa ({result.fixedIncome.length})</summary>
              <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
                {result.fixedIncome.map((row) => (
                  <li key={`${row.caixinha}-${row.assetType}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="min-w-0">
                      <strong className="block truncate">{row.caixinha}</strong>
                      <span className="block text-xs text-[var(--text-muted)]">{row.assetType} · {row.issuer}</span>
                    </span>
                    <span className="text-right">
                      <strong className="money block">{money(row.grossCents)}</strong>
                      <span className="block text-xs text-[var(--text-muted)]">
                        <MoneyText>{`líquido ${money(row.netCents)}`}</MoneyText>
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--text-muted)]">
                A renda fixa das caixinhas não é posição do app e não entra na comparação. IR e IOF do extrato são estimativas.
              </p>
            </details>
          )}

          {result.warnings.length > 0 && (
            <ul className="grid gap-1 rounded-[var(--radius-md)] bg-[var(--warning-subtle)] px-4 py-3 text-sm">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}
