'use client';

import { useEffect, useState } from 'react';

import { formatCurrency } from '@/app/lib/currency/format-currency';
import { parseMoneyInputToCents } from '@/app/lib/currency/parse-money-input';
import { investmentService } from '@/app/services/investment-service';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type {
  InvestmentAssetType,
  InvestmentTaxControlReport,
} from '@/app/types/investment';

const assetTypes: Array<{ value: InvestmentAssetType; label: string }> = [
  { value: 'STOCK', label: 'Ações' },
  { value: 'FII', label: 'FII' },
  { value: 'ETF', label: 'ETF' },
  { value: 'FIXED_INCOME', label: 'Renda fixa' },
  { value: 'CRYPTO', label: 'Cripto' },
  { value: 'FUND', label: 'Fundos' },
  { value: 'OTHER', label: 'Outros' },
];

function today() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function splitDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

export function InvestmentTaxControlCard({
  showValues,
}: {
  showValues: boolean;
}) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [report, setReport] = useState<InvestmentTaxControlReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'IRRF' | 'DARF' | null>(null);
  const [assetType, setAssetType] = useState<InvestmentAssetType>('FII');
  const [currency, setCurrency] = useState<SupportedCurrency>('BRL');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [code, setCode] = useState('');
  const [note, setNote] = useState('');
  const [receiptReference, setReceiptReference] = useState('');
  const [saving, setSaving] = useState(false);

  async function load(selectedYear: number) {
    const response = await investmentService.getTaxControlReport(selectedYear);
    setReport(response.data);
  }

  useEffect(() => {
    let cancelled = false;
    void investmentService
      .getTaxControlReport(currentYear)
      .then((response) => {
        if (!cancelled) setReport(response.data);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Não foi possível carregar IRRF e DARF',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentYear]);

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
          : 'Não foi possível carregar IRRF e DARF',
      );
    } finally {
      setLoading(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!mode) return;
    const amountCents = parseMoneyInputToCents(amount);
    if (amountCents === null || amountCents <= 0) {
      setError('Informe um valor válido.');
      return;
    }
    const parsedDate = splitDate(date);
    setSaving(true);
    setError('');

    try {
      if (mode === 'IRRF') {
        await investmentService.createTaxWithholding({
          assetType,
          currency,
          amountCents,
          year,
          month,
          day: parsedDate.day,
          note: note || null,
        });
      } else {
        await investmentService.createTaxPayment({
          assetType,
          currency,
          amountCents,
          competenceYear: year,
          competenceMonth: month,
          code,
          paidYear: parsedDate.year,
          paidMonth: parsedDate.month,
          paidDay: parsedDate.day,
          note: note || null,
          receiptReference: receiptReference || null,
        });
      }

      setMode(null);
      setAmount('');
      setCode('');
      setNote('');
      setReceiptReference('');
      await load(year);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível salvar o registro fiscal',
      );
    } finally {
      setSaving(false);
    }
  }

  const years = Array.from({ length: 6 }, (_, index) => currentYear - index);

  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            IRRF e DARF
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Registros fiscais por competência, sem movimentar o saldo financeiro.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={year}
            onChange={(event) => void changeYear(Number(event.target.value))}
            className="ds-control min-h-10 px-3 text-sm"
            disabled={loading}
            aria-label="Ano fiscal"
          >
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setMode(mode === 'IRRF' ? null : 'IRRF')}
            className="min-h-10 rounded-full border border-[var(--border-strong)] px-4 text-xs font-bold"
          >
            Registrar IRRF
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === 'DARF' ? null : 'DARF')}
            className="min-h-10 rounded-full border border-[var(--border-strong)] px-4 text-xs font-bold"
          >
            Registrar DARF
          </button>
        </div>
      </div>

      {mode && (
        <form
          onSubmit={save}
          className="mt-4 grid gap-3 rounded-[14px] bg-[var(--surface-raised)] p-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <label className="text-xs font-semibold text-[var(--text-muted)]">
            Classe
            <select
              value={assetType}
              onChange={(event) =>
                setAssetType(event.target.value as InvestmentAssetType)
              }
              className="ds-control mt-1 min-h-10 w-full px-3 text-sm"
              disabled={saving}
            >
              {assetTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-[var(--text-muted)]">
            Moeda
            <select
              value={currency}
              onChange={(event) =>
                setCurrency(event.target.value as SupportedCurrency)
              }
              className="ds-control mt-1 min-h-10 w-full px-3 text-sm"
              disabled={saving}
            >
              <option value="BRL">BRL</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-[var(--text-muted)]">
            Competência
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className="ds-control mt-1 min-h-10 w-full px-3 text-sm"
              disabled={saving}
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map(
                (value) => (
                  <option key={value} value={value}>
                    {String(value).padStart(2, '0')}/{year}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="text-xs font-semibold text-[var(--text-muted)]">
            Valor
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="ds-control mt-1 min-h-10 w-full px-3 text-sm"
              inputMode="decimal"
              placeholder="R$ 0,00"
              required
              disabled={saving}
            />
          </label>
          <label className="text-xs font-semibold text-[var(--text-muted)]">
            {mode === 'IRRF' ? 'Data do IRRF' : 'Data de pagamento'}
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="ds-control mt-1 min-h-10 w-full px-3 text-sm"
              required
              disabled={saving}
            />
          </label>
          {mode === 'DARF' && (
            <label className="text-xs font-semibold text-[var(--text-muted)]">
              Código DARF
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="ds-control mt-1 min-h-10 w-full px-3 text-sm"
                maxLength={10}
                required
                disabled={saving}
              />
            </label>
          )}
          {mode === 'DARF' && (
            <label className="text-xs font-semibold text-[var(--text-muted)]">
              Referência do comprovante
              <input
                value={receiptReference}
                onChange={(event) => setReceiptReference(event.target.value)}
                className="ds-control mt-1 min-h-10 w-full px-3 text-sm"
                maxLength={120}
                disabled={saving}
              />
            </label>
          )}
          <label className="text-xs font-semibold text-[var(--text-muted)] sm:col-span-2">
            Observação
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="ds-control mt-1 min-h-10 w-full px-3 text-sm"
              maxLength={500}
              disabled={saving}
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="min-h-10 rounded-full bg-[var(--foreground)] px-4 text-xs font-bold text-[var(--background)] disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar ' + mode}
          </button>
        </form>
      )}

      {error && (
        <p className="mt-4 rounded-[12px] border border-[var(--expense)]/30 p-3 text-sm text-[var(--expense)]">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Carregando...</p>
      ) : report && !report.ruleSupported ? (
        <div className="mt-4 rounded-[14px] bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
          <strong className="block text-sm">
            Regras fiscais de {year} ainda não suportadas
          </strong>
          <span className="mt-1 block">
            O sistema não reutiliza automaticamente regras de outro ano. O
            cálculo de imposto fica pendente até existir versão oficial
            aplicável ao exercício {report.taxExercise}.
          </span>
        </div>
      ) : !report || report.rows.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Nenhuma apuração fiscal registrada em {year}.
        </p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(report.totalsByCurrency).map(
              ([currencyKey, totals]) => (
                <div
                  key={currencyKey}
                  className="rounded-[14px] bg-[var(--surface-raised)] p-4"
                >
                  <span className="text-xs font-semibold text-[var(--text-muted)]">
                    {currencyKey}
                  </span>
                  <strong className="mt-1 block text-sm text-[var(--foreground)]">
                    IRRF:{' '}
                    {showValues
                      ? formatCurrency(
                          totals?.withholdingCents ?? 0,
                          currencyKey,
                        )
                      : '••••'}
                  </strong>
                  <strong className="mt-1 block text-sm text-[var(--foreground)]">
                    DARF:{' '}
                    {showValues
                      ? formatCurrency(totals?.paidDarfCents ?? 0, currencyKey)
                      : '••••'}
                  </strong>
                  <strong className="mt-1 block text-sm text-[var(--foreground)]">
                    Em aberto:{' '}
                    {showValues
                      ? formatCurrency(
                          totals?.openTaxBalanceCents ?? 0,
                          currencyKey,
                        )
                      : '••••'}
                  </strong>
                </div>
              ),
            )}
          </div>

          <div className="mt-4 space-y-2">
            {report.rows.map((row) => (
              <div
                key={[row.month, row.taxGroup, row.currency].join(':')}
                className="grid gap-2 rounded-[14px] border border-[var(--border)] p-3 text-xs sm:grid-cols-[minmax(0,1fr)_repeat(3,auto)] sm:items-center"
              >
                <div>
                  <strong className="text-[var(--foreground)]">
                    {String(row.month).padStart(2, '0')}/{row.year} ·{' '}
                    {row.taxGroup} · {row.currency}
                  </strong>
                  <span className="mt-1 block text-[var(--text-muted)]">
                    {row.status === 'PENDING_APURACAO'
                      ? 'Apuração mensal pendente'
                      : row.status === 'EXEMPT'
                        ? 'Resultado isento pelas regras do período'
                        : row.status === 'BELOW_MINIMUM'
                          ? 'Saldo abaixo do mínimo de recolhimento e carregado adiante'
                          : row.status === 'OPEN'
                            ? 'Existe saldo de imposto em aberto'
                            : 'Apuração calculada com regra versionada'}
                  </span>
                </div>
                <Metric
                  label="Base após prejuízos"
                  amount={row.taxableResultAfterCompensationCents}
                  currency={row.currency}
                  showValues={showValues}
                />
                <Metric
                  label="IRRF"
                  amount={row.withholdingCents}
                  currency={row.currency}
                  showValues={showValues}
                />
                <Metric
                  label="Imposto devido"
                  amount={row.taxDueCents ?? 0}
                  currency={row.currency}
                  showValues={showValues}
                />
                <Metric
                  label="Saldo em aberto"
                  amount={row.openTaxBalanceCents ?? 0}
                  currency={row.currency}
                  showValues={showValues}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </article>
  );
}

function Metric({
  label,
  amount,
  currency,
  showValues,
}: {
  label: string;
  amount: number;
  currency: string;
  showValues: boolean;
}) {
  return (
    <span className="min-w-[100px] sm:text-right">
      <span className="block text-[11px] text-[var(--text-muted)]">{label}</span>
      <strong className="text-[var(--foreground)]">
        {showValues ? formatCurrency(amount, currency) : '••••'}
      </strong>
    </span>
  );
}
