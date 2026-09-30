'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { FaFlask, FaPlus, FaTrash } from 'react-icons/fa';

import {
  applyForecastScenarios,
  type ForecastScenarioMovement,
} from '@/app/lib/forecast/forecast-scenario';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { ForecastData, ForecastLogicalDate } from '@/app/types/forecast';

function isoDate(date: ForecastLogicalDate) {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

function parseIsoDate(value: string): ForecastLogicalDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const instant = new Date(Date.UTC(year, month - 1, day));

  if (
    instant.getUTCFullYear() !== year ||
    instant.getUTCMonth() + 1 !== month ||
    instant.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function money(amount: number, showValues: boolean, currency: string) {
  return showValues ? formatCurrency(amount, currency) : '••••';
}

export default function ForecastScenarioPanel({
  data,
  showValues,
}: {
  data: ForecastData;
  showValues: boolean;
}) {
  const [movements, setMovements] = useState<ForecastScenarioMovement[]>([]);
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [accountId, setAccountId] = useState(data.accounts[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(isoDate(data.asOf));
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!data.accounts.some((account) => account.id === accountId)) {
      setAccountId(data.accounts[0]?.id ?? '');
    }
  }, [accountId, data.accounts]);

  const simulation = useMemo(
    () => applyForecastScenarios(data, movements),
    [data, movements],
  );

  function addMovement(event: FormEvent) {
    event.preventDefault();
    setError('');

    const parsedDate = parseIsoDate(date);
    const parsedAmount = Math.round(Number(amount.replace(',', '.')) * 100);

    if (!accountId || !parsedDate || !Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      setError('Informe conta, valor e data válidos.');
      return;
    }

    const next: ForecastScenarioMovement = {
      id: crypto.randomUUID(),
      accountId,
      currency: data.currency,
      amount: parsedAmount,
      type,
      description: description.trim() || 'Cenário sem descrição',
      ...parsedDate,
    };

    try {
      applyForecastScenarios(data, [...movements, next]);
      setMovements((current) => [...current, next]);
      setAmount('');
      setDescription('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Cenário inválido');
    }
  }

  if (data.accounts.length === 0) return null;

  return (
    <section className="ds-panel p-5 sm:p-6" aria-labelledby="forecast-scenario-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <FaFlask className="text-[var(--orbit-primary)]" aria-hidden="true" />
            <h3 id="forecast-scenario-title" className="font-semibold text-[var(--foreground)]">
              Simular cenário
            </h3>
          </div>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Hipóteses locais e temporárias. Nada aqui cria transação, altera saldo ou patrimônio.
          </p>
        </div>

        {movements.length > 0 ? (
          <button
            type="button"
            onClick={() => setMovements([])}
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--foreground)]"
          >
            Limpar cenário
          </button>
        ) : null}
      </div>

      <form onSubmit={addMovement} className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[140px_1fr_150px_170px_1fr_auto] xl:items-end">
        <label className="grid gap-1 text-sm font-medium">
          Tipo
          <select
            value={type}
            onChange={(event) => setType(event.target.value as 'INCOME' | 'EXPENSE')}
            className="ds-control min-h-11 bg-[var(--surface)] px-3"
          >
            <option value="EXPENSE">Despesa</option>
            <option value="INCOME">Receita</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Conta
          <select
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            className="ds-control min-h-11 bg-[var(--surface)] px-3"
            required
          >
            {data.accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Valor
          <input
            aria-label="Valor do cenário"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="ds-control min-h-11 bg-[var(--surface)] px-3"
            placeholder="0,00"
            required
          />
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Data
          <input
            type="date"
            min={isoDate(data.asOf)}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="ds-control min-h-11 bg-[var(--surface)] px-3"
            required
          />
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Descrição
          <input
            type="text"
            maxLength={80}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="ds-control min-h-11 bg-[var(--surface)] px-3"
            placeholder="Ex.: viagem"
          />
        </label>

        <button
          type="submit"
          className="flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--orbit-primary)] px-4 text-sm font-bold text-[var(--orbit-on-primary)]"
        >
          <FaPlus aria-hidden="true" />
          Adicionar
        </button>
      </form>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-[var(--expense)]">
          {error}
        </p>
      ) : null}

      {movements.length === 0 ? (
        <p className="mt-5 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--text-muted)]">
          Adicione uma receita ou despesa hipotética para comparar a projeção atual com o cenário.
        </p>
      ) : (
        <>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {simulation.accounts.map((simulated) => {
              const current = data.accounts.find((account) => account.id === simulated.id)!;
              const difference = simulated.projectedBalance - current.projectedBalance;

              return (
                <article key={simulated.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-semibold text-[var(--foreground)]">{simulated.name}</h4>
                    <span className="text-xs font-semibold text-[var(--text-muted)]">{data.currency}</span>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div className="rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-3">
                      <dt className="text-[var(--text-muted)]">Atual</dt>
                      <dd className="mt-1 font-semibold">{money(current.projectedBalance, showValues, data.currency)}</dd>
                    </div>
                    <div className="rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-3">
                      <dt className="text-[var(--text-muted)]">Simulado</dt>
                      <dd className="mt-1 font-semibold">{money(simulated.projectedBalance, showValues, data.currency)}</dd>
                    </div>
                    <div className="rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-3">
                      <dt className="text-[var(--text-muted)]">Diferença</dt>
                      <dd className={`mt-1 font-semibold ${difference < 0 ? 'text-[var(--expense)]' : difference > 0 ? 'text-[var(--income)]' : ''}`}>
                        {showValues ? `${difference > 0 ? '+' : ''}${formatCurrency(difference, data.currency)}` : '••••'}
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>

          <ul className="mt-5 divide-y divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)] px-4">
            {movements.map((movement) => {
              const outside = simulation.outsideHorizon.some((item) => item.id === movement.id);
              const account = data.accounts.find((item) => item.id === movement.accountId);

              return (
                <li key={movement.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)]">{movement.description}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {isoDate(movement)} · {account?.name ?? 'Conta'} · {outside ? 'fora do horizonte atual' : 'aplicado ao cenário'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <strong className={movement.type === 'INCOME' ? 'text-[var(--income)]' : 'text-[var(--expense)]'}>
                      {movement.type === 'INCOME' ? '+' : '-'}
                      {money(movement.amount, showValues, data.currency)}
                    </strong>
                    <button
                      type="button"
                      aria-label={`Remover cenário ${movement.description}`}
                      onClick={() => setMovements((current) => current.filter((item) => item.id !== movement.id))}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--expense)]"
                    >
                      <FaTrash aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
