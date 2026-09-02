'use client';

import { FormEvent, useState } from 'react';
import { FaBullseye, FaCheck, FaPencilAlt, FaTimes, FaTrashAlt } from 'react-icons/fa';

import { useAuth } from '@/app/context/auth-context';
import { useCategoryMonthlyLimits } from '@/app/hooks/categories/category-monthly-limits';
import { currencyOptions } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { Button, IconRenderer, Input, Select } from '@/app/components/ui';
import { CategoryMonthlyLimitItem } from '@/app/types/category-monthly-limit';
import type { SupportedCurrency } from '@/app/types/financial-summary';

function amountToInput(amount: number) {
  const whole = Math.floor(amount / 100);
  const cents = String(amount % 100).padStart(2, '0');
  return `${whole},${cents}`;
}

function parseAmountToCents(value: string) {
  const normalized = value.trim().replace(/\s/g, '').replace(/[^\d.,]/g, '');
  if (!/^\d+(?:[.,]\d{0,2})?$/.test(normalized)) return null;

  const [wholePart, fractionPart = ''] = normalized.replace(',', '.').split('.');
  const whole = Number(wholePart);
  const cents = Number(fractionPart.padEnd(2, '0'));
  const total = whole * 100 + cents;

  if (!Number.isSafeInteger(total) || total <= 0) return null;
  return total;
}

function displayMoney(
  amount: number | null,
  showValues: boolean,
  currency: SupportedCurrency,
) {
  if (amount === null) return '—';
  return showValues ? formatCurrency(amount, currency) : '••••';
}

export default function CategoryMonthlyLimits() {
  const { user } = useAuth();
  const {
    items,
    loading,
    error,
    periodValue,
    currency,
    savingCategoryId,
    removingCategoryId,
    setPeriod,
    setCurrency,
    save,
    remove,
  } = useCategoryMonthlyLimits();
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);
  const showValues = user?.showValues !== false;

  const startEditing = (item: CategoryMonthlyLimitItem) => {
    setEditingCategoryId(item.category.id);
    setEditingValue(showValues && item.limit ? amountToInput(item.limit.amount) : '');
    setFieldError('');
    setConfirmingRemoveId(null);
  };

  const cancelEditing = () => {
    setEditingCategoryId(null);
    setEditingValue('');
    setFieldError('');
  };

  const handleCurrencyChange = (value: string | number) => {
    cancelEditing();
    setConfirmingRemoveId(null);
    setCurrency(value as SupportedCurrency);
  };

  const handleSave = async (event: FormEvent, categoryId: string) => {
    event.preventDefault();
    const amount = parseAmountToCents(editingValue);

    if (amount === null) {
      setFieldError('Informe um valor maior que zero com até 2 casas decimais.');
      return;
    }

    try {
      await save(categoryId, amount);
      cancelEditing();
    } catch {
      // O erro da API já é exibido no painel pelo hook.
    }
  };

  const handleRemove = async (categoryId: string) => {
    if (confirmingRemoveId !== categoryId) {
      setConfirmingRemoveId(categoryId);
      setEditingCategoryId(null);
      return;
    }

    try {
      await remove(categoryId);
      setConfirmingRemoveId(null);
    } catch {
      // O erro da API já é exibido no painel pelo hook.
    }
  };

  return (
    <section className="ds-panel p-5 sm:p-6" aria-labelledby="monthly-limits-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-[var(--foreground)]">
            <FaBullseye aria-hidden="true" />
            <h2 id="monthly-limits-title" className="text-xl font-semibold">
              Limites mensais
            </h2>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
            Planeje por categoria e moeda. O realizado considera somente despesas concluídas em contas da moeda selecionada.
          </p>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto">
          <div className="w-full sm:w-44">
            <Select
              id="category-limit-currency"
              label="Moeda"
              value={currency}
              options={currencyOptions}
              onChange={handleCurrencyChange}
              disabled={loading}
            />
          </div>
          <div className="w-full sm:w-52">
            <Input
              id="category-limit-period"
              type="month"
              label="Mês de referência"
              value={periodValue}
              onChange={(event) => setPeriod(event.currentTarget.value)}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-[var(--radius-md)] border border-[var(--danger)]/35 bg-[var(--danger)]/10 p-3 text-sm text-[var(--expense)]">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-5 text-base text-[var(--text-muted)]" role="status">
          Carregando limites…
        </p>
      ) : items.length === 0 ? (
        <div className="mt-5 rounded-[var(--radius-md)] border border-dashed border-[var(--border-strong)] p-5">
          <p className="text-base font-semibold text-[var(--foreground)]">Nenhuma categoria de despesa</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
            Crie uma categoria de despesa para começar a definir limites mensais.
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map((item) => {
            const isEditing = editingCategoryId === item.category.id;
            const isConfirmingRemove = confirmingRemoveId === item.category.id;
            const percentage = item.percentage ?? 0;
            const progressValue = Math.max(0, Math.min(100, percentage));
            const exceeded = item.limit !== null && percentage > 100;
            const attention = item.limit !== null && percentage >= 80 && percentage <= 100;
            const statusText = !item.limit
              ? `Sem limite definido em ${currency}`
              : exceeded
                ? `Limite excedido em ${displayMoney(Math.abs(item.remaining ?? 0), showValues, currency)}`
                : attention
                  ? `${percentage}% do limite utilizado`
                  : 'Dentro do limite';

            return (
              <li
                key={item.category.id}
                className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-white"
                      style={{ backgroundColor: item.category.color || '#64748B' }}
                      aria-hidden="true"
                    >
                      <IconRenderer iconName={item.category.icon || 'tag'} size={18} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-[var(--foreground)]">
                          {item.category.name}
                        </h3>
                        <span className="rounded-full border border-[var(--border-strong)] px-2 py-0.5 text-sm font-semibold text-[var(--text-muted)]">
                          {currency}
                        </span>
                        {!item.category.isActive && (
                          <span className="rounded-full border border-[var(--border-strong)] px-2 py-0.5 text-sm text-[var(--text-muted)]">
                            Inativa
                          </span>
                        )}
                      </div>
                      <p className={`mt-1 text-sm font-medium ${exceeded ? 'text-[var(--expense)]' : attention ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'}`}>
                        {statusText}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:min-w-[430px]">
                    <Metric label="Limite" value={displayMoney(item.limit?.amount ?? null, showValues, currency)} />
                    <Metric label="Realizado" value={displayMoney(item.realized, showValues, currency)} />
                    <Metric
                      label="Restante"
                      value={displayMoney(item.remaining, showValues, currency)}
                      className={exceeded ? 'text-[var(--expense)]' : undefined}
                    />
                  </div>
                </div>

                {item.limit && (
                  <div className="mt-4">
                    <div
                      className="h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]"
                      role="progressbar"
                      aria-label={`Uso do limite de ${item.category.name} em ${currency}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(progressValue)}
                      aria-valuetext={`${percentage}% utilizado em ${currency}`}
                    >
                      <div
                        className={`h-full rounded-full ${exceeded ? 'bg-[var(--danger)]' : attention ? 'bg-[var(--warning)]' : 'bg-[var(--primary)]'}`}
                        style={{ width: `${progressValue}%` }}
                      />
                    </div>
                  </div>
                )}

                {isEditing ? (
                  <form
                    className="mt-4 flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:flex-row sm:items-end"
                    onSubmit={(event) => void handleSave(event, item.category.id)}
                  >
                    <div className="flex-1">
                      <Input
                        label={`Valor do limite em ${currency}`}
                        inputMode="decimal"
                        placeholder="Ex.: 800,00"
                        value={editingValue}
                        onChange={(event) => {
                          setEditingValue(event.currentTarget.value);
                          if (fieldError) setFieldError('');
                        }}
                        error={fieldError}
                        autoFocus
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" size="sm" icon={<FaCheck />} isLoading={savingCategoryId === item.category.id} loadingText="Salvando">
                        Salvar
                      </Button>
                      <Button type="button" size="sm" variant="secondary" icon={<FaTimes />} onClick={cancelEditing} disabled={savingCategoryId === item.category.id}>
                        Cancelar
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" icon={<FaPencilAlt />} onClick={() => startEditing(item)} disabled={removingCategoryId === item.category.id}>
                      {item.limit ? 'Editar limite' : 'Definir limite'}
                    </Button>

                    {item.limit && (
                      <Button size="sm" variant={isConfirmingRemove ? 'danger' : 'ghost'} icon={<FaTrashAlt />} onClick={() => void handleRemove(item.category.id)} isLoading={removingCategoryId === item.category.id} loadingText="Removendo">
                        {isConfirmingRemove ? 'Confirmar remoção' : 'Remover limite'}
                      </Button>
                    )}

                    {isConfirmingRemove && (
                      <Button size="sm" variant="secondary" onClick={() => setConfirmingRemoveId(null)} disabled={removingCategoryId === item.category.id}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-medium text-[var(--text-muted)]">{label}</p>
      <p className={`mt-1 truncate text-base font-semibold text-[var(--foreground)] ${className}`}>
        {value}
      </p>
    </div>
  );
}
