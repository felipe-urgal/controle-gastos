'use client';

import { useState } from 'react';
import { FaDownload, FaFileAlt } from 'react-icons/fa';

import { Button, Select } from '@/app/components/ui';

type ExportFormat = 'csv' | 'json';

function getDownloadFilename(response: Response, format: ExportFormat) {
  const header = response.headers.get('content-disposition') ?? '';
  const candidate = header.match(/filename="?([^";]+)"?/i)?.[1];

  if (
    candidate &&
    /^controle-gastos-\d{4}-\d{2}-\d{2}\.(csv|json)$/.test(candidate)
  ) {
    return candidate;
  }

  return `controle-gastos-${new Date().toISOString().slice(0, 10)}.${format}`;
}

export default function ExportData() {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  async function handleExport() {
    if (isExporting) return;

    setIsExporting(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/user/export?format=${format}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) {
        let message = 'Não foi possível exportar os dados.';

        try {
          const body = await response.json();
          message = body?.error?.message ?? message;
        } catch {
          // Keep the generic message when the server does not return JSON.
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = objectUrl;
      link.download = getDownloadFilename(response, format);
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);

      setFeedback({
        type: 'success',
        message: `Exportação ${format.toUpperCase()} pronta.`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível exportar os dados.',
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="ds-panel overflow-hidden" aria-labelledby="export-data-title">
      <div className="border-b border-[var(--border)] px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-raised)] text-[var(--text-muted)]"
            aria-hidden="true"
          >
            <FaFileAlt />
          </span>
          <div>
            <h2 id="export-data-title" className="text-xl font-semibold text-[var(--foreground)]">
              Portabilidade dos dados
            </h2>
            <p className="mt-1 text-base leading-relaxed text-[var(--text-muted)]">
              Baixe uma cópia das suas informações. A exportação é somente leitura e não altera nenhum dado.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <Select
            label="Formato"
            value={format}
            onChange={(value) => setFormat(value as ExportFormat)}
            disabled={isExporting}
            options={[
              { value: 'json', label: 'JSON — snapshot de contas, categorias e transações' },
              { value: 'csv', label: 'CSV — transações para planilhas' },
            ]}
          />

          <Button
            type="button"
            variant="primary"
            icon={<FaDownload />}
            onClick={() => void handleExport()}
            disabled={isExporting}
            isLoading={isExporting}
            className="w-full sm:w-auto"
          >
            {isExporting ? 'Exportando…' : 'Baixar exportação'}
          </Button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
          JSON inclui o snapshot estruturado. CSV contém as transações e é compatível com ferramentas de planilha.
        </p>

        {feedback && (
          <div
            role={feedback.type === 'error' ? 'alert' : 'status'}
            aria-live="polite"
            className={`mt-4 rounded-[var(--radius-md)] border p-3.5 text-sm leading-relaxed ${
              feedback.type === 'error'
                ? 'border-[var(--danger)]/50 bg-[var(--danger-subtle)] text-[var(--expense)]'
                : 'border-[var(--primary)]/40 bg-[var(--primary-subtle)] text-[var(--foreground)]'
            }`}
          >
            {feedback.message}
          </div>
        )}
      </div>
    </section>
  );
}
