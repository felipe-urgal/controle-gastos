'use client';

import { FormEvent, useMemo, useState } from 'react';
import {
  FaBullseye,
  FaCheck,
  FaExclamationTriangle,
  FaPencilAlt,
  FaTimes,
  FaTrashAlt,
} from 'react-icons/fa';

import { Button, IconRenderer, Input, Select } from '@/app/components/ui';
import { useAuth } from '@/app/context/auth-context';
import { useCategoryMonthlyLimits } from '@/app/hooks/categories/category-monthly-limits';
import { currencyOptions } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { parseMoneyInputToCents } from '@/app/lib/currency/parse-money-input';
import { CategoryMonthlyLimitItem } from '@/app/types/category-monthly-limit';
import type { SupportedCurrency } from '@/app/types/financial-summary';

type LimitFilter = 'all' | 'critical' | 'no-limit';

function amountToInput(amount: number) {
  const whole = Math.floor(amount / 100);
  const cents = String(amount % 100).padStart(2, '0');
  return `${whole},${cents}`;
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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<LimitFilter>('all');
  const showValues = user?.showValues !== false;
  const mutationBusy = savingCategoryId !== null || removingCategoryId !== null;
  const controlsDisabled = loading || mutationBusy;

  const limitedItems = useMemo(() => items.filter((item) => item.limit !== null), [items]);
  const criticalItems = useMemo(
    () =>
      limitedItems
        .filter((item) => (item.percentage ?? 0) >= 80)
        .sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0)),
    [limitedItems],
  );
  const noLimitItems = useMemo(() => items.filter((item) => item.limit === null), [items]);
  const budgetTotal = useMemo(
    () => limitedItems.reduce((total, item) => total + (item.limit?.amount ?? 0), 0),
    [limitedItems],
  );
  const realizedTotal = useMemo(
    () => items.reduce((total, item) => total + item.realized, 0),
    [items],
  );
  const remainingTotal = useMemo(
    () => limitedItems.reduce((total, item) => total + (item.remaining ?? 0), 0),
    [limitedItems],
  );
  const filteredItems = useMemo(() => {
    if (activeFilter === 'critical') return criticalItems;
    if (activeFilter === 'no-limit') return noLimitItems;
    return items;
  }, [activeFilter, criticalItems, items, noLimitItems]);
  const selectedItem = items.find((item) => item.category.id === selectedCategoryId) ?? null;

  const startEditing = (item: CategoryMonthlyLimitItem) => {
    setSelectedCategoryId(item.category.id);
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

  const resetTransientState = () => {
    cancelEditing();
    setConfirmingRemoveId(null);
    setSelectedCategoryId(null);
    setActiveFilter('all');
  };

  const handleCurrencyChange = (value: string | number) => {
    resetTransientState();
    setCurrency(value as SupportedCurrency);
  };

  const handlePeriodChange = (value: string) => {
    resetTransientState();
    setPeriod(value);
  };

  const handleSave = async (event: FormEvent, categoryId: string) => {
    event.preventDefault();
    const amount = parseMoneyInputToCents(editingValue);

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

  const editFromMap = (item: CategoryMonthlyLimitItem) => {
    startEditing(item);
    window.requestAnimationFrame(() => {
      document.getElementById(`category-limit-${item.category.id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  };

  return (
    <section className="space-y-5" aria-labelledby="monthly-limits-title">
      <div className="ds-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--orbit-primary)]">
              Spending Map Orbit
            </p>
            <div className="mt-1 flex items-center gap-2 text-[var(--foreground)]">
              <FaBullseye aria-hidden="true" />
              <h2 id="monthly-limits-title" className="text-xl font-semibold">
                Orçamento por categoria
              </h2>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
              O realizado considera somente despesas concluídas em contas de {currency}. Orçamento e restante usam apenas limites da mesma moeda.
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
                disabled={controlsDisabled}
              />
            </div>
            <div className="w-full sm:w-52">
              <Input
                id="category-limit-period"
                type="month"
                label="Mês de referência"
                value={periodValue}
                onChange={(event) => handlePeriodChange(event.currentTarget.value)}
                disabled={controlsDisabled}
              />
            </div>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-[var(--radius-md)] border border-[var(--danger)]/35 bg-[var(--danger)]/10 p-3 text-sm text-[var(--expense)]"
          >
            {error}
          </p>
        )}
      </div>

      {loading ? (
        <div className="ds-panel p-5 text-base text-[var(--text-muted)]" role="status">
          Carregando limites…
        </div>
      ) : items.length === 0 ? (
        <div className="ds-panel p-5">
          <p className="text-base font-semibold text-[var(--foreground)]">Nenhuma categoria de despesa</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
            Crie uma categoria de despesa para começar a definir limites mensais.
          </p>
        </div>
      ) : (
        <>
          <BudgetSummary
            budgetTotal={budgetTotal}
            realizedTotal={realizedTotal}
            remainingTotal={remainingTotal}
            criticalCount={criticalItems.length}
            currency={currency}
            showValues={showValues}
          />

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.7fr)]">
            <SpendingMap
              items={items}
              selectedCategoryId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
              currency={currency}
              showValues={showValues}
            />
            <CategoryContext
              item={selectedItem}
              criticalItems={criticalItems}
              currency={currency}
              showValues={showValues}
              mutationBusy={mutationBusy}
              onSelect={setSelectedCategoryId}
              onEdit={editFromMap}
            />
          </div>

          <div className="ds-panel p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Categorias de despesa</h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Lista textual completa do mapa, inclusive categorias sem limite e inativas.
                </p>
              </div>
              <LimitFilters
                activeFilter={activeFilter}
                onChange={setActiveFilter}
                counts={{
                  all: items.length,
                  critical: criticalItems.length,
                  noLimit: noLimitItems.length,
                }}
              />
            </div>

            {filteredItems.length === 0 ? (
              <p className="mt-5 text-sm text-[var(--text-muted)]">Nenhuma categoria neste filtro.</p>
            ) : (
              <ul className="mt-5 space-y-3">
                {filteredItems.map((item) => {
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
                      id={`category-limit-${item.category.id}`}
                      key={item.category.id}
                      className={`rounded-[var(--radius-lg)] border bg-[var(--surface-raised)] p-4 sm:p-5 ${
                        selectedCategoryId === item.category.id
                          ? 'border-[var(--orbit-primary)]'
                          : 'border-[var(--border)]'
                      }`}
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <button
                          type="button"
                          className="flex min-h-11 min-w-0 items-center gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
                          onClick={() => setSelectedCategoryId(item.category.id)}
                          aria-pressed={selectedCategoryId === item.category.id}
                        >
                          <span
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-white"
                            style={{ backgroundColor: item.category.color || '#64748B' }}
                            aria-hidden="true"
                          >
                            <IconRenderer iconName={item.category.icon || 'tag'} size={18} />
                          </span>
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="break-words text-base font-semibold text-[var(--foreground)]">
                                {item.category.name}
                              </span>
                              <span className="rounded-full border border-[var(--border-strong)] px-2 py-0.5 text-sm font-semibold text-[var(--text-muted)]">
                                {currency}
                              </span>
                              {!item.category.isActive && (
                                <span className="rounded-full border border-[var(--border-strong)] px-2 py-0.5 text-sm text-[var(--text-muted)]">
                                  Inativa
                                </span>
                              )}
                            </span>
                            <span
                              className={`mt-1 block text-sm font-medium ${
                                exceeded
                                  ? 'text-[var(--expense)]'
                                  : attention
                                    ? 'text-[var(--warning)]'
                                    : 'text-[var(--text-muted)]'
                              }`}
                            >
                              {statusText}
                            </span>
                          </span>
                        </button>

                        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 xl:min-w-[430px]">
                          <Metric label="Orçamento" value={displayMoney(item.limit?.amount ?? null, showValues, currency)} />
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
                              className={`h-full rounded-full ${
                                exceeded
                                  ? 'bg-[var(--danger)]'
                                  : attention
                                    ? 'bg-[var(--warning)]'
                                    : 'bg-[var(--orbit-primary)]'
                              }`}
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
                            <Button
                              type="submit"
                              size="sm"
                              icon={<FaCheck />}
                              isLoading={savingCategoryId === item.category.id}
                              loadingText="Salvando"
                              className="!bg-[var(--orbit-primary)] !text-[var(--orbit-on-primary)] hover:!bg-[var(--orbit-primary-hover)]"
                            >
                              Salvar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              icon={<FaTimes />}
                              onClick={cancelEditing}
                              disabled={savingCategoryId === item.category.id}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<FaPencilAlt />}
                            onClick={() => startEditing(item)}
                            disabled={mutationBusy}
                          >
                            {item.limit ? 'Editar limite' : 'Definir limite'}
                          </Button>

                          {item.limit && (
                            <Button
                              size="sm"
                              variant={isConfirmingRemove ? 'danger' : 'ghost'}
                              icon={<FaTrashAlt />}
                              onClick={() => void handleRemove(item.category.id)}
                              isLoading={removingCategoryId === item.category.id}
                              loadingText="Removendo"
                              disabled={mutationBusy && removingCategoryId !== item.category.id}
                            >
                              {isConfirmingRemove ? 'Confirmar remoção' : 'Remover limite'}
                            </Button>
                          )}

                          {isConfirmingRemove && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setConfirmingRemoveId(null)}
                              disabled={mutationBusy}
                            >
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
          </div>
        </>
      )}
    </section>
  );
}

function BudgetSummary({
  budgetTotal,
  realizedTotal,
  remainingTotal,
  criticalCount,
  currency,
  showValues,
}: {
  budgetTotal: number;
  realizedTotal: number;
  remainingTotal: number;
  criticalCount: number;
  currency: SupportedCurrency;
  showValues: boolean;
}) {
  const metrics = [
    { label: 'Orçamento com limite', value: displayMoney(budgetTotal, showValues, currency) },
    { label: 'Realizado em despesas', value: displayMoney(realizedTotal, showValues, currency) },
    {
      label: 'Restante dos limites',
      value: displayMoney(remainingTotal, showValues, currency),
      className: remainingTotal < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]',
    },
    {
      label: 'Categorias críticas',
      value: String(criticalCount),
      className: criticalCount > 0 ? 'text-[var(--warning)]' : 'text-[var(--foreground)]',
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={`Resumo do orçamento em ${currency}`}>
      {metrics.map((metric) => (
        <article key={metric.label} className="ds-panel p-4 sm:p-5">
          <p className="text-sm font-medium text-[var(--text-muted)]">{metric.label}</p>
          <p className={`mt-2 break-words text-2xl font-bold tracking-tight ${metric.className ?? 'text-[var(--foreground)]'}`}>
            {metric.value}
          </p>
          <p className="mt-1 text-sm text-[var(--text-subtle)]">{currency}</p>
        </article>
      ))}
    </section>
  );
}

function SpendingMap({
  items,
  selectedCategoryId,
  onSelect,
  currency,
  showValues,
}: {
  items: CategoryMonthlyLimitItem[];
  selectedCategoryId: string | null;
  onSelect: (categoryId: string) => void;
  currency: SupportedCurrency;
  showValues: boolean;
}) {
  const mapItems = [...items].sort((a, b) => b.realized - a.realized).slice(0, 8);
  const maxRealized = Math.max(1, ...mapItems.map((item) => item.realized));

  return (
    <section className="ds-panel p-5 sm:p-6" aria-labelledby="spending-map-title">
      <h3 id="spending-map-title" className="text-xl font-semibold text-[var(--foreground)]">
        Mapa de gastos
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
        Cada ponto é uma categoria real. O tamanho representa o realizado relativo dentro deste recorte, sem converter moedas.
      </p>

      <div className="mt-6 flex min-h-[300px] flex-wrap items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4 sm:min-h-[360px]">
        {mapItems.map((item) => {
          const size = 88 + Math.round((item.realized / maxRealized) * 44);
          const selected = selectedCategoryId === item.category.id;
          const percentage = item.percentage ?? 0;
          const status = !item.limit
            ? 'Sem limite'
            : percentage > 100
              ? 'Excedida'
              : percentage >= 80
                ? 'Atenção'
                : 'Dentro do limite';

          return (
            <button
              key={item.category.id}
              type="button"
              aria-pressed={selected}
              aria-label={`${item.category.name}: ${displayMoney(item.realized, showValues, currency)} realizado. ${status}.`}
              onClick={() => onSelect(item.category.id)}
              className={`flex shrink-0 flex-col items-center justify-center rounded-full border-2 bg-[var(--surface)] p-2 text-center shadow-sm transition-[border-color,transform] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
                selected ? 'ring-2 ring-[var(--orbit-primary)] ring-offset-2 ring-offset-[var(--surface-subtle)]' : ''
              }`}
              style={{
                width: `${size}px`,
                height: `${size}px`,
                borderColor: item.category.color || 'var(--border-strong)',
              }}
            >
              <span className="max-w-full truncate text-sm font-semibold text-[var(--foreground)]">
                {item.category.name}
              </span>
              <span className="mt-1 text-sm text-[var(--text-muted)]">
                {displayMoney(item.realized, showValues, currency)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CategoryContext({
  item,
  criticalItems,
  currency,
  showValues,
  mutationBusy,
  onSelect,
  onEdit,
}: {
  item: CategoryMonthlyLimitItem | null;
  criticalItems: CategoryMonthlyLimitItem[];
  currency: SupportedCurrency;
  showValues: boolean;
  mutationBusy: boolean;
  onSelect: (categoryId: string) => void;
  onEdit: (item: CategoryMonthlyLimitItem) => void;
}) {
  return (
    <section className="ds-panel p-5 sm:p-6" aria-labelledby="category-context-title">
      <div className="flex items-center gap-2">
        <FaExclamationTriangle
          className={criticalItems.length ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'}
          aria-hidden="true"
        />
        <h3 id="category-context-title" className="text-xl font-semibold text-[var(--foreground)]">
          Contexto da categoria
        </h3>
      </div>

      {item ? (
        <div className="mt-5">
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-white"
              style={{ backgroundColor: item.category.color || '#64748B' }}
              aria-hidden="true"
            >
              <IconRenderer iconName={item.category.icon || 'tag'} size={18} />
            </span>
            <div>
              <p className="text-base font-semibold text-[var(--foreground)]">{item.category.name}</p>
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                {item.limit ? `${item.percentage ?? 0}% do limite usado` : 'Sem limite definido'}
              </p>
            </div>
          </div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <ContextMetric label="Orçamento" value={displayMoney(item.limit?.amount ?? null, showValues, currency)} />
            <ContextMetric label="Realizado" value={displayMoney(item.realized, showValues, currency)} />
            <ContextMetric label="Restante" value={displayMoney(item.remaining, showValues, currency)} />
          </dl>
          <Button
            size="sm"
            variant="secondary"
            icon={<FaPencilAlt />}
            onClick={() => onEdit(item)}
            disabled={mutationBusy}
            className="mt-5"
          >
            {item.limit ? 'Editar limite' : 'Definir limite'}
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-[var(--text-muted)]">
          Selecione um ponto no mapa ou uma categoria da lista para abrir o detalhe contextual.
        </p>
      )}

      <div className="mt-6 border-t border-[var(--border)] pt-5">
        <h4 className="text-base font-semibold text-[var(--foreground)]">Críticas agora</h4>
        {criticalItems.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--text-muted)]">Nenhuma categoria chegou a 80% do limite.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {criticalItems.slice(0, 4).map((critical) => (
              <li key={critical.category.id}>
                <button
                  type="button"
                  onClick={() => onSelect(critical.category.id)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
                >
                  <span className="min-w-0 truncate text-sm font-semibold text-[var(--foreground)]">
                    {critical.category.name}
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-[var(--warning)]">
                    {critical.percentage ?? 0}%
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function LimitFilters({
  activeFilter,
  onChange,
  counts,
}: {
  activeFilter: LimitFilter;
  onChange: (filter: LimitFilter) => void;
  counts: Record<LimitFilter, number>;
}) {
  const filters: Array<{ key: LimitFilter; label: string }> = [
    { key: 'all', label: 'Todas' },
    { key: 'critical', label: 'Críticas' },
    { key: 'no-limit', label: 'Sem limite' },
  ];

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar categorias do orçamento">
      {filters.map((filter) => {
        const active = filter.key === activeFilter;
        return (
          <button
            key={filter.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(filter.key)}
            className={`min-h-11 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
              active
                ? 'border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'
                : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]'
            }`}
          >
            {filter.label} · {counts[filter.key]}
          </button>
        );
      })}
    </div>
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
      <p className={`mt-1 text-base font-semibold text-[var(--foreground)] [overflow-wrap:anywhere] ${className}`}>
        {value}
      </p>
    </div>
  );
}

function ContextMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-3">
      <dt className="text-sm text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-1 break-words text-base font-semibold text-[var(--foreground)]">{value}</dd>
    </div>
  );
}
