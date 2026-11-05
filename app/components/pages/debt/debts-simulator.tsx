'use client';

import { useMemo, useState } from 'react';

import { Alert } from '@/app/components/feedback';
import { Input, MoneyInput } from '@/app/components/ui';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { parseMoneyInputToCents } from '@/app/lib/currency/parse-money-input';
import {
  compareDebtStrategies,
  parseMonthlyRateBps,
  type DebtSimulationResult,
} from '@/app/lib/debts/debt-simulator';
import type { Debt } from '@/app/types/debt';
import type { SupportedCurrency } from '@/app/types/financial-summary';

const cardClassName = 'rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5';

function monthsLabel(months: number) {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [years > 0 ? `${years} ${years === 1 ? 'ano' : 'anos'}` : '', rest > 0 ? `${rest} ${rest === 1 ? 'mês' : 'meses'}` : ''];
  return parts.filter(Boolean).join(' e ') || '0 mês';
}

/**
 * Compara quitar só com as parcelas, "maior juro primeiro" e "menor saldo primeiro", com um valor extra por mês e,
 * opcionalmente, um pagamento único. É só simulação: não grava nada. O juro de cada dívida é digitado aqui; sem juro
 * informado a conta não inventa um valor, e a tela avisa.
 */
export default function DebtsSimulator({
  debts,
  currency,
  showValues,
}: {
  debts: Debt[];
  currency: SupportedCurrency;
  showValues: boolean;
}) {
  const active = useMemo(
    () => debts.filter((debt) => debt.status === 'ACTIVE' && debt.currency === currency && debt.balance > 0),
    [currency, debts],
  );
  const [rates, setRates] = useState<Record<string, string>>({});
  const [extra, setExtra] = useState('');
  const [lump, setLump] = useState('');

  const money = (cents: number) => (showValues ? formatCurrency(cents, currency) : '••••');
  const comparison = useMemo(
    () =>
      active.length === 0
        ? null
        : compareDebtStrategies({
            debts: active.map((debt) => ({
              id: debt.id,
              name: debt.name,
              balance: debt.balance,
              monthlyPayment: debt.installmentAmount,
              monthlyRateBps: parseMonthlyRateBps(rates[debt.id] ?? ''),
            })),
            extraMonthly: parseMoneyInputToCents(extra) ?? 0,
            lumpSum: parseMoneyInputToCents(lump) ?? 0,
          }),
    [active, extra, lump, rates],
  );

  if (active.length === 0 || !comparison) return null;

  const withoutRate = comparison.baseline.unknownRateDebtIds.length;
  const withoutInstallment = active.filter((debt) => debt.installmentAmount === null).length;
  const hasExtra = (parseMoneyInputToCents(extra) ?? 0) > 0 || (parseMoneyInputToCents(lump) ?? 0) > 0;

  const rows: Array<{ key: string; title: string; hint: string; result: DebtSimulationResult }> = [
    { key: 'baseline', title: 'Só as parcelas', hint: 'Cada dívida no seu ritmo', result: comparison.baseline },
    { key: 'avalanche', title: 'Maior juro primeiro', hint: 'Costuma pagar menos juros', result: comparison.avalanche },
    { key: 'snowball', title: 'Menor saldo primeiro', hint: 'Quita as pequenas antes', result: comparison.snowball },
  ];

  return (
    <section aria-labelledby="debts-simulator-title" className={cardClassName}>
      <h2 id="debts-simulator-title" className="text-base font-bold">Simular quitação</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Compare estratégias com um valor extra por mês ou um pagamento único. Nada é gravado.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MoneyInput label="Extra por mês" currency={currency} value={extra} onValueChange={setExtra} placeholder="500,00" />
        <MoneyInput label="Pagamento único agora" currency={currency} value={lump} onValueChange={setLump} placeholder="5.000,00" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {active.map((debt) => (
          <div key={debt.id} className="min-w-0 rounded-[var(--radius-md)] border border-[var(--border)] p-3">
            <p className="truncate text-sm font-semibold">{debt.name}</p>
            <p className="money text-xs text-[var(--text-muted)]">
              {money(debt.balance)}
              {debt.installmentAmount !== null ? ` · parcela ${money(debt.installmentAmount)}` : ' · sem parcela'}
            </p>
            <div className="mt-2">
              <Input
                label="Juros ao mês (%)"
                value={rates[debt.id] ?? ''}
                onChange={(event) => setRates((current) => ({ ...current, [debt.id]: event.target.value }))}
                inputMode="decimal"
                placeholder="Ex.: 2,5"
              />
            </div>
          </div>
        ))}
      </div>

      {(withoutRate > 0 || withoutInstallment > 0) && (
        <div className="mt-4 space-y-2">
          {withoutRate > 0 && (
            <Alert
              variant="warning"
              message={`${withoutRate} dívida(s) sem juros informado: entram na conta sem juros e, em "maior juro primeiro", por último.`}
            />
          )}
          {withoutInstallment > 0 && (
            <Alert
              variant="warning"
              message={`${withoutInstallment} dívida(s) sem parcela: só recebem dinheiro do extra e do pagamento único.`}
            />
          )}
        </div>
      )}

      <ul className="mt-4 divide-y divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)]">
        {rows.map(({ key, title, hint, result }) => {
          const paidOff = result.monthsToPayoff !== null;
          const baselinePaidOff = comparison.baseline.monthsToPayoff !== null;
          const savedMonths =
            key !== 'baseline' && paidOff && baselinePaidOff
              ? comparison.baseline.monthsToPayoff! - result.monthsToPayoff!
              : null;
          const savedInterest =
            key !== 'baseline' && paidOff && baselinePaidOff
              ? comparison.baseline.totalInterest - result.totalInterest
              : null;
          return (
            <li key={key} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-[var(--text-muted)]">{hint}</p>
              </div>
              <div className="text-sm sm:text-right">
                {paidOff ? (
                  <>
                    <p className="font-semibold">Livre em {monthsLabel(result.monthsToPayoff!)}</p>
                    <p className="money text-xs text-[var(--text-muted)]">
                      Juros {money(result.totalInterest)}
                      {hasExtra && savedInterest !== null && savedInterest > 0 && ` · economiza ${money(savedInterest)}`}
                      {hasExtra && savedMonths !== null && savedMonths > 0 && ` · ${savedMonths} ${savedMonths === 1 ? 'mês' : 'meses'} a menos`}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">Não quita em 50 anos</p>
                    <p className="text-xs text-[var(--text-muted)]">Falta parcela ou ela não cobre os juros.</p>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
