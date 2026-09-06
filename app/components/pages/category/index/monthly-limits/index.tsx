'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FaCheck,
  FaExclamationTriangle,
  FaPencilAlt,
  FaPlus,
  FaSearch,
  FaTimes,
  FaTrashAlt,
} from 'react-icons/fa';

import { Button, IconRenderer, Input, Select } from '@/app/components/ui';
import { useAuth } from '@/app/context/auth-context';
import { useCategoryMonthlyLimits } from '@/app/hooks/categories/category-monthly-limits';
import { currencyOptions } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { parseMoneyInputToCents } from '@/app/lib/currency/parse-money-input';
import { transactionService } from '@/app/services/transaction-service';
import type { CategoryMonthlyLimitItem } from '@/app/types/category-monthly-limit';
import type { CategoryModel } from '@/app/types/category';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { TransactionDTO } from '@/app/types/transaction';

type LimitFilter = 'all' | 'critical' | 'income' | 'no-limit';

type CategoryMonthlyLimitsProps = {
  categories: CategoryModel[];
  categoriesLoading: boolean;
  search: string;
  onSearchChange: (search: string) => void;
};

type CategoryState = 'danger' | 'warn' | 'ok' | 'info';

const nodePositions: React.CSSProperties[] = [
  { left: '50%', top: '2%', transform: 'translateX(-50%)' },
  { right: '4%', top: '25%' },
  { right: '8%', bottom: '16%' },
  { left: '50%', bottom: '3%', transform: 'translateX(-50%)' },
  { left: '8%', bottom: '18%' },
  { left: '4%', top: '26%' },
];

function amountToInput(amount: number) {
  const whole = Math.floor(amount / 100);
  const cents = String(amount % 100).padStart(2, '0');
  return `${whole},${cents}`;
}

function displayMoney(
  amount: number | null,
  showValues: boolean,
  currency: SupportedCurrency | string,
) {
  if (amount === null) return '—';
  return showValues ? formatCurrency(amount, currency) : '••••';
}

function categoryState(item: CategoryMonthlyLimitItem): CategoryState {
  if (!item.limit) return 'info';
  const percentage = item.percentage ?? 0;
  if (percentage > 100) return 'danger';
  if (percentage >= 80) return 'warn';
  return 'ok';
}

function stateBorderTextClass(state: CategoryState) {
  if (state === 'danger') return 'border-[var(--expense)] text-[var(--expense)]';
  if (state === 'warn') return 'border-[var(--warning)] text-[var(--warning)]';
  if (state === 'ok') return 'border-[var(--income)] text-[var(--income)]';
  return 'border-[var(--orbit-primary)] text-[var(--orbit-primary)]';
}

function stateTextClass(state: CategoryState) {
  if (state === 'danger') return 'text-[var(--expense)]';
  if (state === 'warn') return 'text-[var(--warning)]';
  if (state === 'ok') return 'text-[var(--income)]';
  return 'text-[var(--orbit-primary)]';
}

function stateBarClass(state: CategoryState) {
  if (state === 'danger') return 'bg-[var(--expense)]';
  if (state === 'warn') return 'bg-[var(--warning)]';
  if (state === 'ok') return 'bg-[var(--income)]';
  return 'bg-[var(--orbit-primary)]';
}

export default function CategoryMonthlyLimits({
  categories,
  categoriesLoading,
  search,
  onSearchChange,
}: CategoryMonthlyLimitsProps) {
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

  const [activeFilter, setActiveFilter] = useState<LimitFilter>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<TransactionDTO[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);

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
  const incomeCategories = useMemo(
    () => categories.filter((category) => category.type === 'INCOME'),
    [categories],
  );

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
  const budgetPercentage =
    budgetTotal > 0 ? Math.round((realizedTotal / budgetTotal) * 1000) / 10 : 0;

  useEffect(() => {
    if (items.length === 0) {
      setSelectedCategoryId(null);
      return;
    }

    if (!selectedCategoryId || !items.some((item) => item.category.id === selectedCategoryId)) {
      setSelectedCategoryId((criticalItems[0] ?? items[0]).category.id);
    }
  }, [criticalItems, items, selectedCategoryId]);

  const selectedItem = items.find((item) => item.category.id === selectedCategoryId) ?? null;

  useEffect(() => {
    if (!selectedItem) {
      setRecentTransactions([]);
      return;
    }

    let active = true;
    const [year, month] = periodValue.split('-').map(Number);

    async function loadRecentTransactions() {
      setRecentLoading(true);
      try {
        const response = await transactionService.getAll({
          categoryId: selectedItem.category.id,
          year,
          month,
          status: 'COMPLETED',
          pageSize: 3,
        });
        if (active) setRecentTransactions(response.data?.items ?? []);
      } catch {
        if (active) setRecentTransactions([]);
      } finally {
        if (active) setRecentLoading(false);
      }
    }

    void loadRecentTransactions();
    return () => {
      active = false;
    };
  }, [periodValue, selectedItem]);

  const query = search.trim().toLocaleLowerCase('pt-BR');
  const expenseRows = useMemo(
    () => items.filter((item) => item.category.name.toLocaleLowerCase('pt-BR').includes(query)),
    [items, query],
  );
  const incomeRows = useMemo(
    () => incomeCategories.filter((category) => category.name.toLocaleLowerCase('pt-BR').includes(query)),
    [incomeCategories, query],
  );

  const filteredExpenses =
    activeFilter === 'critical'
      ? expenseRows.filter((item) => (item.percentage ?? 0) >= 80)
      : activeFilter === 'no-limit'
        ? expenseRows.filter((item) => item.limit === null)
        : activeFilter === 'income'
          ? []
          : expenseRows;
  const filteredIncome = activeFilter === 'income' || activeFilter === 'all' ? incomeRows : [];
  const exploreCount = filteredExpenses.length + filteredIncome.length;

  function resetTransientState() {
    setEditingCategoryId(null);
    setEditingValue('');
    setFieldError('');
    setConfirmingRemoveId(null);
    setSelectedCategoryId(null);
  }

  function startEditing(item: CategoryMonthlyLimitItem) {
    setSelectedCategoryId(item.category.id);
    setEditingCategoryId(item.category.id);
    setEditingValue(showValues && item.limit ? amountToInput(item.limit.amount) : '');
    setFieldError('');
    setConfirmingRemoveId(null);
  }

  function closeEditing() {
    setEditingCategoryId(null);
    setEditingValue('');
    setFieldError('');
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!editingCategoryId) return;

    const amount = parseMoneyInputToCents(editingValue);
    if (amount === null) {
      setFieldError('Informe um valor maior que zero com até 2 casas decimais.');
      return;
    }

    try {
      await save(editingCategoryId, amount);
      closeEditing();
    } catch {
      // O hook já expõe a falha da API no painel principal.
    }
  }

  async function handleRemove(item: CategoryMonthlyLimitItem) {
    if (confirmingRemoveId !== item.category.id) {
      setConfirmingRemoveId(item.category.id);
      return;
    }

    try {
      await remove(item.category.id);
      setConfirmingRemoveId(null);
    } catch {
      // O hook já expõe a falha da API no painel principal.
    }
  }

  const editingItem = items.find((item) => item.category.id === editingCategoryId) ?? null;

  return (
    <section aria-labelledby="categories-title">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 id="categories-title" className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-[30px]">
            Categorias / Limites
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Mapeie, acompanhe e ajuste seus limites por categoria.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-[180px_150px_auto]">
          <Input
            id="category-limit-period"
            type="month"
            aria-label="Mês de referência"
            value={periodValue}
            onChange={(event) => {
              resetTransientState();
              setPeriod(event.currentTarget.value);
            }}
            disabled={controlsDisabled}
          />
          <Select
            id="category-limit-currency"
            ariaLabel="Moeda"
            value={currency}
            options={currencyOptions}
            onChange={(value) => {
              resetTransientState();
              setCurrency(value as SupportedCurrency);
            }}
            disabled={controlsDisabled}
          />
          <Link
            href="/categorias/nova"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--orbit-primary)]/45 bg-[var(--orbit-primary)] px-3 text-sm font-bold text-[var(--orbit-on-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            <FaPlus aria-hidden="true" /> Nova categoria
          </Link>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-[12px] border border-[var(--expense)]/35 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
        >
          {error}
        </p>
      )}

      <BudgetSummary
        loading={loading}
        budgetTotal={budgetTotal}
        realizedTotal={realizedTotal}
        remainingTotal={remainingTotal}
        criticalCount={criticalItems.length}
        budgetPercentage={budgetPercentage}
        currency={currency}
        showValues={showValues}
      />

      <div className="my-5 flex flex-col gap-3 min-[981px]:flex-row min-[981px]:items-center min-[981px]:justify-between">
        <LimitFilters
          activeFilter={activeFilter}
          onChange={setActiveFilter}
          counts={{
            all: items.length + incomeCategories.length,
            critical: criticalItems.length,
            income: incomeCategories.length,
            'no-limit': noLimitItems.length,
          }}
        />
        <div className="w-full min-[981px]:max-w-[320px]">
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar categoria..."
            aria-label="Buscar categoria"
            icon={<FaSearch />}
            disabled={categoriesLoading}
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--text-muted)]" role="status">
          Carregando limites…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="font-semibold text-[var(--foreground)]">Nenhuma categoria de despesa</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Crie uma categoria de despesa para começar a definir limites mensais.
          </p>
        </div>
      ) : (
        <>
          <section className="grid items-start gap-4 min-[981px]:grid-cols-[minmax(540px,1.25fr)_minmax(360px,.75fr)]">
            <div className="order-2 min-[981px]:order-1">
              <SpendingMap
                items={items}
                selectedCategoryId={selectedCategoryId}
                onSelect={setSelectedCategoryId}
                realizedTotal={realizedTotal}
                budgetPercentage={budgetPercentage}
                currency={currency}
                showValues={showValues}
              />
            </div>

            <div className="order-1 grid gap-3.5 min-[981px]:order-2">
              <CriticalCategories
                items={criticalItems}
                selectedCategoryId={selectedCategoryId}
                onSelect={setSelectedCategoryId}
                currency={currency}
                showValues={showValues}
                onShowAll={() => setActiveFilter('critical')}
              />
              <CategoryContext
                item={selectedItem}
                currency={currency}
                showValues={showValues}
                mutationBusy={mutationBusy}
                recentTransactions={recentTransactions}
                recentLoading={recentLoading}
                onEdit={startEditing}
              />
            </div>
          </section>

          <ExploreCategories
            activeFilter={activeFilter}
            expenses={filteredExpenses}
            income={filteredIncome}
            count={exploreCount}
            currency={currency}
            showValues={showValues}
            selectedCategoryId={selectedCategoryId}
            onSelectExpense={setSelectedCategoryId}
          />

          <details className="mt-4 rounded-[14px] border border-[var(--border)] bg-[var(--surface)]">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[var(--text-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">
              Administração de limites
            </summary>
            <div className="border-t border-[var(--border)] p-3">
              <p className="mb-3 text-xs text-[var(--text-muted)]">
                Edição e remoção completas ficam nesta camada secundária para não competir com o Spending Map.
              </p>
              <div className="grid gap-2">
                {items.map((item) => {
                  const confirming = confirmingRemoveId === item.category.id;
                  return (
                    <div
                      key={item.category.id}
                      className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--foreground)]">{item.category.name}</p>
                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                          {item.limit ? displayMoney(item.limit.amount, showValues, currency) : 'Sem limite'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<FaPencilAlt />}
                          onClick={() => startEditing(item)}
                          disabled={mutationBusy}
                        >
                          {item.limit ? 'Editar' : 'Definir'}
                        </Button>
                        {item.limit && (
                          <Button
                            size="sm"
                            variant={confirming ? 'danger' : 'ghost'}
                            icon={<FaTrashAlt />}
                            onClick={() => void handleRemove(item)}
                            isLoading={removingCategoryId === item.category.id}
                            loadingText="Removendo"
                            disabled={mutationBusy && removingCategoryId !== item.category.id}
                          >
                            {confirming ? 'Confirmar remoção' : 'Remover'}
                          </Button>
                        )}
                        {confirming && (
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
                    </div>
                  );
                })}
              </div>
            </div>
          </details>
        </>
      )}

      {editingItem && (
        <LimitEditorModal
          item={editingItem}
          currency={currency}
          value={editingValue}
          fieldError={fieldError}
          saving={savingCategoryId === editingItem.category.id}
          onValueChange={(value) => {
            setEditingValue(value);
            if (fieldError) setFieldError('');
          }}
          onClose={closeEditing}
          onSubmit={handleSave}
        />
      )}
    </section>
  );
}

function BudgetSummary({
  loading,
  budgetTotal,
  realizedTotal,
  remainingTotal,
  criticalCount,
  budgetPercentage,
  currency,
  showValues,
}: {
  loading: boolean;
  budgetTotal: number;
  realizedTotal: number;
  remainingTotal: number;
  criticalCount: number;
  budgetPercentage: number;
  currency: SupportedCurrency;
  showValues: boolean;
}) {
  const metrics = [
    {
      label: 'ORÇAMENTO TOTAL',
      value: displayMoney(budgetTotal, showValues, currency),
      note: 'limites configurados',
      tone: 'text-[var(--income)]',
    },
    {
      label: 'REALIZADO',
      value: displayMoney(realizedTotal, showValues, currency),
      note: `${budgetPercentage.toLocaleString('pt-BR')}% do orçamento`,
      tone: 'text-[var(--orbit-primary)]',
    },
    {
      label: 'RESTANTE',
      value: displayMoney(remainingTotal, showValues, currency),
      note:
        budgetTotal > 0
          ? `${Math.max(0, 100 - budgetPercentage).toLocaleString('pt-BR')}% disponível`
          : 'sem base de limite',
      tone: remainingTotal < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]',
    },
    {
      label: 'CATEGORIAS CRÍTICAS',
      value: String(criticalCount),
      note: 'a partir de 80% do limite',
      tone: criticalCount ? 'text-[var(--expense)]' : 'text-[var(--foreground)]',
    },
  ];

  return (
    <section className="my-4 grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3" aria-label={`Resumo do orçamento em ${currency}`}>
      {metrics.map((metric) => (
        <article key={metric.label} className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3.5 sm:p-4">
          <p className="text-[10px] font-semibold text-[var(--text-muted)] sm:text-xs">{metric.label}</p>
          {loading ? (
            <div className="mt-2 h-7 animate-pulse rounded bg-[var(--skeleton)]" />
          ) : (
            <strong className={`mt-2 block break-words text-xl font-bold sm:text-2xl ${metric.tone}`}>
              {metric.value}
            </strong>
          )}
          <small className="mt-1 block text-[11px] text-[var(--text-muted)]">{metric.note}</small>
        </article>
      ))}
    </section>
  );
}

function SpendingMap({
  items,
  selectedCategoryId,
  onSelect,
  realizedTotal,
  budgetPercentage,
  currency,
  showValues,
}: {
  items: CategoryMonthlyLimitItem[];
  selectedCategoryId: string | null;
  onSelect: (categoryId: string) => void;
  realizedTotal: number;
  budgetPercentage: number;
  currency: SupportedCurrency;
  showValues: boolean;
}) {
  const mapItems = [...items].sort((a, b) => b.realized - a.realized).slice(0, 6);

  return (
    <article
      className="relative min-h-[470px] overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:min-h-[540px] sm:p-5 min-[981px]:min-h-[620px]"
      aria-labelledby="spending-map-title"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="spending-map-title" className="text-lg font-bold text-[var(--foreground)]">Mapa de Gastos Orbit</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)] sm:text-sm">Peso financeiro + consumo do limite.</p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => mapItems[0] && onSelect(mapItems[0].category.id)}
        >
          Centralizar
        </Button>
      </div>

      <div className="relative mx-auto mt-6 h-[280px] w-[280px] rounded-full border border-[var(--border-strong)] sm:h-[340px] sm:w-[340px] min-[981px]:mt-[26px] min-[981px]:h-[480px] min-[981px]:w-[480px]">
        <span className="absolute inset-[13%] rounded-full border border-[var(--border)]" aria-hidden="true" />
        <span className="absolute inset-[27%] rounded-full border border-[var(--border-strong)]" aria-hidden="true" />
        <div className="absolute left-1/2 top-1/2 grid h-28 w-28 -translate-x-1/2 -translate-y-1/2 place-content-center rounded-full border border-[var(--orbit-primary)]/45 bg-[var(--surface-raised)] text-center sm:h-[130px] sm:w-[130px] min-[981px]:h-[158px] min-[981px]:w-[158px]">
          <strong className="text-base font-bold text-[var(--orbit-primary)] sm:text-xl min-[981px]:text-2xl">
            {displayMoney(realizedTotal, showValues, currency)}
          </strong>
          <span className="mt-1 text-[10px] text-[var(--text-muted)] sm:text-[11px]">
            {budgetPercentage.toLocaleString('pt-BR')}% utilizado
          </span>
        </div>

        {mapItems.map((item, index) => {
          const selected = item.category.id === selectedCategoryId;
          const state = categoryState(item);
          return (
            <button
              key={item.category.id}
              type="button"
              onClick={() => onSelect(item.category.id)}
              aria-pressed={selected}
              aria-label={`${item.category.name}: ${displayMoney(item.realized, showValues, currency)} realizado; ${item.limit ? `${item.percentage ?? 0}% do limite` : 'sem limite'}.`}
              className={`absolute grid h-11 w-11 place-items-center rounded-full border bg-[var(--surface-raised)] text-white shadow-[0_0_0_7px_rgba(255,255,255,.02)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)] sm:h-[50px] sm:w-[50px] min-[981px]:h-[60px] min-[981px]:w-[60px] ${stateBorderTextClass(state)} ${selected ? 'ring-2 ring-white ring-offset-4 ring-offset-[var(--surface)]' : ''}`}
              style={nodePositions[index] ?? nodePositions[0]}
            >
              <IconRenderer iconName={item.category.icon || 'tag'} size={18} />
              <span className="absolute top-[calc(100%+8px)] hidden whitespace-nowrap text-[11px] font-semibold text-[var(--foreground)] min-[981px]:block">
                {item.category.name}
              </span>
              <strong className="absolute top-[calc(100%+24px)] hidden whitespace-nowrap text-[11px] min-[981px]:block">
                {item.limit ? `${item.percentage ?? 0}%` : 'Sem limite'}
              </strong>
            </button>
          );
        })}
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--border)] pt-3 text-[10px] text-[var(--text-muted)] sm:text-xs">
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[var(--expense)]" />Acima do limite</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[var(--warning)]" />Quase no limite</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[var(--income)]" />Dentro do limite</span>
      </div>
    </article>
  );
}

function CriticalCategories({
  items,
  selectedCategoryId,
  onSelect,
  currency,
  showValues,
  onShowAll,
}: {
  items: CategoryMonthlyLimitItem[];
  selectedCategoryId: string | null;
  onSelect: (categoryId: string) => void;
  currency: SupportedCurrency;
  showValues: boolean;
  onShowAll: () => void;
}) {
  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-[18px]" aria-labelledby="critical-categories-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="critical-categories-title" className="flex items-center gap-2 text-base font-bold text-[var(--foreground)]">
          <FaExclamationTriangle className={items.length ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'} aria-hidden="true" />
          Categorias críticas
        </h2>
        <Button size="sm" variant="secondary" onClick={onShowAll}>Ver todas</Button>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--text-muted)]">Nenhuma categoria chegou a 80% do limite.</p>
      ) : (
        <div className="mt-3.5 grid gap-2.5">
          {items.slice(0, 4).map((item) => {
            const selected = item.category.id === selectedCategoryId;
            const percentage = item.percentage ?? 0;
            const state = categoryState(item);
            return (
              <button
                key={item.category.id}
                type="button"
                onClick={() => onSelect(item.category.id)}
                aria-pressed={selected}
                className={`rounded-xl border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${selected ? 'border-[var(--orbit-primary)] bg-[var(--primary-subtle)]' : 'border-[var(--border)] bg-[var(--surface-raised)]'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold text-[var(--foreground)]">{item.category.name}</span>
                  <strong className={stateTextClass(state)}>{percentage}%</strong>
                </div>
                <div className="mt-2 h-[7px] overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                  <div
                    className={`h-full rounded-full ${stateBarClass(state)}`}
                    style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                  />
                </div>
                <small className="mt-1.5 block text-xs text-[var(--text-muted)]">
                  {displayMoney(item.realized, showValues, currency)} / {displayMoney(item.limit?.amount ?? null, showValues, currency)}
                </small>
              </button>
            );
          })}
        </div>
      )}
    </article>
  );
}

function CategoryContext({
  item,
  currency,
  showValues,
  mutationBusy,
  recentTransactions,
  recentLoading,
  onEdit,
}: {
  item: CategoryMonthlyLimitItem | null;
  currency: SupportedCurrency;
  showValues: boolean;
  mutationBusy: boolean;
  recentTransactions: TransactionDTO[];
  recentLoading: boolean;
  onEdit: (item: CategoryMonthlyLimitItem) => void;
}) {
  if (!item) {
    return (
      <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-[18px]">
        <p className="text-sm text-[var(--text-muted)]">Selecione uma categoria no mapa para abrir o detalhe.</p>
      </article>
    );
  }

  const percentage = item.percentage ?? 0;
  const state = categoryState(item);

  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-[18px]" aria-labelledby="category-detail-title">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] text-white"
            style={{ backgroundColor: item.category.color || '#64748B' }}
            aria-hidden="true"
          >
            <IconRenderer iconName={item.category.icon || 'tag'} size={17} />
          </span>
          <div className="min-w-0">
            <h2 id="category-detail-title" className="truncate text-base font-bold text-[var(--foreground)]">{item.category.name}</h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">Despesa · período selecionado</p>
          </div>
        </div>
        <strong className={stateTextClass(state)}>{item.limit ? `${percentage}%` : '—'}</strong>
      </div>

      <dl className="my-4 grid grid-cols-3 gap-2.5">
        <ContextMetric label="Limite" value={displayMoney(item.limit?.amount ?? null, showValues, currency)} />
        <ContextMetric label="Realizado" value={displayMoney(item.realized, showValues, currency)} />
        <ContextMetric
          label="Restante"
          value={displayMoney(item.remaining, showValues, currency)}
          className={(item.remaining ?? 0) < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}
        />
      </dl>

      {item.limit && (
        <div
          className="h-[7px] overflow-hidden rounded-full bg-[var(--surface-subtle)]"
          role="progressbar"
          aria-label={`Uso do limite de ${item.category.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(Math.min(100, Math.max(0, percentage)))}
        >
          <div
            className={`h-full rounded-full ${stateBarClass(state)}`}
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          />
        </div>
      )}

      <div className="my-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          icon={<FaPencilAlt />}
          onClick={() => onEdit(item)}
          disabled={mutationBusy}
        >
          {item.limit ? 'Editar limite' : 'Definir limite'}
        </Button>
        <Button
          as="a"
          href={`/transacoes?categoryId=${encodeURIComponent(item.category.id)}`}
          size="sm"
          variant="secondary"
        >
          Ver transações
        </Button>
      </div>

      <h3 className="text-sm font-bold text-[var(--foreground)]">Últimas transações</h3>
      {recentLoading ? (
        <p className="mt-2 text-xs text-[var(--text-muted)]" role="status">Carregando…</p>
      ) : recentTransactions.length === 0 ? (
        <p className="mt-2 text-xs text-[var(--text-muted)]">Nenhuma transação concluída no recorte.</p>
      ) : (
        <div className="mt-2 divide-y divide-[var(--border)]">
          {recentTransactions.slice(0, 3).map((transaction) => (
            <Link
              key={transaction.id}
              href={`/transacoes/show/${transaction.id}`}
              className="flex items-center justify-between gap-3 py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--foreground)]">{transaction.description || 'Sem descrição'}</p>
                <small className="text-xs text-[var(--text-muted)]">
                  {String(transaction.day).padStart(2, '0')}/{String(transaction.month).padStart(2, '0')}
                </small>
              </div>
              <strong className="shrink-0 text-sm text-[var(--expense)]">
                {showValues ? `-${formatCurrency(transaction.amount, transaction.account.currency)}` : '••••'}
              </strong>
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}

function ExploreCategories({
  activeFilter,
  expenses,
  income,
  count,
  currency,
  showValues,
  selectedCategoryId,
  onSelectExpense,
}: {
  activeFilter: LimitFilter;
  expenses: CategoryMonthlyLimitItem[];
  income: CategoryModel[];
  count: number;
  currency: SupportedCurrency;
  showValues: boolean;
  selectedCategoryId: string | null;
  onSelectExpense: (categoryId: string) => void;
}) {
  return (
    <article className="mt-4 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-[18px]" aria-labelledby="explore-categories-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="explore-categories-title" className="text-base font-bold text-[var(--foreground)]">Explorar categorias</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Lista completa para organização e gestão.</p>
        </div>
        <span className="text-xs text-[var(--text-muted)]">{count} categorias</span>
      </div>

      {count === 0 ? (
        <p className="py-5 text-sm text-[var(--text-muted)]">Nenhuma categoria nesta visão.</p>
      ) : (
        <div className="mt-3 grid gap-2">
          {expenses.map((item) => {
            const selected = item.category.id === selectedCategoryId;
            const state = categoryState(item);
            return (
              <button
                key={item.category.id}
                type="button"
                onClick={() => onSelectExpense(item.category.id)}
                aria-pressed={selected}
                className={`grid min-h-[58px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] min-[981px]:grid-cols-[1.2fr_.5fr_.6fr_.6fr_auto] ${selected ? 'border-[var(--orbit-primary)] bg-[var(--primary-subtle)]' : 'border-[var(--border)] bg-[var(--surface-raised)]'}`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-white" style={{ backgroundColor: item.category.color || '#64748B' }} aria-hidden="true">
                    <IconRenderer iconName={item.category.icon || 'tag'} size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--foreground)]">{item.category.name}</p>
                    <small className="text-xs text-[var(--text-muted)]">Despesa</small>
                  </div>
                </div>
                <div className="hidden min-[981px]:block">
                  <small className="text-[10px] text-[var(--text-muted)]">Uso</small>
                  <p className={`text-sm font-bold ${stateTextClass(state)}`}>{item.limit ? `${item.percentage ?? 0}%` : '—'}</p>
                </div>
                <div className="hidden min-[981px]:block">
                  <small className="text-[10px] text-[var(--text-muted)]">Realizado</small>
                  <p className="text-sm font-semibold text-[var(--foreground)]">{displayMoney(item.realized, showValues, currency)}</p>
                </div>
                <div className="hidden min-[981px]:block">
                  <small className="text-[10px] text-[var(--text-muted)]">Restante</small>
                  <p className={`text-sm font-semibold ${(item.remaining ?? 0) < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}>{displayMoney(item.remaining, showValues, currency)}</p>
                </div>
                <span className="justify-self-end rounded-[9px] border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground)]">Abrir</span>
              </button>
            );
          })}

          {income.map((category) => (
            <div
              key={category.id}
              className="grid min-h-[58px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 min-[981px]:grid-cols-[1.2fr_.5fr_.6fr_.6fr_auto]"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-white" style={{ backgroundColor: category.color || '#64748B' }} aria-hidden="true">
                  <IconRenderer iconName={category.icon || 'tag'} size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--foreground)]">{category.name}</p>
                  <small className="text-xs text-[var(--income)]">Receita</small>
                </div>
              </div>
              <div className="hidden text-sm text-[var(--text-muted)] min-[981px]:block">—</div>
              <div className="hidden text-xs text-[var(--text-muted)] min-[981px]:block">Fora do orçamento de despesas</div>
              <div className="hidden text-xs text-[var(--text-muted)] min-[981px]:block">Sem limite mensal</div>
              <div className="flex flex-wrap justify-end gap-1.5">
                <Link href={`/transacoes?categoryId=${encodeURIComponent(category.id)}`} className="rounded-[9px] border border-[var(--border)] px-2.5 py-2 text-xs font-semibold text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">Transações</Link>
                <Link href={`/categorias/alterar/${category.id}`} className="rounded-[9px] border border-[var(--border)] px-2.5 py-2 text-xs font-semibold text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">Editar</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeFilter === 'income' && (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Receitas ficam acessíveis aqui, mas não entram em orçamento, realizado, restante ou mapa de gastos.
        </p>
      )}
    </article>
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
    { key: 'income', label: 'Receitas' },
    { key: 'no-limit', label: 'Sem limite' },
  ];

  return (
    <div className="flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filtrar categorias">
      {filters.map((filter) => {
        const active = filter.key === activeFilter;
        return (
          <button
            key={filter.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(filter.key)}
            className={`min-h-10 shrink-0 rounded-[10px] border px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
              active
                ? 'border-[var(--orbit-primary)] bg-[var(--primary-subtle)] text-[var(--orbit-primary)]'
                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--foreground)]'
            }`}
          >
            {filter.label} · {counts[filter.key]}
          </button>
        );
      })}
    </div>
  );
}

function ContextMetric({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-2.5">
      <dt className="text-[10px] text-[var(--text-muted)]">{label}</dt>
      <dd className={`mt-1 break-words text-sm font-bold text-[var(--foreground)] ${className}`}>{value}</dd>
    </div>
  );
}

function LimitEditorModal({
  item,
  currency,
  value,
  fieldError,
  saving,
  onValueChange,
  onClose,
  onSubmit,
}: {
  item: CategoryMonthlyLimitItem;
  currency: SupportedCurrency;
  value: string;
  fieldError: string;
  saving: boolean;
  onValueChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--overlay)] p-4" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="limit-editor-title" className="w-full max-w-[520px] rounded-[18px] border border-[var(--border-strong)] bg-[var(--background)] p-5 shadow-[var(--shadow-surface)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="limit-editor-title" className="text-xl font-bold text-[var(--foreground)]">
              {item.limit ? 'Editar limite' : 'Definir limite'} — {item.category.name}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Moeda do recorte: {currency}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar editor de limite" className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">
            <FaTimes aria-hidden="true" />
          </button>
        </div>

        <form className="mt-4" onSubmit={onSubmit}>
          <Input
            label={`Valor do limite em ${currency}`}
            inputMode="decimal"
            placeholder="Ex.: 800,00"
            value={value}
            onChange={(event) => onValueChange(event.currentTarget.value)}
            error={fieldError}
            autoFocus
          />
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" icon={<FaCheck />} isLoading={saving} loadingText="Salvando">Salvar limite</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
