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
import { Button, Input, MoneyInput, Select } from '@/app/components/ui';

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
    <article className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-surface)] p-4 sm:p-5">
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
          <Select
            ariaLabel="Ano do prejuízo fiscal"
            value={year}
            onChange={(value) => void changeYear(Number(value))}
            options={years.map((item) => ({ value: item, label: String(item) }))}
            disabled={loading}
          />
          <Button variant="outline" size="sm" onClick={() => setEditing((value) => !value)}>
            {editing ? 'Cancelar ajuste' : 'Informar saldo inicial'}
          </Button>
        </div>
      </div>

      {editing && (
        <form onSubmit={saveAdjustment} className="mt-4 grid gap-3 rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="Classe"
            value={assetType}
            onChange={(value) => setAssetType(value as InvestmentAssetType)}
            options={Object.entries(assetTypeLabels).map(([value, label]) => ({ value: value, label: String(label) }))}
            disabled={saving}
          />
          <Select
            label="Moeda"
            value={currency}
            onChange={(value) => setCurrency(value as SupportedCurrency)}
            options={[{ value: 'BRL', label: 'BRL' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]}
            disabled={saving}
          />
          <Select
            label="Mês de início"
            value={month}
            onChange={(value) => setMonth(Number(value))}
            options={Array.from({ length: 12 }, (_, index) => index + 1).map((value) => ({ value: value, label: String(value) }))}
            disabled={saving}
          />
          <MoneyInput
            label="Saldo de prejuízo"
            currency={currency}
            value={amount}
            onValueChange={setAmount}
            required
            disabled={saving}
          />
          <div className="sm:col-span-2">
            <Input
              label="Motivo"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ex.: prejuízo acumulado informado na declaração anterior"
              required
              disabled={saving}
              minLength={3}
              maxLength={500}
            />
          </div>
          <Button type="submit" variant="secondary" size="sm" disabled={saving}>
            {saving ? 'Salvando...' : 'Registrar ajuste'}
          </Button>
        </form>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Calculando saldos...</p>
      ) : error ? (
        <p className="mt-4 rounded-[var(--radius-md)] border border-[var(--expense)]/30 p-3 text-sm text-[var(--expense)]">{error}</p>
      ) : !report || report.rows.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Nenhum prejuízo ou ajuste fiscal para {year}.
        </p>
      ) : (
        <>
          {report.pending.length > 0 && (
            <div className="mt-4 rounded-[var(--radius-lg)] bg-[var(--warning-subtle)] p-3 text-xs leading-relaxed text-[var(--foreground)]">
              <strong className="block text-sm">Apuração pendente</strong>
              <span className="mt-1 block">{report.pending[0]?.message}</span>
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {report.closingBalances.map((item) => (
              <div key={item.assetType + ':' + item.currency} className="rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-4">
                <span className="text-xs font-semibold text-[var(--text-muted)]">
                  {assetTypeLabels[item.assetType]} · {item.currency}
                </span>
                <strong className="mt-1 block text-lg text-[var(--foreground)]">
                  <span className="money">{showValues ? formatCurrency(item.closingLossCents, item.currency) : '••••'}</span>
                </strong>
                <span className="mt-1 block text-xs text-[var(--text-muted)]">saldo de prejuízo</span>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            {report.rows.map((row) => (
              <div key={[row.month, row.assetType, row.currency].join(':')} className="grid gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] p-3 text-xs sm:grid-cols-[minmax(0,1fr)_repeat(3,auto)] sm:items-center">
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
      <span className="block text-xs text-[var(--text-muted)]">{label}</span>
      <strong className="text-[var(--foreground)]">
        <span className="money">{showValues ? formatCurrency(amount, currency) : '••••'}</span>
      </strong>
    </span>
  );
}
