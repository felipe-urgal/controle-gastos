'use client';

import { useState } from 'react';
import { FaPen } from 'react-icons/fa';

import { describeCardCycle } from '@/app/components/pages/account/form/account-form-model';
import { Button, ColorIconSelector, IconButton, IconRenderer, InlineInput, MoneyInlineInput, Select } from '@/app/components/ui';
import { ACCOUNT_NAME_MAX_LENGTH, accountTypeOptions, currencyOptions } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { AccountType } from '@/app/types/account';

export type AccountCardValues = {
  name: string;
  type: AccountType;
  currency: string;
  color: string;
  icon: string;
  creditLimit: string;
  statementClosingDay: string;
  statementDueDay: string;
};

const currencySymbols: Record<string, string> = { BRL: 'R$', USD: 'US$', EUR: '€' };

/**
 * A conta como o usuário vai vê-la na lista, já editável: nome, moeda, cor, ícone e, no cartão,
 * limite e ciclo da fatura. O que o servidor trava depois de movimentações aparece desabilitado.
 */
export function AccountFormCard({
  values,
  onChange,
  loading,
  lockStructure,
  lockCycle,
  isEditing,
  currentBalance,
}: {
  values: AccountCardValues;
  onChange: (patch: Partial<AccountCardValues>) => void;
  loading: boolean;
  lockStructure: boolean;
  lockCycle: boolean;
  isEditing: boolean;
  /** Saldo atual da conta (centavos); só faz sentido na edição. */
  currentBalance?: number | null;
}) {
  const [lookOpen, setLookOpen] = useState(false);
  const isCard = values.type === 'CREDIT_CARD';
  const symbol = currencySymbols[values.currency] ?? values.currency;
  const typeLabel = accountTypeOptions.find((option) => option.value === values.type)?.label ?? '';

  return (
    <section
      aria-label="Conta"
      className="relative grid gap-5 rounded-[20px] border border-[color-mix(in_srgb,var(--account-color)_40%,var(--border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--account-color)_16%,var(--surface)),var(--surface)_70%)] p-4 shadow-[var(--shadow-surface)] sm:p-5"
      style={{ ['--account-color' as string]: values.color }}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3.5">
        <IconButton
          label="Mudar cor e ícone"
          onClick={() => setLookOpen((open) => !open)}
          disabled={loading}
          aria-expanded={lookOpen}
          tone="solid"
          size="lg"
          className="relative"
          style={{ backgroundColor: values.color }}
          icon={
            <>
              <IconRenderer iconName={values.icon || 'wallet'} size={24} />
              <span className="absolute -bottom-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text-muted)]">
                <FaPen />
              </span>
            </>
          }
        />

        <div className="min-w-0">
          <InlineInput
            aria-label="Nome da conta"
            value={values.name}
            onChange={(event) => onChange({ name: event.target.value })}
            maxLength={ACCOUNT_NAME_MAX_LENGTH}
            required
            disabled={loading}
            placeholder="Dê um nome à conta"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm font-medium text-[var(--text-muted)]">
              {typeLabel}
            </span>
            <div className="w-40">
              <Select
                ariaLabel="Moeda"
                value={values.currency}
                onChange={(value) => onChange({ currency: String(value) })}
                options={currencyOptions}
                disabled={loading || lockStructure}
              />
            </div>
          </div>
        </div>
      </div>

      {lookOpen && (
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3.5">
          <ColorIconSelector
            color={values.color}
            icon={values.icon}
            onColorChange={(color) => onChange({ color })}
            onIconChange={(icon) => onChange({ icon })}
            disabled={loading}
          />
          <Button type="button" size="xs" variant="ghost" className="mt-2" onClick={() => setLookOpen(false)}>
            Fechar
          </Button>
        </div>
      )}

      {isCard ? (
        <div className="grid gap-4">
          <div>
            <label htmlFor="account-credit-limit" className="text-sm text-[var(--text-muted)]">
              Limite do cartão
            </label>
            <div className="flex items-baseline gap-2">
              <span className="money text-xl text-[var(--text-muted)]">{symbol}</span>
              <MoneyInlineInput
                id="account-credit-limit"
                size="amount"
                value={values.creditLimit}
                onValueChange={(creditLimit) => onChange({ creditLimit })}
                disabled={loading}
                required
                placeholder="5.000,00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
              <label htmlFor="account-closing-day" className="block text-sm text-[var(--text-muted)]">
                Dia de fechamento
              </label>
              <InlineInput
                id="account-closing-day"
                size="day"
                type="number"
                min={1}
                max={31}
                inputMode="numeric"
                value={values.statementClosingDay}
                onChange={(event) => onChange({ statementClosingDay: event.target.value })}
                disabled={loading || lockCycle}
                required
              />
            </div>
            <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
              <label htmlFor="account-due-day" className="block text-sm text-[var(--text-muted)]">
                Dia de vencimento
              </label>
              <InlineInput
                id="account-due-day"
                size="day"
                type="number"
                min={1}
                max={31}
                inputMode="numeric"
                value={values.statementDueDay}
                onChange={(event) => onChange({ statementDueDay: event.target.value })}
                disabled={loading || lockCycle}
                required
              />
            </div>
          </div>

          <p
            aria-live="polite"
            className="rounded-[10px] bg-[color-mix(in_srgb,var(--account-color)_10%,var(--surface-raised))] px-3 py-2.5 text-sm leading-relaxed text-[var(--text-muted)]"
          >
            {describeCardCycle(values.statementClosingDay, values.statementDueDay)}
          </p>
        </div>
      ) : (
        <div className="grid gap-1">
          <span className="text-sm text-[var(--text-muted)]">{values.type === 'INVESTMENT' ? 'Patrimônio' : 'Saldo'}</span>
          <strong className="money text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            {isEditing && currentBalance != null ? formatCurrency(currentBalance, values.currency) : `${symbol} 0,00`}
          </strong>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
            {isEditing
              ? 'O saldo continua calculado pelas transações concluídas.'
              : 'O saldo começa em zero e passa a ser calculado pelas transações que você lançar.'}
          </p>
        </div>
      )}
    </section>
  );
}
