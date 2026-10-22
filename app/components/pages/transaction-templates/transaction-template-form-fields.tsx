'use client';

import type { Dispatch, SetStateAction } from 'react';
import { FaStar, FaRegStar } from 'react-icons/fa';

import { Button, Chip, Input, Select } from '@/app/components/ui';
import {
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
  TRANSACTION_MAX_AMOUNT_CENTS,
} from '@/app/lib/transactions/transaction-field-contract';
import type { TransactionTemplateInput } from '@/app/types/transaction-template';

type Option = { value: string; label: string; disabled?: boolean };

export default function TransactionTemplateFormFields({
  form,
  setForm,
  accountOptions,
  categoryOptions,
  accountsLoading,
  categoriesLoading,
  accountError,
  categoryError,
  onRetryAccounts,
  onRetryCategories,
  preview,
}: {
  form: TransactionTemplateInput;
  setForm: Dispatch<SetStateAction<TransactionTemplateInput>>;
  accountOptions: Option[];
  categoryOptions: Option[];
  accountsLoading: boolean;
  categoriesLoading: boolean;
  accountError: string;
  categoryError: string;
  onRetryAccounts: () => void;
  onRetryCategories: () => void;
  preview: { summary: string; missing: string | null };
}) {
  return (
    <div className="grid gap-4">
      <Input
        label="Nome"
        maxLength={80}
        enterKeyHint="next"
        value={form.name}
        onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
      />

      <div className="grid gap-1.5">
        <span className="text-sm font-semibold">Tipo</span>
        <div className="flex gap-2" role="group" aria-label="Tipo">
          <Chip selected={form.type === 'EXPENSE'} onClick={() => setForm((value) => ({ ...value, type: 'EXPENSE', categoryId: null }))}>
            Despesa
          </Chip>
          <Chip selected={form.type === 'INCOME'} onClick={() => setForm((value) => ({ ...value, type: 'INCOME', categoryId: null }))}>
            Receita
          </Chip>
        </div>
      </div>

      <Input
        label="Descrição"
        maxLength={TRANSACTION_DESCRIPTION_MAX_LENGTH}
        enterKeyHint="next"
        value={form.description ?? ''}
        onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))}
      />

      <div className="grid gap-3 rounded-[12px] border border-dashed border-[var(--border-strong)] p-3.5">
        <p className="text-xs text-[var(--text-muted)]">Opcional. O que ficar vazio você escolhe na hora de usar.</p>

        <Input
          label="Valor"
          type="number"
          inputMode="decimal"
          enterKeyHint="done"
          min="0.01"
          max={TRANSACTION_MAX_AMOUNT_CENTS / 100}
          step="0.01"
          value={form.amount ? form.amount / 100 : ''}
          onChange={(event) =>
            setForm((value) => ({
              ...value,
              amount: event.target.value ? Math.round(Number(event.target.value) * 100) : null,
            }))
          }
        />

        <div className="grid gap-1">
          <Select
            label="Conta"
            value={form.accountId ?? ''}
            disabled={accountsLoading || Boolean(accountError)}
            onChange={(next) => setForm((value) => ({ ...value, accountId: String(next) || null }))}
            placeholder={accountsLoading ? 'Carregando contas…' : 'Escolher ao usar'}
            options={accountOptions}
          />
          {accountError && <RetryNotice message={accountError} onRetry={onRetryAccounts} />}
        </div>

        <div className="grid gap-1">
          <Select
            label="Categoria"
            value={form.categoryId ?? ''}
            disabled={categoriesLoading || Boolean(categoryError)}
            onChange={(next) => setForm((value) => ({ ...value, categoryId: String(next) || null }))}
            placeholder={categoriesLoading ? 'Carregando categorias…' : 'Escolher ao usar'}
            options={categoryOptions}
          />
          {categoryError && <RetryNotice message={categoryError} onRetry={onRetryCategories} />}
        </div>
      </div>

      <div>
        <Chip selected={form.isFavorite ?? false} onClick={() => setForm((value) => ({ ...value, isFavorite: !value.isFavorite }))}>
          {form.isFavorite ? <FaStar aria-hidden="true" /> : <FaRegStar aria-hidden="true" />}
          Favoritar
        </Chip>
      </div>

      <div className="grid gap-1 rounded-[12px] bg-[var(--orbit-primary-subtle)] px-3.5 py-3">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--orbit-primary)]">Ao usar, preenche</p>
        <p className="break-words text-[13px]">{preview.summary}</p>
        {preview.missing && <p className="text-[13px] text-[var(--text-muted)]">{preview.missing}</p>}
      </div>
    </div>
  );
}

function RetryNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] p-2 text-xs">
      <span role="alert">{message}</span>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}
