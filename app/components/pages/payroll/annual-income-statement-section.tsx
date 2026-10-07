'use client';

import { useEffect, useState } from 'react';
import { FaFileImport, FaRedo } from 'react-icons/fa';

import { useAuth } from '@/app/context/auth-context';
import { lastClosedPayrollYear } from '@/app/lib/payroll/payroll-date';
import {
  importedDocumentStatusLabel,
  payrollMoney,
} from '@/app/lib/payroll/payroll-presentation';
import { payrollService } from '@/app/services/payroll-service';
import type {
  AnnualStatementItem,
  AnnualStatementPreview,
  PayrollPage,
  StoredAnnualStatement,
} from '@/app/types/payroll';

export function AnnualIncomeStatementSection({
  onChanged,
}: {
  onChanged?: () => void | Promise<void>;
}) {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const lastClosedYear = lastClosedPayrollYear();
  const [year, setYear] = useState(lastClosedYear);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PayrollPage<StoredAnnualStatement>>({
    items: [],
    pageInfo: { page: 1, limit: 8, hasMore: false },
  });
  const [listLoading, setListLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<AnnualStatementPreview | null>(null);
  const [supersedesId, setSupersedesId] = useState('');
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState('');

  async function load() {
    const data = await payrollService.annualStatements({
      year,
      page,
      limit: 8,
    });
    setResult(data);
  }

  useEffect(() => {
    let cancelled = false;

    payrollService
      .annualStatements({ year, page, limit: 8 })
      .then((data) => {
        if (!cancelled) {
          setLoadError('');
          setResult(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('Não foi possível atualizar a lista de informes.');
        }
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, year]);

  async function retryList() {
    setListLoading(true);
    setLoadError('');
    try {
      await load();
    } catch {
      setLoadError('Não foi possível atualizar a lista de informes.');
    } finally {
      setListLoading(false);
    }
  }

  async function refreshAfterMutation() {
    try {
      await load();
      setLoadError('');
    } catch {
      setLoadError(
        'A alteração foi concluída, mas não foi possível atualizar a tela. Tente recarregar a lista.',
      );
    }
    await onChanged?.();
  }

  async function analyze() {
    if (!file) return;
    setWorking(true);
    setActionError('');
    setFeedback('');
    try {
      setPreview(await payrollService.previewAnnualStatement(file));
      setSupersedesId('');
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível analisar o informe.',
      );
    } finally {
      setWorking(false);
    }
  }

  async function archiveStatement(id: string) {
    if (
      !window.confirm(
        'Arquivar este informe? Ele deixará de participar da conciliação anual, mas continuará no histórico.',
      )
    ) {
      return;
    }
    setWorking(true);
    setActionError('');
    setFeedback('');
    try {
      await payrollService.archiveAnnualStatement(id);
      setFeedback('Informe arquivado.');
      await refreshAfterMutation();
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível arquivar o informe.',
      );
    } finally {
      setWorking(false);
    }
  }

  async function confirm() {
    if (!preview?.statement || !preview.previewToken) return;
    setWorking(true);
    setActionError('');
    setFeedback('');

    try {
      await payrollService.confirmAnnualStatement({
        previewToken: preview.previewToken,
        selected: true,
        statement: preview.statement,
        supersedesId: supersedesId || null,
      });

      setFeedback('Informe importado.');
      setPreview(null);
      setSupersedesId('');
      setFile(null);
      setPage(1);
      await refreshAfterMutation();
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível importar o informe.',
      );
    } finally {
      setWorking(false);
    }
  }

  const years = Array.from({ length: 8 }, (_, index) => lastClosedYear - index);

  return (
    <section className="ds-panel p-4 sm:p-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Informe anual de rendimentos
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Importe o comprovante anual da fonte pagadora sem criar transações
            bancárias.
          </p>

          {feedback && (
            <div
              role="status"
              className="mt-4 rounded-[14px] bg-[var(--success-subtle)] p-3 text-sm font-semibold text-[var(--success)]"
            >
              {feedback}
            </div>
          )}

          {actionError && (
            <div
              role="alert"
              className="mt-4 rounded-[14px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
            >
              {actionError}
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
                onClick={() => void analyze()}
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
                <p className="mt-1 text-[var(--text-muted)]">
                  {preview.warnings[0]}
                </p>
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
                <strong className="block text-sm text-[var(--foreground)]">
                  {preview.statement.payerName}
                </strong>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Ano-calendário {preview.statement.calendarYear} · Exercício{' '}
                  {preview.statement.taxExercise} · {preview.statement.payerTaxId}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Metric
                  label="Tributáveis"
                  value={payrollMoney(
                    preview.statement.taxableIncomeCents,
                    showValues,
                  )}
                />
                <Metric
                  label="Previdência oficial"
                  value={payrollMoney(
                    preview.statement.officialPensionCents,
                    showValues,
                  )}
                />
                <Metric
                  label="IRRF"
                  value={payrollMoney(preview.statement.irrfCents, showValues)}
                />
                <Metric
                  label="13º salário"
                  value={payrollMoney(
                    preview.statement.thirteenthSalaryCents,
                    showValues,
                  )}
                />
                <Metric
                  label="IRRF 13º"
                  value={payrollMoney(
                    preview.statement.thirteenthIrrfCents,
                    showValues,
                  )}
                />
                <Metric
                  label="Isentos"
                  value={String(preview.statement.exemptIncome.length)}
                />
              </div>

              <StatementItems
                title="Isentos e não tributáveis"
                items={preview.statement.exemptIncome}
                showValues={showValues}
              />
              <StatementItems
                title="Tributação exclusiva"
                items={preview.statement.exclusiveTaxation}
                showValues={showValues}
              />
              <StatementItems
                title="Rendimentos recebidos acumuladamente"
                items={preview.statement.accumulatedIncome}
                showValues={showValues}
              />

              {preview.statement.notes.length > 0 && (
                <div className="rounded-[14px] bg-[var(--surface-raised)] p-3 text-xs text-[var(--text-muted)]">
                  <strong className="text-[var(--foreground)]">
                    Informações complementares
                  </strong>
                  {showValues ? (
                    preview.statement.notes.map((note) => (
                      <p key={note} className="mt-1 break-words">
                        {note}
                      </p>
                    ))
                  ) : (
                    <p className="mt-1">
                      Conteúdo oculto enquanto a visualização de valores estiver desativada.
                    </p>
                  )}
                </div>
              )}

              {preview.statement.errors.length > 0 && (
                <div className="rounded-[14px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]">
                  {preview.statement.errors.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              )}

              {preview.replacementCandidates.length > 0 &&
                !preview.statement.duplicate && (
                  <div className="rounded-[14px] border border-[var(--warning)]/35 bg-[var(--warning-subtle)] p-3 text-sm text-[var(--foreground)]">
                    <strong>Retificação / substituição</strong>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Escolha o informe vigente que esta versão substitui. O
                      anterior permanecerá no histórico.
                    </p>
                    <select
                      value={supersedesId}
                      onChange={(event) => setSupersedesId(event.target.value)}
                      className="ds-control mt-3 min-h-11 w-full px-3"
                    >
                      <option value="">Importar como informe adicional</option>
                      {preview.replacementCandidates.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          Versão de{' '}
                          {new Date(candidate.createdAt).toLocaleDateString(
                            'pt-BR',
                          )}{' '}
                          · tributável{' '}
                          {payrollMoney(
                            candidate.taxableIncomeCents,
                            showValues,
                          )}
                        </option>
                      ))}
                    </select>
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
                  disabled={
                    working ||
                    preview.statement.duplicate ||
                    preview.statement.errors.length > 0
                  }
                  onClick={() => void confirm()}
                  className="min-h-12 rounded-full bg-[var(--orbit-primary)] font-extrabold text-white disabled:opacity-40"
                >
                  {working ? 'Importando...' : 'Confirmar informe'}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">
                Informes importados
              </h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Histórico paginado por ano-calendário.
              </p>
            </div>
            <select
              aria-label="Ano dos informes importados"
              value={year}
              onChange={(event) => {
                setListLoading(true);
                setPage(1);
                setYear(Number(event.target.value));
              }}
              className="ds-control min-h-11 px-3 text-sm"
            >
              {years.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {loadError && (
            <div
              role="alert"
              className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-xs text-[var(--expense)]"
            >
              <span>{loadError}</span>
              <button
                type="button"
                onClick={() => void retryList()}
                className="min-h-11 rounded-full border border-current px-3 font-bold"
              >
                Atualizar lista
              </button>
            </div>
          )}

          {listLoading ? (
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              Carregando informes...
            </p>
          ) : result.items.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              Nenhum informe anual importado para {year}.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-[var(--border)] rounded-[14px] border border-[var(--border)]">
              {result.items.map((statement) => (
                <article key={statement.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="break-words text-sm text-[var(--foreground)]">
                          {statement.payerName}
                        </strong>
                        <span
                          className={
                            statement.lifecycleStatus === 'ACTIVE'
                              ? 'rounded-full bg-[var(--success-subtle)] px-2 py-1 text-xs font-semibold text-[var(--success)]'
                              : statement.lifecycleStatus === 'SUPERSEDED'
                                ? 'rounded-full bg-[var(--warning-subtle)] px-2 py-1 text-xs font-semibold text-[var(--warning)]'
                                : 'rounded-full bg-[var(--surface-subtle)] px-2 py-1 text-xs font-semibold text-[var(--text-muted)]'
                          }
                        >
                          {importedDocumentStatusLabel(
                            statement.lifecycleStatus,
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        Ano-calendário {statement.calendarYear} ·{' '}
                        {statement.payerTaxId}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <strong className="text-sm text-[var(--foreground)]">
                        {payrollMoney(
                          statement.taxableIncomeCents,
                          showValues,
                        )}
                      </strong>
                      {statement.lifecycleStatus === 'ACTIVE' && (
                        <button
                          type="button"
                          disabled={working}
                          onClick={() =>
                            void archiveStatement(statement.id)
                          }
                          className="min-h-11 rounded-full border border-[var(--border-strong)] px-3 text-xs font-bold disabled:opacity-40"
                        >
                          Arquivar
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 break-words text-xs text-[var(--text-muted)]">
                    Previdência oficial{' '}
                    {payrollMoney(
                      statement.officialPensionCents,
                      showValues,
                    )}{' '}
                    · IRRF{' '}
                    {payrollMoney(statement.irrfCents, showValues)} · 13º{' '}
                    {payrollMoney(
                      statement.thirteenthSalaryCents,
                      showValues,
                    )}
                  </p>
                </article>
              ))}
            </div>
          )}

          {!listLoading &&
            (page > 1 || result.pageInfo.hasMore) && (
              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => {
                    setListLoading(true);
                    setPage((current) => Math.max(1, current - 1));
                  }}
                  className="min-h-11 rounded-full border border-[var(--border-strong)] px-4 text-xs font-bold disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-xs text-[var(--text-muted)]">
                  Página {page}
                </span>
                <button
                  type="button"
                  disabled={!result.pageInfo.hasMore}
                  onClick={() => {
                    setListLoading(true);
                    setPage((current) => current + 1);
                  }}
                  className="min-h-11 rounded-full border border-[var(--border-strong)] px-4 text-xs font-bold disabled:opacity-40"
                >
                  Próxima
                </button>
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
      <strong className="mt-1 block break-words text-sm text-[var(--foreground)]">
        {value}
      </strong>
    </div>
  );
}

function StatementItems({
  title,
  items,
  showValues,
}: {
  title: string;
  items: AnnualStatementItem[];
  showValues: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-[14px] border border-[var(--border)]">
      <div className="border-b border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--foreground)]">
        {title}
      </div>
      <div className="divide-y divide-[var(--border)]">
        {items.map((item, index) => (
          <div
            key={item.description + '-' + index}
            className="grid gap-1 px-3 py-3 text-xs sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          >
            <span className="break-words text-[var(--text-muted)]">
              {item.description}
            </span>
            <strong className="text-[var(--foreground)]">
              {payrollMoney(item.amountCents, showValues)}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}
