'use client';

import { useEffect, useState } from 'react';
import { FaSyncAlt, FaTrash } from 'react-icons/fa';

import { useInvestmentFiscalYear } from '@/app/components/pages/investment/investment-fiscal-year-context';

import { formatCurrency } from '@/app/lib/currency/format-currency';
import { parseMoneyInputToCents } from '@/app/lib/currency/parse-money-input';
import { investmentService } from '@/app/services/investment-service';
import type { ForeignInvestmentAnnualTaxReport } from '@/app/types/investment';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import { Button, Input, MoneyInput, Select } from '@/app/components/ui';

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
    <article className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-surface)] p-4 sm:p-5">
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
          <Select
            ariaLabel="Ano da apuração de investimentos no exterior"
            value={year}
            onChange={(value) => void changeYear(Number(value))}
            options={years.map((item) => ({ value: item, label: String(item) }))}
            disabled={loading || refreshing}
          />
          <Button variant="outline" size="sm" pill onClick={() => void refreshPtax()} disabled={loading || refreshing}>
            <FaSyncAlt
              aria-hidden="true"
              className={refreshing ? 'animate-spin' : undefined}
            />
            {refreshing ? 'Atualizando...' : 'Atualizar PTAX'}
          </Button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-[var(--radius-md)] border border-[var(--expense)]/30 p-3 text-sm text-[var(--expense)]">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm text-[var(--text-muted)]">
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
            <div className="mt-4 rounded-[var(--radius-lg)] bg-[var(--warning-subtle)] p-3 text-xs leading-relaxed text-[var(--foreground)]">
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
                  className="rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-xs"
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

          <details className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] p-3">
            <summary className="cursor-pointer text-sm font-bold text-[var(--foreground)]">
              Imposto pago no exterior
            </summary>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Select
                  label="Rendimento ou venda"
                  value={creditEvent}
                  onChange={(value) => setCreditEvent(String(value))}
                  placeholder="Selecione..."
                  options={[
                    ...report.incomes
                      .filter(
                        (item) =>
                          item.incomeType === 'DIVIDEND' ||
                          item.incomeType === 'INTEREST',
                      )
                      .map((item) => ({
                        value: 'INCOME:' + item.eventId,
                        label: `${item.symbol} · ${item.incomeType} · ${item.date}`,
                      })),
                    ...report.sales.map((item) => ({
                      value: 'SALE:' + item.eventId,
                      label: `${item.symbol} · venda · ${item.date}`,
                    })),
                  ]}
                  disabled={savingCredit}
                />
              </div>

              <Input label="País (ISO 2)" value={creditCountry} onChange={(event) =>
                    setCreditCountry(event.target.value.toUpperCase().slice(0, 2))
                  } placeholder="US" disabled={savingCredit} className="uppercase" />

              <MoneyInput
                label="Valor pago"
                currency={creditCurrency}
                value={creditAmount}
                onValueChange={setCreditAmount}
                disabled={savingCredit}
              />

              <Select
                label="Moeda"
                value={creditCurrency}
                onChange={(value) => setCreditCurrency(value as SupportedCurrency)}
                options={[{ value: 'BRL', label: 'BRL' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]}
                disabled={savingCredit}
              />

              <Input
                label="Data do pagamento"
                type="date"
                value={creditDate}
                onChange={(event) => setCreditDate(event.target.value)}
                disabled={savingCredit}
              />

              <Select label="Base da compensação" value={creditBasis} onChange={(value) => setCreditBasis(
                      value as 'TREATY' | 'RECIPROCITY',
                    )} options={[{ value: 'RECIPROCITY', label: 'Reciprocidade' }, { value: 'TREATY', label: 'Acordo/tratado' }]} disabled={savingCredit} />

              <div className="sm:col-span-2">

                <Input
                  label="Nota opcional"
                  value={creditNote}
                  onChange={(event) => setCreditNote(event.target.value)}
                  disabled={savingCredit}
                  maxLength={500}
                />

              </div>

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
                <Button variant="secondary" size="sm" pill onClick={() => void createForeignTaxCredit()} disabled={savingCredit || !creditNonRefundable}>
                  {savingCredit ? 'Registrando...' : 'Registrar imposto pago'}
                </Button>
              </div>
            </div>

            {report.foreignTaxCredits.length > 0 && (
              <div className="mt-4 space-y-2">
                {report.foreignTaxCredits.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-3 text-xs"
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
                      <Button variant="outline" size="sm" pill onClick={() => void removeForeignTaxCredit(item.id)} disabled={removingCreditId !== ''}>
                        <FaTrash aria-hidden="true" />
                        {removingCreditId === item.id ? 'Excluindo...' : 'Excluir'}
                      </Button>
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
            <details className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] p-3">
              <summary className="cursor-pointer text-sm font-bold text-[var(--foreground)]">
                Histórico da compensação de perdas
              </summary>
              <div className="mt-3 space-y-2">
                {report.annualRows.map((row) => (
                  <div
                    key={row.year}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-3 text-xs"
                  >
                    <strong className="text-[var(--foreground)]">
                      {row.year} · {row.status === 'OK' ? 'Fechado' : 'Pendente'}
                    </strong>
                    <span className="text-[var(--text-muted)]">
                      Base: {money(row.taxableBaseCents, showValues)} · Bruto:{' '}
                      <span className="money">{money(row.taxDueCents, showValues)}</span> · Crédito:{' '}
                      <span className="money">{money(row.foreignTaxCreditAppliedCents, showValues)}</span> · Líquido:{' '}
                      <span className="money">{money(row.netTaxDueCents, showValues)}</span> · Perda final:{' '}
                      <span className="money">{money(row.closingLossCents, showValues)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}

          <p className="mt-4 text-xs leading-relaxed text-[var(--text-subtle)]">
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
    <div className="rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-4">
      <span className="text-xs font-semibold text-[var(--text-muted)]">
        {label}
      </span>
      <strong className="money mt-1 block text-sm text-[var(--foreground)]">
        {value}
      </strong>
    </div>
  );
}
