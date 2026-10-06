'use client';

import { useEffect, useState } from 'react';
import { FaFileImport, FaRedo } from 'react-icons/fa';

import ConfirmationModal from '@/app/components/overlays/confirmation-modal';

import { formatCurrency } from '@/app/lib/currency/format-currency';
import { investmentService } from '@/app/services/investment-service';
import type {
  AnnualFinancialStatementReconciliation,
  AnnualFinancialTaxStatement,
  AnnualFinancialTaxStatementPreview,
  AnnualStatementReconciliationStatus,
} from '@/app/types/investment';

type PreviewEnvelope = {
  fileName: string;
  pageCount?: number;
  requiresOcr: boolean;
  previewToken: string | null;
  statement: AnnualFinancialTaxStatementPreview | null;
  warnings: string[];
};

function money(value: number | null, showValues: boolean) {
  if (!showValues) return value === null ? 'Não informado' : '••••';
  return value === null ? 'Não informado' : formatCurrency(value, 'BRL');
}

function quantity(value: string | null) {
  return value === null ? 'Não informado' : value.replace('.', ',');
}

function statusLabel(status: AnnualStatementReconciliationStatus) {
  if (status === 'MATCHED') return 'Conciliado';
  if (status === 'MISMATCH') return 'Divergente';
  if (status === 'MISSING_INTERNAL') return 'Só no informe';
  if (status === 'MISSING_STATEMENT_DATA') return 'Só no sistema';
  return 'Revisar';
}

function statusClass(status: AnnualStatementReconciliationStatus) {
  if (status === 'MATCHED') {
    return 'bg-[var(--success-subtle)] text-[var(--success)]';
  }
  if (status === 'MISMATCH') {
    return 'bg-[var(--danger-subtle)] text-[var(--expense)]';
  }
  return 'bg-[var(--warning-subtle)] text-[var(--warning)]';
}

export function AnnualFinancialStatementCard({
  showValues,
  onInspectAsset,
  onBaselineApplied,
}: {
  showValues: boolean;
  onInspectAsset: (assetId: string) => void;
  onBaselineApplied?: () => void | Promise<void>;
}) {
  const lastClosedYear = new Date().getUTCFullYear() - 1;
  const [year, setYear] = useState(lastClosedYear);
  const [statements, setStatements] = useState<AnnualFinancialTaxStatement[]>([]);
  const [reconciliation, setReconciliation] =
    useState<AnnualFinancialStatementReconciliation | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [baselineKey, setBaselineKey] = useState('');
  const [pendingBaseline, setPendingBaseline] = useState<{
    statementId: string;
    positionIndex: number;
    symbol: string;
  } | null>(null);
  const [withholdingDraft, setWithholdingDraft] = useState<{
    index: number;
    date: string;
  } | null>(null);
  const [withholdingSaving, setWithholdingSaving] = useState(false);
  const [error, setError] = useState('');

  async function load(selectedYear: number) {
    const [listResponse, reconciliationResponse] = await Promise.all([
      investmentService.listAnnualFinancialTaxStatements(),
      investmentService.getAnnualFinancialStatementReconciliation(selectedYear),
    ]);
    setStatements(listResponse.data);
    setReconciliation(reconciliationResponse.data);
  }

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      investmentService.listAnnualFinancialTaxStatements(),
      investmentService.getAnnualFinancialStatementReconciliation(lastClosedYear),
    ])
      .then(([listResponse, reconciliationResponse]) => {
        if (cancelled) return;
        setStatements(listResponse.data);
        setReconciliation(reconciliationResponse.data);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Não foi possível carregar os informes anuais financeiros',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lastClosedYear]);

  async function changeYear(selectedYear: number) {
    setYear(selectedYear);
    setLoading(true);
    setError('');
    try {
      await load(selectedYear);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível carregar a reconciliação anual',
      );
    } finally {
      setLoading(false);
    }
  }

  async function analyze() {
    if (!file) return;
    setWorking(true);
    setError('');
    try {
      const response =
        await investmentService.previewAnnualFinancialTaxStatement(file);
      setPreview(response.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível analisar o informe',
      );
    } finally {
      setWorking(false);
    }
  }

  async function confirmImport() {
    if (!preview?.statement || !preview.previewToken) return;
    setWorking(true);
    setError('');
    try {
      await investmentService.confirmAnnualFinancialTaxStatement({
        previewToken: preview.previewToken,
        selected: true,
        statement: preview.statement,
      });
      await load(preview.statement.calendarYear);
      setYear(preview.statement.calendarYear);
      setPreview(null);
      setFile(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível importar o informe',
      );
    } finally {
      setWorking(false);
    }
  }

  async function applyBaseline(
    statementId: string,
    positionIndex: number,
  ) {
    const key = statementId + ':' + positionIndex;
    setBaselineKey(key);
    setError('');
    try {
      await investmentService.applyAnnualFinancialStatementBaseline({
        statementId,
        positionIndex,
      });
      await load(year);
      await onBaselineApplied?.();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível aplicar o baseline fiscal',
      );
    } finally {
      setBaselineKey('');
      setPendingBaseline(null);
    }
  }

  async function registerWithholding(
    item: AnnualFinancialStatementReconciliation['withholdings'][number],
    index: number,
  ) {
    if (
      !withholdingDraft ||
      withholdingDraft.index !== index ||
      !withholdingDraft.date ||
      item.statementAmountCents === null ||
      !item.internalAssetType
    ) {
      setError('Informe a data/competência exata do IRRF antes de registrar.');
      return;
    }
    const [entryYear, entryMonth, entryDay] = withholdingDraft.date
      .split('-')
      .map(Number);
    if (!entryYear || !entryMonth || !entryDay || entryYear !== year) {
      setError(`A data do IRRF deve pertencer ao ano-calendário ${year}.`);
      return;
    }

    setWithholdingSaving(true);
    setError('');
    try {
      await investmentService.createTaxWithholding({
        assetType: item.internalAssetType,
        currency: item.currency,
        amountCents: item.statementAmountCents,
        year: entryYear,
        month: entryMonth,
        day: entryDay,
        assetId: item.internalAssetId,
        note:
          'Registro explícito após reconciliação com informe anual financeiro.',
      });
      setWithholdingDraft(null);
      await load(year);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível registrar o IRRF reconciliado',
      );
    } finally {
      setWithholdingSaving(false);
    }
  }

  const years = Array.from({ length: 6 }, (_, index) => lastClosedYear - index);
  const statementsForYear = statements.filter(
    (statement) => statement.calendarYear === year,
  );

  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Informes anuais financeiros
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Use o informe de banco/corretora como checkpoint externo para conferir posições, custo fiscal e rendimentos.
          </p>
        </div>
        <select
          value={year}
          onChange={(event) => void changeYear(Number(event.target.value))}
          className="ds-control min-h-10 px-3 text-sm"
          disabled={loading || working}
          aria-label="Ano dos informes financeiros"
        >
          {years.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-[12px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
        >
          {error}
        </p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section className="rounded-[14px] border border-[var(--border)] p-4">
          <h3 className="text-sm font-bold text-[var(--foreground)]">
            Importar informe Nubank
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
            O PDF é analisado antes da confirmação. O documento não cria operações econômicas.
          </p>

          {!preview ? (
            <div className="mt-4 space-y-3">
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
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--orbit-primary)] px-4 text-sm font-extrabold text-white disabled:opacity-40"
              >
                <FaFileImport aria-hidden="true" />
                {working ? 'Analisando...' : 'Analisar informe'}
              </button>
            </div>
          ) : preview.requiresOcr ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-[12px] bg-[var(--warning-subtle)] p-3 text-xs text-[var(--text-muted)]">
                <strong className="text-[var(--foreground)]">OCR/revisão necessária</strong>
                <p className="mt-1">{preview.warnings[0]}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-[var(--border-strong)] text-xs font-bold"
              >
                <FaRedo aria-hidden="true" /> Escolher outro PDF
              </button>
            </div>
          ) : preview.statement ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-[12px] bg-[var(--surface-raised)] p-3">
                <strong className="text-sm text-[var(--foreground)]">
                  {preview.statement.sourceInstitution} · {preview.statement.calendarYear}
                </strong>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {preview.statement.sourceInstitutionCnpj ?? 'CNPJ não reconhecido'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Metric
                  label="Patrimônio"
                  value={String(preview.statement.positions.length)}
                />
                <Metric
                  label="Rendimentos"
                  value={String(preview.statement.incomes.length)}
                />
              </div>

              {preview.statement.positions.length > 0 && (
                <details className="rounded-[12px] border border-[var(--border)] p-3">
                  <summary className="cursor-pointer text-xs font-bold text-[var(--foreground)]">
                    Itens patrimoniais
                  </summary>
                  <div className="mt-2 space-y-2">
                    {preview.statement.positions.map((position, index) => (
                      <div
                        key={(position.symbol ?? position.description) + ':' + index}
                        className="rounded-[10px] bg-[var(--surface-raised)] p-2 text-xs"
                      >
                        <strong className="text-[var(--foreground)]">
                          {position.symbol ?? position.description}
                        </strong>
                        <p className="mt-1 text-[var(--text-muted)]">
                          31/12: {quantity(position.currentYearQuantity)} un. · custo{' '}
                          {money(position.currentYearCostCents, showValues)}
                          {position.currentYearBalanceCents !== null
                            ? ' · saldo ' + money(position.currentYearBalanceCents, showValues)
                            : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {preview.statement.errors.length > 0 && (
                <div className="rounded-[12px] bg-[var(--danger-subtle)] p-3 text-xs text-[var(--expense)]">
                  {preview.statement.errors.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              )}

              {[...new Set([...preview.warnings, ...preview.statement.warnings])].length > 0 && (
                <div className="rounded-[12px] bg-[var(--warning-subtle)] p-3 text-xs text-[var(--text-muted)]">
                  {[...new Set([...preview.warnings, ...preview.statement.warnings])].map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              )}

              {preview.statement.duplicate && (
                <p className="rounded-[12px] bg-[var(--surface-raised)] p-3 text-xs text-[var(--text-muted)]">
                  Este informe já foi importado.
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={working}
                  onClick={() => setPreview(null)}
                  className="min-h-11 rounded-full border border-[var(--border-strong)] text-xs font-bold"
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
                  onClick={confirmImport}
                  className="min-h-11 rounded-full bg-[var(--orbit-primary)] text-xs font-extrabold text-white disabled:opacity-40"
                >
                  {working ? 'Importando...' : 'Confirmar informe'}
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-[14px] border border-[var(--border)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">
                Reconciliação · {year}
              </h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {statementsForYear.length} informe(s) importado(s)
              </p>
            </div>
            {reconciliation && (
              <span
                className={
                  'rounded-full px-2 py-1 text-xs font-semibold ' +
                  (reconciliation.status === 'MATCHED'
                    ? 'bg-[var(--success-subtle)] text-[var(--success)]'
                    : 'bg-[var(--warning-subtle)] text-[var(--warning)]')
                }
              >
                {reconciliation.status === 'MATCHED'
                  ? 'Conciliado'
                  : reconciliation.summary.reviewCount + ' para revisar'}
              </span>
            )}
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              Recalculando...
            </p>
          ) : !reconciliation || reconciliation.statementCount === 0 ? (
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              Nenhum informe financeiro importado para {year}.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <Metric
                  label="Posições"
                  value={String(reconciliation.summary.positions.total)}
                />
                <Metric
                  label="Posições OK"
                  value={String(reconciliation.summary.positions.matched)}
                />
                <Metric
                  label="Rendimentos"
                  value={String(reconciliation.summary.incomes.total)}
                />
                <Metric
                  label="Rendimentos OK"
                  value={String(reconciliation.summary.incomes.matched)}
                />
                <Metric
                  label="IRRF"
                  value={String(reconciliation.summary.withholdings.total)}
                />
                <Metric
                  label="IRRF OK"
                  value={String(reconciliation.summary.withholdings.matched)}
                />
              </div>

              <div>
                <h4 className="text-xs font-bold text-[var(--foreground)]">
                  Posições em 31/12
                </h4>
                <div className="mt-2 space-y-2">
                  {reconciliation.positions.map((position, index) => (
                    <details
                      key={
                        (position.statementId ?? 'internal') +
                        ':' +
                        String(position.positionIndex ?? index) +
                        ':' +
                        (position.symbol ?? position.description)
                      }
                      className="rounded-[12px] border border-[var(--border)]"
                    >
                      <summary className="cursor-pointer list-none p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <strong className="text-xs text-[var(--foreground)]">
                              {position.symbol ?? position.description}
                            </strong>
                            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                              Sistema {quantity(position.internalQuantity)} · Informe{' '}
                              {quantity(position.statementQuantity)}
                            </p>
                          </div>
                          <span
                            className={
                              'rounded-full px-2 py-1 text-[11px] font-semibold ' +
                              statusClass(position.status)
                            }
                          >
                            {statusLabel(position.status)}
                          </span>
                        </div>
                      </summary>
                      <div className="border-t border-[var(--border)] p-3">
                        {position.reason && (
                          <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                            {position.reason}
                          </p>
                        )}
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          <Metric
                            label="Custo sistema"
                            value={money(position.internalCostCents, showValues)}
                          />
                          <Metric
                            label="Custo informe"
                            value={money(position.statementCostCents, showValues)}
                          />
                          <Metric
                            label="Diferença"
                            value={money(position.costDifferenceCents, showValues)}
                          />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {position.internalAssetId && (
                            <button
                              type="button"
                              onClick={() => onInspectAsset(position.internalAssetId!)}
                              className="min-h-9 rounded-full border border-[var(--border-strong)] px-3 text-xs font-bold"
                            >
                              Ver histórico
                            </button>
                          )}
                          {position.canApplyBaseline &&
                            position.statementId &&
                            position.positionIndex !== null &&
                            position.symbol && (
                              <button
                                type="button"
                                disabled={
                                  baselineKey ===
                                  position.statementId + ':' + position.positionIndex
                                }
                                onClick={() =>
                                  setPendingBaseline({
                                    statementId: position.statementId!,
                                    positionIndex: position.positionIndex!,
                                    symbol: position.symbol!,
                                  })
                                }
                                className="min-h-9 rounded-full bg-[var(--foreground)] px-3 text-xs font-bold text-[var(--background)] disabled:opacity-40"
                              >
                                {baselineKey ===
                                position.statementId + ':' + position.positionIndex
                                  ? 'Aplicando...'
                                  : 'Usar como baseline fiscal'}
                              </button>
                            )}
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[var(--foreground)]">
                  Rendimentos anuais
                </h4>
                <div className="mt-2 space-y-2">
                  {reconciliation.incomes.map((income, index) => (
                    <details
                      key={(income.symbol ?? 'unlinked') + ':' + index}
                      className="rounded-[12px] border border-[var(--border)]"
                    >
                      <summary className="cursor-pointer list-none p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <strong className="text-xs text-[var(--foreground)]">
                              {income.symbol ?? income.descriptions[0] ?? 'Rendimento'}
                            </strong>
                            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                              Sistema {money(income.internalAmountCents, showValues)} · Informe{' '}
                              {money(income.statementAmountCents, showValues)}
                            </p>
                          </div>
                          <span
                            className={
                              'rounded-full px-2 py-1 text-[11px] font-semibold ' +
                              statusClass(income.status)
                            }
                          >
                            {statusLabel(income.status)}
                          </span>
                        </div>
                      </summary>
                      <div className="border-t border-[var(--border)] p-3">
                        {income.reason && (
                          <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                            {income.reason}
                          </p>
                        )}
                        {income.eventIds.length > 0 && (
                          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                            {income.eventIds.length} pagamento(s) compõem o total interno.
                          </p>
                        )}
                        {income.internalAssetId && (
                          <button
                            type="button"
                            onClick={() => onInspectAsset(income.internalAssetId!)}
                            className="mt-3 min-h-9 rounded-full border border-[var(--border-strong)] px-3 text-xs font-bold"
                          >
                            Ver pagamentos/histórico
                          </button>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--foreground)]">
                  IRRF do informe
                </h4>
                <div className="mt-2 space-y-2">
                  {reconciliation.withholdings.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">
                      O informe não trouxe IRRF para conciliar.
                    </p>
                  ) : (
                    reconciliation.withholdings.map((item, index) => (
                      <details
                        key={(item.symbol ?? 'unlinked-irrf') + ':' + index}
                        className="rounded-[12px] border border-[var(--border)]"
                      >
                        <summary className="cursor-pointer list-none p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <strong className="text-xs text-[var(--foreground)]">
                                {item.symbol ?? item.descriptions[0] ?? 'IRRF'}
                              </strong>
                              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                                Sistema {money(item.internalAmountCents, showValues)} · Informe{' '}
                                {money(item.statementAmountCents, showValues)}
                              </p>
                            </div>
                            <span
                              className={
                                'rounded-full px-2 py-1 text-[11px] font-semibold ' +
                                statusClass(item.status)
                              }
                            >
                              {statusLabel(item.status)}
                            </span>
                          </div>
                        </summary>
                        <div className="border-t border-[var(--border)] p-3">
                          {item.reason && (
                            <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                              {item.reason}
                            </p>
                          )}
                          {item.requiresCompetenceConfirmation && (
                            <p className="mt-2 text-[11px] leading-relaxed text-[var(--warning)]">
                              Confirme a competência/data antes de registrar ou corrigir o IRRF.
                              O informe anual não cria lançamento fiscal automaticamente.
                            </p>
                          )}
                          {item.requiresCompetenceConfirmation &&
                            item.internalAssetId &&
                            item.internalAssetType &&
                            item.statementAmountCents !== null && (
                              <div className="mt-3 rounded-[12px] bg-[var(--surface-raised)] p-3">
                                {withholdingDraft?.index === index ? (
                                  <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                                    <label className="text-xs font-semibold text-[var(--text-muted)]">
                                      Data/competência exata do IRRF
                                      <input
                                        type="date"
                                        value={withholdingDraft.date}
                                        min={`${year}-01-01`}
                                        max={`${year}-12-31`}
                                        onChange={(event) =>
                                          setWithholdingDraft({
                                            index,
                                            date: event.target.value,
                                          })
                                        }
                                        className="ds-control mt-1 min-h-11 w-full px-3 text-sm"
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      disabled={withholdingSaving}
                                      onClick={() => void registerWithholding(item, index)}
                                      className="min-h-11 rounded-full bg-[var(--foreground)] px-4 text-xs font-bold text-[var(--background)] disabled:opacity-50"
                                    >
                                      {withholdingSaving ? 'Registrando...' : 'Registrar IRRF'}
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setWithholdingDraft({ index, date: '' })}
                                    className="min-h-11 rounded-full border border-[var(--border-strong)] px-3 text-xs font-bold"
                                  >
                                    Registrar/corrigir IRRF
                                  </button>
                                )}
                              </div>
                            )}
                          {item.internalAssetId && (
                            <button
                              type="button"
                              onClick={() => onInspectAsset(item.internalAssetId!)}
                              className="mt-3 min-h-11 rounded-full border border-[var(--border-strong)] px-3 text-xs font-bold"
                            >
                              Revisar ativo
                            </button>
                          )}
                        </div>
                      </details>
                    ))
                  )}
                </div>
              </div>

              </div>
            </div>
          )}
        </section>
      </div>
      <ConfirmationModal
        isOpen={Boolean(pendingBaseline)}
        onClose={() => setPendingBaseline(null)}
        onConfirm={() => {
          if (!pendingBaseline) return;
          void applyBaseline(
            pendingBaseline.statementId,
            pendingBaseline.positionIndex,
          );
        }}
        title="Confirmar baseline fiscal"
        message={
          pendingBaseline
            ? `Usar o custo explicitamente informado para ${pendingBaseline.symbol} como baseline fiscal em 31/12/${year}? O ajuste ficará auditável e não criará compra ou venda.`
            : ''
        }
        confirmText="Usar baseline"
        variant="warning"
        isLoading={Boolean(baselineKey)}
        dangerNotice={null}
      />
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-[var(--surface-raised)] p-3">
      <span className="block text-[11px] text-[var(--text-muted)]">{label}</span>
      <strong className="mt-1 block text-xs text-[var(--foreground)]">{value}</strong>
    </div>
  );
}
