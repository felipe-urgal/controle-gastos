'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { FaPen } from 'react-icons/fa';

import { describeCardCycle } from '@/app/components/pages/account/form/account-form-model';
import { Button, Chip, ColorIconSelector, IconButton, IconRenderer, InlineInput, MoneyInlineInput, Select } from '@/app/components/ui';
import { CARD_EASE, reducedTransition } from '@/app/components/ui/motion';
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
  openingBalance: string;
  openingNegative: boolean;
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
  const reduce = useReducedMotion();
  const [lookOpen, setLookOpen] = useState(false);
  const isCard = values.type === 'CREDIT_CARD';
  const symbol = currencySymbols[values.currency] ?? values.currency;
  const typeLabel = accountTypeOptions.find((option) => option.value === values.type)?.label ?? '';

  return (
    <motion.section
      aria-label="Conta"
      // O cartão abre como uma página virando, igual aos cartões da lista de Contas.
      initial={reduce ? false : { opacity: 0, rotateX: -14, y: 18 }}
      animate={{ opacity: 1, rotateX: 0, y: 0 }}
      transition={reducedTransition(reduce, { type: 'spring', stiffness: 170, damping: 20, delay: 0.1 })}
      className="relative grid gap-5 rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--account-color)_40%,var(--border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--account-color)_16%,var(--surface)),var(--surface)_70%)] p-4 shadow-[var(--shadow-surface)] sm:p-5"
      style={{ ['--account-color' as string]: values.color, transformPerspective: 900, transformOrigin: 'top center' }}
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
              {/* Trocou o ícone: o novo entra girando. */}
              <motion.span
                key={values.icon}
                className="flex"
                initial={reduce ? false : { rotate: -90, scale: 0.4, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                whileHover={{ rotate: [0, -14, 12, 0], transition: { duration: 0.5 } }}
                transition={{ type: 'spring', stiffness: 420, damping: 16 }}
              >
                <IconRenderer iconName={values.icon || 'wallet'} size={24} />
              </motion.span>
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

      <AnimatePresence initial={false}>
      {lookOpen && (
        <motion.div
          key="look"
          className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3.5"
          initial={reduce ? false : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: CARD_EASE }}
        >
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
        </motion.div>
      )}
      </AnimatePresence>

      {/* Trocar o tipo troca o bloco de baixo: o novo sobe de leve e aparece. */}
      <motion.div
        key={isCard ? 'card' : 'balance'}
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedTransition(reduce, { duration: 0.35, ease: CARD_EASE })}
      >
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
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
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
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
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

          <motion.p
            // O texto do ciclo muda a cada dia digitado: cada versão entra com um fade curto.
            key={describeCardCycle(values.statementClosingDay, values.statementDueDay)}
            aria-live="polite"
            initial={reduce ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: CARD_EASE }}
            className="rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--account-color)_10%,var(--surface-raised))] px-3 py-2.5 text-sm leading-relaxed text-[var(--text-muted)]"
          >
            {describeCardCycle(values.statementClosingDay, values.statementDueDay)}
          </motion.p>
        </div>
      ) : (
        <div className="grid gap-1">
          {isEditing ? (
            <>
              <span className="text-sm text-[var(--text-muted)]">{values.type === 'INVESTMENT' ? 'Patrimônio' : 'Saldo'}</span>
              <strong className="money text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                {currentBalance != null ? formatCurrency(currentBalance, values.currency) : `${symbol} 0,00`}
              </strong>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
                O saldo continua calculado pelas transações concluídas.
              </p>
            </>
          ) : (
            <>
              <label htmlFor="account-opening-balance" className="text-sm text-[var(--text-muted)]">
                {values.type === 'INVESTMENT' ? 'Saldo em caixa hoje' : 'Quanto você tem nesta conta hoje?'}
              </label>
              <div className="flex items-baseline gap-2">
                <span className="money text-xl text-[var(--text-muted)]">{values.openingNegative ? `− ${symbol}` : symbol}</span>
                <MoneyInlineInput
                  id="account-opening-balance"
                  size="amount"
                  value={values.openingBalance}
                  onValueChange={(openingBalance) => onChange({ openingBalance })}
                  disabled={loading}
                  placeholder="0,00"
                />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Chip
                  selected={values.openingNegative}
                  onClick={() => onChange({ openingNegative: !values.openingNegative })}
                  disabled={loading}
                >
                  Saldo devedor
                </Chip>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
                Vira um lançamento de saldo inicial, sem contar como receita ou despesa. Deixe em branco para começar do zero.
              </p>
            </>
          )}
        </div>
      )}
      </motion.div>
    </motion.section>
  );
}
