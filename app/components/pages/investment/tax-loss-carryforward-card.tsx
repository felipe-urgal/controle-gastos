'use client';

import { useEffect, useState } from 'react';

import { useInvestmentFiscalYear } from '@/app/components/pages/investment/investment-fiscal-year-context';

import { formatCurrency } from '@/app/lib/currency/format-currency';
import { parseMoneyInputToCents } from '@/app/lib/currency/parse-money-input';
import { investmentService } from '@/app/services/investment-service';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type {
  InvestmentAssetType,
  InvestmentTaxLossReport,
} from '@/app/types/investment';

const assetTypeLabels: Record<InvestmentAssetType, string> = {
  STOCK: 'Ações',
  FII: 'FII',
  ETF: 'ETF',
  FIXED_INCOME: 'Renda fixa',
  CRYPTO: 'Cripto',
  FUND: 'Fundos',
  OTHER: 'Outros',
};

const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' });

export function TaxLossCarryforwardCard({
  showValues,
}: {
  showValues: boolean;
}) {
  const currentYear = new Date().getUTCFullYear();
  const { year, setYear } = useInvestmentFiscalYear();
  const [report, setReport] = useState<InvestmentTaxLossReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [assetType, setAssetType] = useState<InvestmentAssetType>('FII');
  const [currency, setCurrency] = useState<SupportedCurrency>('BRL');
  const [month, setMonth] = useState(1);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  async function load(selectedYear: number) {
    const response = await investmentService.getTaxLossReport(selectedYear);
    setReport(response.data);
  }

  useEffect(() => {
    let cancelled = false;
    void investmentService
      .getTaxLossReport(year)
      .then((response) => {
        if (!cancelled) setReport(response.data);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Não foi possível carregar os prejuízos fiscais',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year]);

  function changeYear(selectedYear: number) {
    setYear(selectedYear);
  }

  async function saveAdjustment(event: React.FormEvent) {
    event.preventDefault();
    const amountCents = parseMoneyInputToCents(amount);
    if (amountCents === null || amountCents < 0) {
      setError('Informe um saldo de prejuízo válido.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await investmentService.createTaxLossAdjustment({
        assetType,
        currency,
        amountCents,
        year,
        month,
        reason,
      });
      setEditing(false);
      setAmount('');
      setReason('');
      await load(year);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível registrar o ajuste',
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
            Prejuízos fiscais acumulados
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Saldo carregado mês a mês por classe e moeda, sem compensar ganhos de meses anteriores.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={year}
            onChange={(event) => void changeYear(Number(event.target.value))}
            className="ds-control min-h-10 px-3 text-sm"
            disabled={loading}
            aria-label="Ano do prejuízo fiscal"
          >
            {years.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            className="min-h-10 rounded-full border border-[var(--border-strong)] px-4 text-xs font-bold"
          >
            {editing ? 'Cancelar ajuste' : 'Informar saldo inicial'}
          </button>
        </div>
      </div>

      {editing && (
        <form onSubmit={saveAdjustment} className="mt-4 grid gap-3 rounded-[14px] bg-[var(--surface-raised)] p-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs font-semibold text-[var(--text-muted)]">
            Classe
            <select
              value={assetType}
              onChange={(event) => setAssetType(event.target.value as InvestmentAssetType)}
              className="ds-control mt-1 min-h-10 w-full px-3 text-sm"
              disabled={saving}
            >
              {Object.entries(assetTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-[var(--text-muted)]">
            Moeda
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value as SupportedCurrency)}
              className="ds-control mt-1 min-h-10 w-full px-3 text-sm"
              disabled={saving}
            >
              <option value="BRL">BRL</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-[var(--text-muted)]">
            Mês de início
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className="ds-control mt-1 min-h-10 w-full px-3 text-sm"
              disabled={saving}
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-[var(--text-muted)]">
            Saldo de prejuízo
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="ds-control mt-1 min-h-10 w-full px-3 text-sm"
              placeholder="R$ 0,00"
              inputMode="decimal"
              required
              disabled={saving}
            />
          </label>
          <label className="text-xs font-semibold text-[var(--text-muted)] sm:col-span-2">
            Motivo
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="ds-control mt-1 min-h-10 w-full px-3 text-sm"
              placeholder="Ex.: prejuízo acumulado informado na declaração anterior"
              minLength={3}
              maxLength={500}
              required
              disabled={saving}
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="min-h-10 rounded-full bg-[var(--foreground)] px-4 text-xs font-bold text-[var(--background)] disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Registrar ajuste'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Calculando saldos...</p>
      ) : error ? (
        <p className="mt-4 rounded-[12px] border border-[var(--expense)]/30 p-3 text-sm text-[var(--expense)]">{error}</p>
      ) : !report || report.rows.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Nenhum prejuízo ou ajuste fiscal para {year}.
        </p>
      ) : (
        <>
          {report.pending.length > 0 && (
            <div className="mt-4 rounded-[14px] bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
              <strong className="block text-sm">Apuração pendente</strong>
              <span className="mt-1 block">{report.pending[0]?.message}</span>
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {report.closingBalances.map((item) => (
              <div key={item.assetType + ':' + item.currency} className="rounded-[14px] bg-[var(--surface-raised)] p-4">
                <span className="text-xs font-semibold text-[var(--text-muted)]">
                  {assetTypeLabels[item.assetType]} · {item.currency}
                </span>
                <strong className="mt-1 block text-lg text-[var(--foreground)]">
                  {showValues ? formatCurrency(item.closingLossCents, item.currency) : '••••'}
                </strong>
                <span className="mt-1 block text-[11px] text-[var(--text-muted)]">saldo de prejuízo</span>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            {report.rows.map((row) => (
              <div key={[row.month, row.assetType, row.currency].join(':')} className="grid gap-2 rounded-[14px] border border-[var(--border)] p-3 text-xs sm:grid-cols-[minmax(0,1fr)_repeat(3,auto)] sm:items-center">
                <div>
                  <strong className="capitalize text-[var(--foreground)]">
                    {monthFormatter.format(new Date(Date.UTC(year, row.month - 1, 1)))} · {assetTypeLabels[row.assetType]}
                  </strong>
                  <span className="mt-1 block text-[var(--text-muted)]">
                    {row.adjustment ? 'Ajuste auditável aplicado · ' + row.adjustment.reason : row.status === 'PENDING' ? 'Apuração pendente' : 'Apuração automática'}
                  </span>
                </div>
                <Metric label="Gerado" amount={row.generatedLossCents} currency={row.currency} showValues={showValues} />
                <Metric label="Compensado" amount={row.compensatedLossCents} currency={row.currency} showValues={showValues} />
                <Metric label="Saldo" amount={row.closingLossCents} currency={row.currency} showValues={showValues} />
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
    <span className="min-w-[90px] sm:text-right">
      <span className="block text-[11px] text-[var(--text-muted)]">{label}</span>
      <strong className="text-[var(--foreground)]">
        {showValues ? formatCurrency(amount, currency) : '••••'}
      </strong>
    </span>
  );
}
