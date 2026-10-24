'use client';

import { FormEvent, useMemo, useState } from 'react';
import { FaFlask, FaPlus, FaTrash } from 'react-icons/fa';

import { Button, IconButton, Input, MoneyInput, Select } from '@/app/components/ui';
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
            <FaFlask className="text-[var(--primary)]" aria-hidden="true" />
            <h3 id="forecast-scenario-title" className="font-semibold text-[var(--foreground)]">
              Simular cenário
            </h3>
          </div>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Hipóteses locais e temporárias. Nada aqui cria transação, altera saldo ou patrimônio.
          </p>
        </div>

        {movements.length > 0 ? (
          <Button type="button" variant="outline" onClick={() => setMovements([])}>
            Limpar cenário
          </Button>
        ) : null}
      </div>

      <form onSubmit={addMovement} className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[140px_1fr_150px_170px_1fr_auto] xl:items-end">
        <Select
          label="Tipo"
          value={type}
          onChange={(value) => setType(value as 'INCOME' | 'EXPENSE')}
          options={[
            { value: 'EXPENSE', label: 'Despesa' },
            { value: 'INCOME', label: 'Receita' },
          ]}
        />

        <Select
          label="Conta"
          value={accountId}
          onChange={(value) => setAccountId(String(value))}
          options={data.accounts.map((account) => ({ value: account.id, label: account.name }))}
          required
        />

        <MoneyInput
          label="Valor"
          aria-label="Valor do cenário"
          currency={data.currency}
          enterKeyHint="next"
          value={amount}
          onValueChange={setAmount}
          required
        />

        <Input
          label="Data"
          type="date"
          min={isoDate(data.asOf)}
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
        />

        <Input
          label="Descrição"
          type="text"
          maxLength={80}
          enterKeyHint="done"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ex.: viagem"
        />

        <Button type="submit" icon={<FaPlus aria-hidden="true" />} className="xl:mb-0">
          Adicionar
        </Button>
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
                      <dd className="mt-1 font-semibold"><span className="money">{money(current.projectedBalance, showValues, data.currency)}</span></dd>
                    </div>
                    <div className="rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-3">
                      <dt className="text-[var(--text-muted)]">Simulado</dt>
                      <dd className="mt-1 font-semibold"><span className="money">{money(simulated.projectedBalance, showValues, data.currency)}</span></dd>
                    </div>
                    <div className="rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-3">
                      <dt className="text-[var(--text-muted)]">Diferença</dt>
                      <dd className={`mt-1 font-semibold ${difference < 0 ? 'text-[var(--expense)]' : difference > 0 ? 'text-[var(--income)]' : ''}`}>
                        <span className="money">{showValues ? `${difference > 0 ? '+' : ''}${formatCurrency(difference, data.currency)}` : '••••'}</span>
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
                      <span className="money">{money(movement.amount, showValues, data.currency)}</span>
                    </strong>
                    <IconButton
                      label={`Remover cenário ${movement.description}`}
                      icon={<FaTrash />}
                      tone="danger"
                      onClick={() => setMovements((current) => current.filter((item) => item.id !== movement.id))}
                    />
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
