'use client';

import { useRef, useState } from 'react';

import { ModalShell } from '@/app/components/overlays/modal-shell';
import { Button } from '@/app/components/ui';
import { PeriodPicker, formatBrDate, usePeriodRange } from '@/app/components/pages/transactions/index/period-picker';
import { transactionService, type BackupRestoreSummary } from '@/app/services/transaction-service';

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function BackupDialog({
  month,
  year,
  accountId,
  accountName,
  onClose,
  onRestored,
}: {
  month: number;
  year: number;
  accountId?: string;
  accountName?: string;
  onClose: () => void;
  onRestored: () => void;
}) {
  const picker = usePeriodRange(month, year);
  const fileInput = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [backup, setBackup] = useState<unknown>(null);
  const [fileName, setFileName] = useState('');
  const [summary, setSummary] = useState<BackupRestoreSummary | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [done, setDone] = useState<BackupRestoreSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = exporting || analyzing || restoring;
  const restorable = summary
    ? summary.transactions.toRestore + summary.transfers.toRestore + summary.cardPayments.toRestore
    : 0;

  async function handleExport() {
    setExporting(true);
    setError(null);
    setExported(false);
    try {
      await transactionService.downloadBackup({ ...picker.range, accountId });
      setExported(true);
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível exportar o backup.'));
    } finally {
      setExporting(false);
    }
  }

  async function handleFile(file: File | undefined) {
    setSummary(null);
    setBackup(null);
    setDone(null);
    setError(null);
    if (!file) return;
    setFileName(file.name);
    setAnalyzing(true);
    try {
      const parsed = JSON.parse(await file.text());
      const response = await transactionService.previewBackup(parsed);
      setBackup(parsed);
      setSummary(response.data);
    } catch (cause) {
      setError(cause instanceof SyntaxError ? 'O arquivo não é um JSON válido.' : errorMessage(cause, 'Não foi possível analisar o backup.'));
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleRestore() {
    if (!backup) return;
    setRestoring(true);
    setError(null);
    try {
      const response = await transactionService.restoreBackup(backup);
      setDone(response.data);
      setSummary(null);
      setBackup(null);
      onRestored();
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível restaurar o backup.'));
    } finally {
      setRestoring(false);
    }
  }

  return (
    <ModalShell
      title="Backup de transações"
      description="Exporte um período para um arquivo ou restaure a partir dele."
      closeLabel="Fechar"
      closeDisabled={busy}
      maxWidthClass="sm:max-w-[520px]"
      onClose={onClose}
    >
      <div className="space-y-6">
        <section className="space-y-3" aria-labelledby="backup-export-title">
          <h3 id="backup-export-title" className="text-sm font-bold">Exportar período</h3>
          <PeriodPicker state={picker} disabled={busy} />
          <p className="text-xs text-[var(--text-muted)]">
            {formatBrDate(picker.range.from)} a {formatBrDate(picker.range.to)} · {accountName ?? 'Todas as contas'}.
            Inclui transferências, pagamentos de fatura, tags e rateios.
          </p>
          <Button onClick={handleExport} disabled={!picker.valid || busy} isLoading={exporting}>Exportar backup</Button>
          {exported && <p role="status" className="text-sm text-[var(--income)]">Backup exportado.</p>}
        </section>

        <section className="space-y-3 border-t border-[var(--border)] pt-5" aria-labelledby="backup-restore-title">
          <h3 id="backup-restore-title" className="text-sm font-bold">Restaurar de um arquivo</h3>
          <p className="text-xs text-[var(--text-muted)]">
            O período é lido do arquivo. Contas e categorias que não existirem são criadas, e o que já foi restaurado antes não é duplicado.
          </p>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Arquivo de backup"
            onChange={(event) => { void handleFile(event.target.files?.[0]); event.target.value = ''; }}
          />
          <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={busy} isLoading={analyzing}>
            {fileName ? 'Escolher outro arquivo' : 'Escolher arquivo de backup'}
          </Button>

          {summary && (
            <div className="space-y-3">
              <p className="text-sm">
                <strong>{fileName}</strong> · {formatBrDate(summary.period.from)} a {formatBrDate(summary.period.to)}
              </p>
              <ul className="space-y-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-xs text-[var(--text-muted)]">
                <li>{plural(summary.transactions.toRestore, 'transação será restaurada', 'transações serão restauradas')}</li>
                {summary.transfers.toRestore > 0 && <li>{plural(summary.transfers.toRestore, 'transferência', 'transferências')}</li>}
                {summary.cardPayments.toRestore > 0 && <li>{plural(summary.cardPayments.toRestore, 'pagamento de fatura', 'pagamentos de fatura')}</li>}
                {(summary.transactions.alreadyPresent + summary.transfers.alreadyPresent + summary.cardPayments.alreadyPresent) > 0 && (
                  <li>{summary.transactions.alreadyPresent + summary.transfers.alreadyPresent + summary.cardPayments.alreadyPresent} já existem e serão ignoradas</li>
                )}
                {summary.willCreate.accounts.length > 0 && <li>Contas a criar: {summary.willCreate.accounts.join(', ')}</li>}
                {summary.willCreate.categories.length > 0 && <li>Categorias a criar: {summary.willCreate.categories.join(', ')}</li>}
                {summary.willCreate.merchants > 0 && <li>{plural(summary.willCreate.merchants, 'estabelecimento a criar', 'estabelecimentos a criar')}</li>}
                {summary.willCreate.tags > 0 && <li>{plural(summary.willCreate.tags, 'tag a criar', 'tags a criar')}</li>}
                {summary.renamedAccounts.map((item) => (
                  <li key={item.to}>“{item.from}” já existe em outra moeda/tipo; será criada como “{item.to}”</li>
                ))}
              </ul>
              {summary.problems.length > 0 && (
                <ul role="alert" className="space-y-1 rounded-[var(--radius-md)] border border-[var(--warning)] bg-[var(--warning-subtle)] p-3 text-xs">
                  <li className="font-semibold">{plural(summary.problems.length, 'item será ignorado', 'itens serão ignorados')}:</li>
                  {summary.problems.map((problem) => <li key={problem}>{problem}</li>)}
                </ul>
              )}
              <Button onClick={handleRestore} disabled={busy || restorable === 0} isLoading={restoring}>
                {restorable === 0 ? 'Nada a restaurar' : `Restaurar ${restorable}`}
              </Button>
            </div>
          )}

          {done && (
            <p role="status" className="text-sm text-[var(--income)]">
              Restauração concluída: {plural(done.transactions.toRestore, 'transação', 'transações')}, {plural(done.transfers.toRestore, 'transferência', 'transferências')} e {plural(done.cardPayments.toRestore, 'pagamento de fatura', 'pagamentos de fatura')}.
            </p>
          )}
        </section>

        {error && (
          <p role="alert" className="rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]">
            {error}
          </p>
        )}
      </div>
    </ModalShell>
  );
}
