'use client';

import { useEffect, useState } from 'react';
import { FaSyncAlt, FaTrash } from 'react-icons/fa';

import { useInvestmentFiscalYear } from '@/app/components/pages/investment/investment-fiscal-year-context';

import { formatCurrency } from '@/app/lib/currency/format-currency';
import { parseMoneyInputToCents } from '@/app/lib/currency/parse-money-input';
import { investmentService } from '@/app/services/investment-service';
import type { ForeignInvestmentAnnualTaxReport } from '@/app/types/investment';
import type { SupportedCurrency } from '@/app/types/financial-summary';

function money(value: number | null, showValues: boolean) {
  if (!showValues) return '••••';
  if (value === null) return 'Pendente';
  return formatCurrency(value, 'BRL');
}

export function ForeignInvestmentAnnualTaxCard({
  showValues,
}: {
  showValues: boolean;
}) {
  const currentYear = new Date().getUTCFullYear();
  const { year, setYear } = useInvestmentFiscalYear();
  const initialYear = Math.max(2024, year);
  const [report, setReport] =
    useState<ForeignInvestmentAnnualTaxReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [creditEvent, setCreditEvent] = useState('');
  const [creditCountry, setCreditCountry] = useState('US');
  const [creditCurrency, setCreditCurrency] =
    useState<SupportedCurrency>('USD');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDate, setCreditDate] = useState('');
  const [creditBasis, setCreditBasis] =
    useState<'TREATY' | 'RECIPROCITY'>('RECIPROCITY');
  const [creditNonRefundable, setCreditNonRefundable] = useState(false);
  const [creditNote, setCreditNote] = useState('');
  const [savingCredit, setSavingCredit] = useState(false);
  const [removingCreditId, setRemovingCreditId] = useState('');

  async function load(selectedYear: number) {
    const response =
      await investmentService.getForeignAnnualTaxReport(selectedYear);
    setReport(response.data);
  }

  useEffect(() => {
    let cancelled = false;
    void investmentService
      .getForeignAnnualTaxReport(initialYear)
      .then((response) => {
        if (!cancelled) setReport(response.data);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Não foi possível apurar os investimentos no exterior',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialYear]);

  function changeYear(selectedYear: number) {
    setYear(selectedYear);
  }

  async function refreshPtax() {
    setRefreshing(true);
    setError('');
    setNotice('');
    try {
      const response =
        await investmentService.refreshForeignInvestmentPtax(year);
      const result = response.data;
      setNotice(
        `${result.fetched} PTAX buscada(s), ${result.reused} já disponível(is)` +
          (result.failed.length > 0
            ? ` e ${result.failed.length} falha(s).`
            : '.'),
      );
      await load(year);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível atualizar a PTAX',
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function createForeignTaxCredit() {
    if (!report || !creditEvent) {
      setError('Selecione o rendimento ou venda relacionado ao imposto pago.');
      return;
    }
    const amountCents = parseMoneyInputToCents(creditAmount);
    if (amountCents === null || amountCents <= 0) {
      setError('Informe um valor de imposto pago válido.');
      return;
    }
    const [paidYear, paidMonth, paidDay] = creditDate
      .split('-')
      .map(Number);
    if (!paidYear || !paidMonth || !paidDay) {
      setError('Informe a data de pagamento do imposto.');
      return;
    }
    if (!creditNonRefundable) {
      setError('Confirme que o imposto não é reembolsável no exterior.');
      return;
    }

    const separator = creditEvent.indexOf(':');
    const eventType = creditEvent.slice(0, separator) as 'INCOME' | 'SALE';
    const eventId = creditEvent.slice(separator + 1);

    setSavingCredit(true);
    setError('');
    setNotice('');
    try {
      await investmentService.createForeignTaxPaid({
        eventType,
        eventId,
        countryCode: creditCountry,
        currency: creditCurrency,
        amountCents,
        paidYear,
        paidMonth,
        paidDay,
        eligibilityBasis: creditBasis,
        nonRefundableConfirmed: true,
        note: creditNote || null,
      });
      setCreditAmount('');
      setCreditDate('');
      setCreditNote('');
      setCreditNonRefundable(false);
      setNotice(
        'Imposto pago no exterior registrado. Atualize a PTAX se o crédito ficar pendente.',
      );
      await load(year);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível registrar o imposto pago no exterior',
      );
    } finally {
      setSavingCredit(false);
    }
  }

  async function removeForeignTaxCredit(id: string) {
    setRemovingCreditId(id);
    setError('');
    setNotice('');
    try {
      await investmentService.removeForeignTaxPaid(id);
      setNotice('Registro de imposto pago no exterior removido.');
      await load(year);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível remover o imposto pago no exterior',
      );
    } finally {
      setRemovingCreditId('');
    }
  }

  const years = Array.from(
    { length: Math.max(1, currentYear - 2024 + 1) },
    (_, index) => currentYear - index,
  ).filter((item) => item >= 2024);

  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Investimentos no exterior
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Apuração anual em reais · Lei 14.754/2023 · alíquota de 15%.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={year}
            onChange={(event) => void changeYear(Number(event.target.value))}
            className="ds-control min-h-10 px-3 text-sm"
            disabled={loading || refreshing}
            aria-label="Ano da apuração de investimentos no exterior"
          >
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void refreshPtax()}
            disabled={loading || refreshing}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 text-xs font-bold disabled:opacity-50"
          >
            <FaSyncAlt
              aria-hidden="true"
              className={refreshing ? 'animate-spin' : undefined}
            />
            {refreshing ? 'Atualizando...' : 'Atualizar PTAX'}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-[12px] border border-[var(--expense)]/30 p-3 text-sm text-[var(--expense)]">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-4 rounded-[12px] border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm text-[var(--text-muted)]">
          {notice}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Apurando...</p>
      ) : !report ? null : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric
              label="Resultado de vendas"
              value={money(report.summary.saleResultCents, showValues)}
            />
            <Metric
              label="Rendimentos"
              value={money(report.summary.incomeCents, showValues)}
            />
            <Metric
              label="Base após perdas"
              value={money(report.summary.taxableBaseCents, showValues)}
            />
            <Metric
              label="IRPF bruto · 15%"
              value={money(report.summary.taxDueCents, showValues)}
            />
            <Metric
              label="Crédito de imposto exterior"
              value={money(
                report.summary.foreignTaxCreditAppliedCents,
                showValues,
              )}
            />
            <Metric
              label="IRPF líquido"
              value={money(report.summary.netTaxDueCents, showValues)}
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Perda trazida"
              value={money(report.summary.openingLossCents, showValues)}
            />
            <Metric
              label="Perda compensada"
              value={money(report.summary.compensatedLossCents, showValues)}
            />
            <Metric
              label="Perda para anos seguintes"
              value={money(report.summary.closingLossCents, showValues)}
            />
            <Metric
              label="Imposto exterior não aproveitado"
              value={money(report.summary.foreignTaxExcessCents, showValues)}
            />
          </div>

          {report.status === 'PENDING' && (
            <div className="mt-4 rounded-[14px] bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
              <strong className="block text-sm">Apuração pendente</strong>
              <span className="mt-1 block">
                O imposto não é fechado enquanto houver PTAX, classificação,
                custo fiscal ou crédito de imposto exterior sem base auditável.
              </span>
            </div>
          )}

          {report.pending.length > 0 && (
            <div className="mt-4 space-y-2">
              {report.pending.map((item, index) => (
                <div
                  key={[
                    item.code,
                    item.year,
                    item.eventId ?? item.assetId ?? index,
                  ].join(':')}
                  className="rounded-[12px] border border-[var(--border)] p-3 text-xs"
                >
                  <strong className="text-[var(--foreground)]">
                    {item.symbol ?? `Ano ${item.year}`} · {item.code}
                  </strong>
                  <span className="mt-1 block text-[var(--text-muted)]">
                    {item.message}
                  </span>
                </div>
              ))}
            </div>
          )}

          <details className="mt-4 rounded-[14px] border border-[var(--border)] p-3">
            <summary className="cursor-pointer text-sm font-bold text-[var(--foreground)]">
              Imposto pago no exterior
            </summary>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs font-semibold text-[var(--text-muted)] lg:col-span-2">
                Rendimento ou venda
                <select
                  value={creditEvent}
                  onChange={(event) => setCreditEvent(event.target.value)}
                  className="ds-control mt-1 min-h-10 w-full px-3 text-sm"
                  disabled={savingCredit}
                >
                  <option value="">Selecione...</option>
                  {report.incomes
                    .filter(
                      (item) =>
                        item.incomeType === 'DIVIDEND' ||
                        item.incomeType === 'INTEREST',
                    )
                    .map((item) => (
                      <option
                        key={'INCOME:' + item.eventId}
                        value={'INCOME:' + item.eventId}
                      >
                        {item.symbol} · {item.incomeType} · {item.date}
                      </option>
                    ))}
                  {report.sales.map((item) => (
                    <option
                      key={'SALE:' + item.eventId}
                      value={'SALE:' + item.eventId}
                    >
                      {item.symbol} · venda · {item.date}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold text-[var(--text-muted)]">
                País (ISO 2)
                <input
                  value={creditCountry}
                  onChange={(event) =>
                    setCreditCountry(event.target.value.toUpperCase().slice(0, 2))
                  }
                  className="ds-control mt-1 min-h-10 w-full px-3 text-sm uppercase"
                  placeholder="US"
                  disabled={savingCredit}
                />
              </label>

              <label className="text-xs font-semibold text-[var(--text-muted)]">
                Valor pago
                <input
                  value={creditAmount}
                  onChange={(event) => setCreditAmount(event.target.value)}
                  className="ds-control mt-1 min-h-10 w-full px-3 text-sm"
                  inputMode="decimal"
                  placeholder="0,00"
                  disabled={savingCredit}
                />
              </label>

              <label className="text-xs font-semibold text-[var(--text-muted)]">
                Moeda
                <select
                  value={creditCurrency}
                  onChange={(event) =>
                    setCreditCurrency(event.target.value as SupportedCurrency)
                  }
                  className="ds-control mt-1 min-h-10 w-full px-3 text-sm"
                  disabled={savingCredit}
                >
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </label>

              <label className="text-xs font-semibold text-[var(--text-muted)]">
                Data do pagamento
                <input
                  type="date"
                  value={creditDate}
                  onChange={(event) => setCreditDate(event.target.value)}
                  className="ds-control mt-1 min-h-10 w-full px-3 text-sm"
                  disabled={savingCredit}
                />
              </label>

              <label className="text-xs font-semibold text-[var(--text-muted)]">
                Base da compensação
                <select
                  value={creditBasis}
                  onChange={(event) =>
                    setCreditBasis(
                      event.target.value as 'TREATY' | 'RECIPROCITY',
                    )
                  }
                  className="ds-control mt-1 min-h-10 w-full px-3 text-sm"
                  disabled={savingCredit}
                >
                  <option value="RECIPROCITY">Reciprocidade</option>
                  <option value="TREATY">Acordo/tratado</option>
                </select>
              </label>

              <label className="text-xs font-semibold text-[var(--text-muted)] sm:col-span-2">
                Nota opcional
                <input
                  value={creditNote}
                  onChange={(event) => setCreditNote(event.target.value)}
                  className="ds-control mt-1 min-h-10 w-full px-3 text-sm"
                  maxLength={500}
                  disabled={savingCredit}
                />
              </label>

              <label className="flex items-start gap-2 text-xs text-[var(--text-muted)] lg:col-span-3">
                <input
                  type="checkbox"
                  checked={creditNonRefundable}
                  onChange={(event) =>
                    setCreditNonRefundable(event.target.checked)
                  }
                  className="mt-0.5"
                  disabled={savingCredit}
                />
                Confirmo que este imposto não é passível de reembolso,
                restituição, ressarcimento ou compensação no exterior.
              </label>

              <div className="lg:col-span-3">
                <button
                  type="button"
                  onClick={() => void createForeignTaxCredit()}
                  disabled={savingCredit || !creditNonRefundable}
                  className="inline-flex min-h-10 items-center rounded-full bg-[var(--foreground)] px-4 text-xs font-bold text-[var(--background)] disabled:opacity-40"
                >
                  {savingCredit ? 'Registrando...' : 'Registrar imposto pago'}
                </button>
              </div>
            </div>

            {report.foreignTaxCredits.length > 0 && (
              <div className="mt-4 space-y-2">
                {report.foreignTaxCredits.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[12px] bg-[var(--surface-raised)] p-3 text-xs"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <strong className="text-[var(--foreground)]">
                          {item.symbol} · {item.eventType === 'INCOME' ? 'rendimento' : 'venda'} · {item.countryCode}
                        </strong>
                        <span className="mt-1 block text-[var(--text-muted)]">
                          Pago em {item.paidDate} · {item.eligibilityBasis === 'TREATY' ? 'tratado' : 'reciprocidade'} · {item.status}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void removeForeignTaxCredit(item.id)}
                        disabled={removingCreditId !== ''}
                        className="inline-flex min-h-8 items-center gap-2 rounded-full border border-[var(--border-strong)] px-3 text-[11px] font-bold disabled:opacity-40"
                      >
                        <FaTrash aria-hidden="true" />
                        {removingCreditId === item.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    </div>
                    <div className="mt-2 grid gap-1 text-[var(--text-muted)] sm:grid-cols-2 lg:grid-cols-5">
                      <span>
                        Pago: {showValues ? formatCurrency(item.amountCents, item.currency) : '••••'}
                      </span>
                      <span>
                        Em BRL: {money(item.amountBrlCents, showValues)}
                      </span>
                      <span>
                        Limite do evento: {money(item.eventBrazilianTaxCapCents, showValues)}
                      </span>
                      <span>
                        Limite da aplicação/ano: {money(item.assetYearBrazilianTaxCapCents, showValues)}
                      </span>
                      <span>
                        Crédito elegível: {money(item.eligibleCreditCents, showValues)}
                      </span>
                    </div>
                    {item.note ? (
                      <span className="mt-2 block text-[var(--text-subtle)]">
                        {item.note}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </details>

          {report.annualRows.length > 0 && (
            <details className="mt-4 rounded-[14px] border border-[var(--border)] p-3">
              <summary className="cursor-pointer text-sm font-bold text-[var(--foreground)]">
                Histórico da compensação de perdas
              </summary>
              <div className="mt-3 space-y-2">
                {report.annualRows.map((row) => (
                  <div
                    key={row.year}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-[var(--surface-raised)] p-3 text-xs"
                  >
                    <strong className="text-[var(--foreground)]">
                      {row.year} · {row.status === 'OK' ? 'Fechado' : 'Pendente'}
                    </strong>
                    <span className="text-[var(--text-muted)]">
                      Base: {money(row.taxableBaseCents, showValues)} · Bruto:{' '}
                      {money(row.taxDueCents, showValues)} · Crédito:{' '}
                      {money(row.foreignTaxCreditAppliedCents, showValues)} · Líquido:{' '}
                      {money(row.netTaxDueCents, showValues)} · Perda final:{' '}
                      {money(row.closingLossCents, showValues)}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}

          <p className="mt-4 text-[11px] leading-relaxed text-[var(--text-subtle)]">
            Compras usam PTAX de compra para formar custo em reais; vendas e
            rendimentos usam a conversão aplicável ao fato gerador. Imposto pago
            no exterior usa PTAX de compra na data do pagamento, é limitado ao
            imposto brasileiro do mesmo evento e não gera crédito para outro ano.
          </p>
        </>
      )}
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-[var(--surface-raised)] p-4">
      <span className="text-xs font-semibold text-[var(--text-muted)]">
        {label}
      </span>
      <strong className="mt-1 block text-sm text-[var(--foreground)]">
        {value}
      </strong>
    </div>
  );
}
