'use client';

import { useEffect, useState } from 'react';
import { FaFileImport, FaRedo } from 'react-icons/fa';

import { formatCurrency } from '@/app/lib/currency/format-currency';

type Item = {
  description: string;
  amountCents: number | null;
};

type AnnualStatement = {
  calendarYear: number;
  taxExercise: number;
  payerName: string;
  payerTaxId: string;
  beneficiaryName: string | null;
  beneficiaryTaxId: string | null;
  incomeNature: string | null;
  taxableIncomeCents: number | null;
  officialPensionCents: number | null;
  complementaryPensionCents: number | null;
  alimonyCents: number | null;
  irrfCents: number | null;
  thirteenthSalaryCents: number | null;
  thirteenthIrrfCents: number | null;
  exemptIncome: Item[];
  exclusiveTaxation: Item[];
  accumulatedIncome: Item[];
  notes: string[];
  warnings: string[];
  errors: string[];
  fingerprint: string;
  duplicate: boolean;
};

type Preview = {
  fileName: string;
  requiresOcr: boolean;
  previewToken: string | null;
  statement: AnnualStatement | null;
  warnings: string[];
};

type StoredStatement = Omit<AnnualStatement, 'errors' | 'fingerprint' | 'duplicate'> & {
  id: string;
  createdAt: string;
};

function money(value: number | null) {
  return value === null ? 'Não informado' : formatCurrency(value, 'BRL');
}

async function envelope<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error?.message ?? 'Não foi possível concluir a operação');
  }
  return body.data as T;
}

export function AnnualIncomeStatementSection() {
  const [statements, setStatements] = useState<StoredStatement[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const response = await fetch('/api/payroll/annual', { cache: 'no-store' });
    setStatements(await envelope<StoredStatement[]>(response));
  }

  useEffect(() => {
    let cancelled = false;
    fetch('/api/payroll/annual', { cache: 'no-store' })
      .then((response) => envelope<StoredStatement[]>(response))
      .then((items) => {
        if (!cancelled) setStatements(items);
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar os informes anuais.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function analyze() {
    if (!file) return;
    setWorking(true);
    setError('');
    try {
      const formData = new FormData();
      formData.set('file', file);
      const response = await fetch('/api/payroll/annual/preview', {
        method: 'POST',
        body: formData,
      });
      setPreview(await envelope<Preview>(response));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível analisar o informe.');
    } finally {
      setWorking(false);
    }
  }

  async function confirm() {
    if (!preview?.statement || !preview.previewToken) return;
    setWorking(true);
    setError('');
    try {
      const response = await fetch('/api/payroll/annual/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previewToken: preview.previewToken,
          selected: true,
          statement: preview.statement,
        }),
      });
      await envelope(response);
      await load();
      setPreview(null);
      setFile(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível importar o informe.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="ds-panel p-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Informe anual de rendimentos</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Importe o comprovante anual da fonte pagadora sem criar transações bancárias.
          </p>

          {error && (
            <div role="alert" className="mt-4 rounded-[14px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]">
              {error}
            </div>
          )}

          {!preview ? (
            <div className="mt-5 space-y-4">
              <input
                type="file"
                accept=".pdf,application/pdf"
                disabled={working}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="ds-control min-h-11 w-full px-3 py-2"
              />
              <button
                type="button"
                disabled={!file || working}
                onClick={analyze}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--orbit-primary)] px-4 font-extrabold text-white disabled:opacity-40"
              >
                <FaFileImport aria-hidden="true" />
                {working ? 'Analisando...' : 'Analisar informe'}
              </button>
            </div>
          ) : preview.requiresOcr ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-[14px] border border-[var(--warning)]/35 bg-[var(--warning-subtle)] p-4 text-sm">
                <strong>OCR/revisão necessária</strong>
                <p className="mt-1 text-[var(--text-muted)]">{preview.warnings[0]}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--border-strong)] font-bold"
              >
                <FaRedo aria-hidden="true" /> Escolher outro PDF
              </button>
            </div>
          ) : preview.statement ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-[14px] border border-[var(--border)] p-4">
                <strong className="block text-sm text-[var(--foreground)]">{preview.statement.payerName}</strong>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Ano-calendário {preview.statement.calendarYear} · Exercício {preview.statement.taxExercise} · {preview.statement.payerTaxId}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Metric label="Tributáveis" value={money(preview.statement.taxableIncomeCents)} />
                <Metric label="Previdência oficial" value={money(preview.statement.officialPensionCents)} />
                <Metric label="IRRF" value={money(preview.statement.irrfCents)} />
                <Metric label="13º salário" value={money(preview.statement.thirteenthSalaryCents)} />
                <Metric label="IRRF 13º" value={money(preview.statement.thirteenthIrrfCents)} />
                <Metric label="Isentos" value={String(preview.statement.exemptIncome.length)} />
              </div>

              <StatementItems title="Isentos e não tributáveis" items={preview.statement.exemptIncome} />
              <StatementItems title="Tributação exclusiva" items={preview.statement.exclusiveTaxation} />
              <StatementItems title="Rendimentos recebidos acumuladamente" items={preview.statement.accumulatedIncome} />

              {preview.statement.notes.length > 0 && (
                <div className="rounded-[14px] bg-[var(--surface-raised)] p-3 text-xs text-[var(--text-muted)]">
                  <strong className="text-[var(--foreground)]">Informações complementares</strong>
                  {preview.statement.notes.map((note) => <p key={note} className="mt-1">{note}</p>)}
                </div>
              )}

              {preview.statement.errors.length > 0 && (
                <div className="rounded-[14px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]">
                  {preview.statement.errors.map((item) => <p key={item}>{item}</p>)}
                </div>
              )}

              {preview.statement.duplicate && (
                <div className="rounded-[14px] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--text-muted)]">
                  Este informe já foi importado.
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={working}
                  onClick={() => setPreview(null)}
                  className="min-h-12 rounded-full border border-[var(--border-strong)] font-bold"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={working || preview.statement.duplicate || preview.statement.errors.length > 0}
                  onClick={confirm}
                  className="min-h-12 rounded-full bg-[var(--orbit-primary)] font-extrabold text-white disabled:opacity-40"
                >
                  {working ? 'Importando...' : 'Confirmar informe'}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div>
          <h3 className="text-sm font-bold text-[var(--foreground)]">Informes importados</h3>
          {statements.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--text-muted)]">Nenhum informe anual importado.</p>
          ) : (
            <div className="mt-3 divide-y divide-[var(--border)] rounded-[14px] border border-[var(--border)]">
              {statements.map((statement) => (
                <article key={statement.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <strong className="text-sm text-[var(--foreground)]">{statement.payerName}</strong>
                      <p className="text-xs text-[var(--text-muted)]">
                        Ano-calendário {statement.calendarYear} · {statement.payerTaxId}
                      </p>
                    </div>
                    <strong className="text-sm text-[var(--foreground)]">{money(statement.taxableIncomeCents)}</strong>
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    Previdência oficial {money(statement.officialPensionCents)} · IRRF {money(statement.irrfCents)} · 13º {money(statement.thirteenthSalaryCents)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-[var(--surface-raised)] p-3">
      <span className="block text-xs text-[var(--text-muted)]">{label}</span>
      <strong className="mt-1 block text-sm text-[var(--foreground)]">{value}</strong>
    </div>
  );
}

function StatementItems({ title, items }: { title: string; items: Item[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-[14px] border border-[var(--border)]">
      <div className="border-b border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--foreground)]">{title}</div>
      <div className="divide-y divide-[var(--border)]">
        {items.map((item, index) => (
          <div key={`${item.description}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
            <span className="text-[var(--text-muted)]">{item.description}</span>
            <strong className="text-[var(--foreground)]">{money(item.amountCents)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
