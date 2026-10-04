'use client';

import { useEffect, useState } from 'react';

import { formatCurrency } from '@/app/lib/currency/format-currency';
import { investmentService } from '@/app/services/investment-service';
import type { InvestmentAnnualTaxSupportReport } from '@/app/types/investment';

export function AnnualTaxSupportReportCard({
  showValues,
}: {
  showValues: boolean;
}) {
  const currentYear = new Date().getFullYear();
  const lastClosedYear = currentYear - 1;
  const [year, setYear] = useState(lastClosedYear);
  const [report, setReport] =
    useState<InvestmentAnnualTaxSupportReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(selectedYear: number) {
    const response =
      await investmentService.getAnnualTaxSupportReport(selectedYear);
    setReport(response.data);
  }

  useEffect(() => {
    let cancelled = false;

    void investmentService
      .getAnnualTaxSupportReport(lastClosedYear)
      .then((response) => {
        if (!cancelled) setReport(response.data);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Não foi possível gerar o relatório anual',
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
          : 'Não foi possível gerar o relatório anual',
      );
    } finally {
      setLoading(false);
    }
  }

  const years = Array.from(
    { length: 6 },
    (_, index) => lastClosedYear - index,
  );

  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Relatório anual de apoio ao IR
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Visão consolidada para conferência e preenchimento manual da
            declaração.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={year}
            onChange={(event) => void changeYear(Number(event.target.value))}
            className="ds-control min-h-10 px-3 text-sm"
            disabled={loading}
            aria-label="Ano do relatório anual"
          >
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <a
            href={'/api/investments/annual-tax-support/export?year=' + year + '&format=csv'}
            className="inline-flex min-h-10 items-center rounded-full border border-[var(--border-strong)] px-4 text-xs font-bold"
          >
            Exportar CSV
          </a>
          <a
            href={'/api/investments/annual-tax-support/export?year=' + year + '&format=pdf'}
            className="inline-flex min-h-10 items-center rounded-full border border-[var(--border-strong)] px-4 text-xs font-bold"
          >
            Exportar PDF
          </a>
        </div>
      </div>

      <div className="mt-3 rounded-[12px] bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
        Documento de apoio. Não substitui nem transmite a declaração oficial à
        Receita Federal.
      </div>

      {error && (
        <p className="mt-4 rounded-[12px] border border-[var(--expense)]/30 p-3 text-sm text-[var(--expense)]">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Consolidando o ano fiscal...
        </p>
      ) : !report ? null : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Metric label="Status" value={statusLabel(report.status)} />
            <Metric
              label="Ativos em 31/12"
              value={String(report.summary.assetCount)}
            />
            <Metric
              label="Rendimentos"
              value={String(report.summary.incomeEventCount)}
            />
            <Metric
              label="Vendas"
              value={String(report.summary.saleCount)}
            />
            <Metric
              label="Folha x informe"
              value={String(report.summary.payrollReconciliationGroups)}
            />
            <Metric
              label="Pendências"
              value={String(report.summary.pendingActive)}
            />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <Section title="Patrimônio em 31/12">
              {report.patrimony.comparison.length === 0 ? (
                <Empty />
              ) : (
                report.patrimony.comparison.map((item) => (
                  <Row
                    key={item.assetId}
                    title={item.symbol}
                    detail={item.previousQuantity + ' → ' + item.currentQuantity + ' un.'}
                    value={
                      showValues
                        ? formatCurrency(
                            item.previousCostBasisCents,
                            item.currency,
                          ) +
                          ' → ' +
                          formatCurrency(
                            item.currentCostBasisCents,
                            item.currency,
                          )
                        : '••••'
                    }
                    status={item.status}
                  />
                ))
              )}
            </Section>

            <Section title="Rendimentos e proventos">
              {report.incomes.items.length === 0 ? (
                <Empty />
              ) : (
                report.incomes.items.map((item) => (
                  <Row
                    key={[
                      item.assetId,
                      item.incomeType,
                      item.institutionId,
                    ].join(':')}
                    title={item.symbol + ' · ' + item.incomeType}
                    detail={item.institutionName}
                    value={
                      showValues
                        ? formatCurrency(item.netAmountCents, item.currency)
                        : '••••'
                    }
                    status={item.pending.length ? 'PENDING' : 'OK'}
                  />
                ))
              )}
            </Section>

            <Section title="Vendas e resultado realizado">
              {report.realized.monthlyGroups.length === 0 ? (
                <Empty />
              ) : (
                report.realized.monthlyGroups.map((item) => (
                  <Row
                    key={[item.month, item.assetType, item.currency].join(':')}
                    title={
                      String(item.month).padStart(2, '0') +
                      '/' +
                      year +
                      ' · ' +
                      item.assetType
                    }
                    detail={item.saleCount + ' venda(s) · ' + item.currency}
                    value={
                      item.status === 'PENDING'
                        ? 'Pendente'
                        : showValues
                          ? formatCurrency(
                              item.realizedResultCents,
                              item.currency,
                            )
                          : '••••'
                    }
                    status={item.status}
                  />
                ))
              )}
            </Section>

            <Section title="IRRF, DARF e prejuízos">
              {report.taxes.rows.length === 0 &&
              report.taxLosses.rows.length === 0 ? (
                <Empty />
              ) : (
                <>
                  {report.taxLosses.closingBalances.map((item) => (
                    <Row
                      key={'loss:' + item.assetType + ':' + item.currency}
                      title={'Prejuízo · ' + item.assetType}
                      detail={item.currency}
                      value={
                        showValues
                          ? formatCurrency(
                              item.closingLossCents,
                              item.currency,
                            )
                          : '••••'
                      }
                      status="OK"
                    />
                  ))}
                  {report.taxes.rows.map((item) => (
                    <Row
                      key={
                        'tax:' +
                        item.month +
                        ':' +
                        item.taxGroup +
                        ':' +
                        item.currency
                      }
                      title={
                        'IRRF/DARF · ' +
                        String(item.month).padStart(2, '0') +
                        '/' +
                        year
                      }
                      detail={item.taxGroup + ' · ' + item.currency}
                      value={
                        showValues
                          ? 'IRRF ' +
                            formatCurrency(
                              item.withholdingCents,
                              item.currency,
                            ) +
                            ' · DARF ' +
                            formatCurrency(
                              item.paidDarfCents,
                              item.currency,
                            )
                          : '••••'
                      }
                      status={item.status}
                    />
                  ))}
                </>
              )}
            </Section>

            <Section title="Informes financeiros">
              {report.financialStatementReconciliation.statementCount === 0 ? (
                <Empty />
              ) : (
                <>
                  {report.financialStatementReconciliation.positions.map(
                    (item, index) => (
                      <Row
                        key={
                          'statement-position:' +
                          (item.statementId ?? 'internal') +
                          ':' +
                          String(item.positionIndex ?? index)
                        }
                        title={(item.symbol ?? item.description) + ' · posição'}
                        detail={
                          'Sistema ' +
                          (item.internalQuantity ?? 'não informado') +
                          ' · Informe ' +
                          (item.statementQuantity ?? 'não informado')
                        }
                        value={item.status}
                        status={item.status}
                      />
                    ),
                  )}
                  {report.financialStatementReconciliation.incomes.map(
                    (item, index) => (
                      <Row
                        key={'statement-income:' + (item.symbol ?? 'unlinked') + ':' + index}
                        title={(item.symbol ?? item.descriptions[0] ?? 'Rendimento') + ' · rendimento'}
                        detail={
                          'Sistema ' +
                          (showValues && item.internalAmountCents !== null
                            ? formatCurrency(item.internalAmountCents, item.currency)
                            : item.internalAmountCents === null
                              ? 'não informado'
                              : '••••') +
                          ' · Informe ' +
                          (showValues && item.statementAmountCents !== null
                            ? formatCurrency(item.statementAmountCents, item.currency)
                            : item.statementAmountCents === null
                              ? 'não informado'
                              : '••••')
                        }
                        value={item.status}
                        status={item.status}
                      />
                    ),
                  )}
                </>
              )}
            </Section>

            <Section title="Rendimentos do trabalho">
              {report.payrollReconciliation.items.length === 0 ? (
                <Empty />
              ) : (
                report.payrollReconciliation.items.map((item) => (
                  <Row
                    key={'payroll:' + item.employerCnpj}
                    title={item.employerName}
                    detail={
                      item.employerCnpj +
                      ' · ' +
                      item.components.filter((component) => component.status !== 'MATCHED').length +
                      ' item(ns) para revisar'
                    }
                    value={
                      item.components.filter((component) => component.status === 'MATCHED').length +
                      '/' +
                      item.components.length +
                      ' conciliados'
                    }
                    status={item.status}
                  />
                ))
              )}
            </Section>
          </div>

          <Section title="Pendências e notas de auditoria" className="mt-3">
            {report.pendencies.items.length === 0 &&
            report.notes.length === 0 ? (
              <Empty />
            ) : (
              <>
                {report.pendencies.items.map((item) => (
                  <Row
                    key={item.fingerprint}
                    title={item.title}
                    detail={item.message}
                    value={
                      item.status === 'JUSTIFIED'
                        ? 'Justificada'
                        : item.suggestedAction
                    }
                    status={item.status}
                  />
                ))}
                {report.notes.map((note, index) => (
                  <Row
                    key={note.type + ':' + index}
                    title={note.title}
                    detail={note.detail}
                    value={note.type}
                    status="NOTE"
                  />
                ))}
              </>
            )}
          </Section>
        </>
      )}
    </article>
  );
}

function statusLabel(
  status: InvestmentAnnualTaxSupportReport['status'],
) {
  if (status === 'COMPLETE') return 'Completo';
  if (status === 'COMPLETE_WITH_JUSTIFICATIONS') {
    return 'Completo com justificativas';
  }
  return 'Incompleto';
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-[var(--surface-raised)] p-4">
      <span className="text-xs font-semibold text-[var(--text-muted)]">
        {label}
      </span>
      <strong className="mt-1 block text-base text-[var(--foreground)]">
        {value}
      </strong>
    </div>
  );
}

function Section({
  title,
  className = '',
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={
        className +
        ' rounded-[14px] border border-[var(--border)] p-4'
      }
    >
      <h3 className="text-sm font-bold text-[var(--foreground)]">{title}</h3>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function Row({
  title,
  detail,
  value,
  status,
}: {
  title: string;
  detail: string;
  value: string;
  status: string;
}) {
  return (
    <div className="rounded-xl bg-[var(--surface-raised)] p-3 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <strong className="text-[var(--foreground)]">{title}</strong>
        <span className="font-semibold text-[var(--foreground)]">{value}</span>
      </div>
      <p className="mt-1 leading-relaxed text-[var(--text-muted)]">{detail}</p>
      <span className="mt-1 block text-[11px] font-semibold text-[var(--text-muted)]">
        {status}
      </span>
    </div>
  );
}

function Empty() {
  return (
    <p className="text-xs text-[var(--text-muted)]">
      Nenhum dado para esta seção.
    </p>
  );
}
