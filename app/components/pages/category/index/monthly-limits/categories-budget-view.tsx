'use client';

import Link from 'next/link';

import { ListPageHeader } from '@/app/components/base-pages';
import {
  budgetPace,
  buildAttentionRows,
  countBudgetStates,
  filterBudgetRows,
  monthElapsedFraction,
  type BudgetFilter,
} from '@/app/components/pages/category/index/monthly-limits/categories-budget-model';
import {
  buildDistribution,
  categoryState,
  categoryUsageLabel,
  categoryUsagePercentage,
  displayMoney,
  stateBarClass,
  stateTextClass,
} from '@/app/components/pages/category/index/monthly-limits/monthly-limits-helpers';
import { ActionsMenu, Button, Chip, CurrencySelect, IconRenderer, Input, PeriodSwitcher } from '@/app/components/ui';
import { DEFAULT_CATEGORY_COLOR } from '@/app/lib/categories/default-color';
import type { CategoryModel } from '@/app/types/category';
import type { CategoryMonthlyLimitItem, CategoryMonthlyLimitListResponse } from '@/app/types/category-monthly-limit';
import type { SupportedCurrency } from '@/app/types/financial-summary';

const paceText: Record<string, { text: string; className: string }> = {
  OVER: { text: 'O gasto já passou do orçamento do mês.', className: 'text-[var(--expense)]' },
  AHEAD: { text: 'Gastando mais rápido do que o mês permite.', className: 'text-[var(--warning)]' },
  ON_TRACK: { text: 'No ritmo do orçamento.', className: 'text-[var(--income)]' },
  FINISHED: { text: 'Mês encerrado.', className: 'text-[var(--text-muted)]' },
  NOT_STARTED: { text: 'Este mês ainda não começou.', className: 'text-[var(--text-muted)]' },
  NO_BUDGET: { text: 'Defina limites nas categorias para acompanhar o orçamento.', className: 'text-[var(--text-muted)]' },
};

function BudgetRow({ item, currency, showValues, disabled, onEditLimit }: {
  item: CategoryMonthlyLimitItem;
  currency: SupportedCurrency;
  showValues: boolean;
  disabled: boolean;
  onEditLimit: (item: CategoryMonthlyLimitItem) => void;
}) {
  const state = categoryState(item);
  const percent = Math.min(100, categoryUsagePercentage(item));
  const money = (value: number | null) => displayMoney(value, showValues, currency);
  const detail = !item.limit
    ? 'Sem limite definido'
    : item.isOverBudget
      ? `Passou ${money(item.consumption - item.limit.amount)}`
      : `Faltam ${money(item.limit.amount - item.consumption)}`;

  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-t border-[var(--border)] px-4 py-3 sm:grid-cols-[auto_minmax(0,1.1fr)_minmax(0,1fr)_auto] sm:px-5">
      <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-md)] text-white" style={{ backgroundColor: item.category.color || DEFAULT_CATEGORY_COLOR }} aria-hidden="true">
        <IconRenderer iconName={item.category.icon || 'tag'} size={16} />
      </span>
      <div className="min-w-0">
        <Link href={`/categorias/show/${encodeURIComponent(item.category.id)}`} className="flex min-h-11 items-center text-sm font-semibold text-[var(--foreground)] hover:underline">
          <span className="truncate">{item.category.name}</span>
        </Link>
        <p className={`truncate text-xs ${stateTextClass(state)}`}>
          {!item.category.isActive && <span className="mr-2 font-semibold text-[var(--text-muted)]">Inativa</span>}
          {item.limit && <span className="mr-2 font-semibold">{categoryUsageLabel(item)}</span>}
          {detail}
        </p>
      </div>
      <div className="col-span-3 order-last sm:order-none sm:col-span-1">
        {item.limit ? (
          <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]" role="img" aria-label={`${Math.round(percent)}% do limite de ${item.category.name} consumido`}>
            <div className={`h-full rounded-full ${stateBarClass(state)}`} style={{ width: `${percent}%` }} />
          </div>
        ) : (
          <span className="text-xs text-[var(--text-muted)] sm:block">—</span>
        )}
      </div>
      <div className="text-right">
        <p className="money text-sm font-semibold">{money(item.realized)}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => onEditLimit(item)}
          aria-label={`${item.limit ? 'Editar' : 'Definir'} limite de ${item.category.name}`}
          className="px-1 text-xs"
        >
          {item.limit ? <>de <span className="money ml-1">{money(item.limit.amount)}</span></> : 'Definir limite'}
        </Button>
      </div>
    </li>
  );
}

/** Soma meses a um período `YYYY-MM`. */
function shiftMonth(period: string, offset: number) {
  const date = new Date(Number(period.slice(0, 4)), Number(period.slice(5, 7)) - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function CategoriesBudgetView({
  items,
  summary,
  incomeCategories,
  loading,
  categoriesLoading,
  error,
  periodValue,
  currency,
  controlsDisabled,
  copying,
  search,
  filter,
  showValues,
  onFilterChange,
  onSearchChange,
  onPeriodChange,
  onCurrencyChange,
  onCopyPreviousMonth,
  onEditLimit,
}: {
  items: CategoryMonthlyLimitItem[];
  summary: CategoryMonthlyLimitListResponse['summary'];
  incomeCategories: CategoryModel[];
  loading: boolean;
  categoriesLoading: boolean;
  error: string;
  periodValue: string;
  currency: SupportedCurrency;
  controlsDisabled: boolean;
  copying: boolean;
  search: string;
  filter: BudgetFilter;
  showValues: boolean;
  onFilterChange: (filter: BudgetFilter) => void;
  onSearchChange: (search: string) => void;
  onPeriodChange: (value: string) => void;
  onCurrencyChange: (currency: SupportedCurrency) => void;
  onCopyPreviousMonth: () => void;
  onEditLimit: (item: CategoryMonthlyLimitItem) => void;
}) {
  const money = (value: number | null) => displayMoney(value, showValues, currency);
  const today = new Date();
  const elapsed = monthElapsedFraction(periodValue, { year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() });
  const consumed = summary.realized + summary.committed;
  const pace = budgetPace({ budget: summary.budget, consumed, elapsed });
  const usedPercent = summary.budget > 0 ? Math.round((consumed / summary.budget) * 100) : 0;
  const counts = countBudgetStates(items);
  const attention = buildAttentionRows(items);
  const rows = filterBudgetRows(items, { filter, query: search });
  const distribution = buildDistribution(items);
  const query = search.trim().toLocaleLowerCase('pt-BR');
  const incomeRows = incomeCategories
    .filter((category) => !query || category.name.toLocaleLowerCase('pt-BR').includes(query))
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
  const filters: Array<{ key: BudgetFilter; label: string }> = [
    { key: 'all', label: 'Todas' },
    { key: 'attention', label: attention.length > 0 ? `Atenção · ${counts.over + counts.near}` : 'Atenção' },
    { key: 'no-limit', label: counts.noLimit > 0 ? `Sem limite · ${counts.noLimit}` : 'Sem limite' },
    { key: 'inactive', label: 'Inativas' },
  ];
  const pill = paceText[pace];

  return (
    <section aria-labelledby="categories-title" className="grid gap-4">
      <ListPageHeader
        title="Categorias"
        createHref="/categorias/nova"
        createLabel="Nova categoria"
        controls={
          <div className="flex flex-wrap items-center gap-2">
            <CurrencySelect value={currency} onChange={onCurrencyChange} disabled={controlsDisabled} />
            <PeriodSwitcher
              month={Number(periodValue.slice(5, 7))}
              year={Number(periodValue.slice(0, 4))}
              onPrevious={() => onPeriodChange(shiftMonth(periodValue, -1))}
              onNext={() => onPeriodChange(shiftMonth(periodValue, 1))}
              disabled={controlsDisabled}
            />
            <ActionsMenu
              items={[
                {
                  label: copying ? 'Copiando limites...' : 'Copiar limites do mês anterior',
                  onSelect: onCopyPreviousMonth,
                  disabled: controlsDisabled,
                },
              ]}
            />
          </div>
        }
      />

      {error && (
        <p role="alert" className="rounded-[var(--radius-md)] border border-[var(--expense)]/35 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]">{error}</p>
      )}

      <section aria-label="Orçamento do mês" className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-5">
        {loading ? (
          <div className="h-32 animate-pulse rounded-xl bg-[var(--skeleton)]" role="status" aria-label="Carregando orçamento" />
        ) : (
          <>
            <div>
              <p className="text-sm font-semibold text-[var(--text-muted)]">Orçamento do mês</p>
              <strong className="money mt-1 block break-words text-4xl font-semibold leading-none tracking-[-0.035em] sm:text-5xl">
                {money(summary.realized)}
                {summary.budget > 0 && <span className="ml-2 text-base font-medium tracking-normal text-[var(--text-muted)] sm:text-xl">de {money(summary.budget)}</span>}
              </strong>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {summary.budget > 0 && (
                  <>
                    Você usou <strong className="text-[var(--foreground)]">{usedPercent}%</strong> do orçamento
                    {elapsed !== null && elapsed > 0 && elapsed < 1 ? <>, com <strong className="text-[var(--foreground)]">{Math.round(elapsed * 100)}%</strong> do mês. </> : '. '}
                  </>
                )}
                <span className={`font-semibold ${pill.className}`}>{pill.text}</span>
              </p>
            </div>

            {summary.budget > 0 && (
              <div className="relative h-3 overflow-hidden rounded-full bg-[var(--surface-subtle)]" role="img" aria-label={`${usedPercent}% do orçamento consumido`}>
                <div className={`h-full rounded-full ${pace === 'OVER' ? 'bg-[var(--expense)]' : pace === 'AHEAD' ? 'bg-[var(--warning)]' : 'bg-[var(--primary)]'}`} style={{ width: `${Math.min(100, usedPercent)}%` }} />
                {elapsed !== null && elapsed > 0 && elapsed < 1 && (
                  <span className="absolute inset-y-0 w-0.5 bg-[var(--foreground)] opacity-60" style={{ left: `${Math.round(elapsed * 100)}%` }} aria-hidden="true" />
                )}
              </div>
            )}

            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Dentro do limite', value: counts.ok, tone: 'text-[var(--income)]' },
                { label: 'Perto do limite', value: counts.near, tone: 'text-[var(--warning)]' },
                { label: 'Estourou', value: counts.over, tone: 'text-[var(--expense)]' },
                { label: 'Sem limite', value: counts.noLimit, tone: '' },
              ].map((entry) => (
                <div key={entry.label} className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2">
                  <dt className="text-xs text-[var(--text-muted)] sm:text-sm">{entry.label}</dt>
                  <dd className={`money text-lg font-semibold ${entry.tone}`}>{entry.value}</dd>
                </div>
              ))}
            </dl>

            {(summary.realizedIncome > 0 || summary.expectedIncome > 0) && (
              <p className="text-sm text-[var(--text-muted)]">
                Receitas do mês: <span className="money font-semibold text-[var(--foreground)]">{money(summary.realizedIncome)}</span> recebidas
                {summary.expectedIncome > 0 && <> e <span className="money font-semibold text-[var(--foreground)]">{money(summary.expectedIncome)}</span> previstas</>}.
              </p>
            )}
          </>
        )}
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]" aria-labelledby="categories-expenses-title">
          <div className="grid gap-3 px-4 pb-3 pt-4 sm:px-5">
            <h2 id="categories-expenses-title" className="text-base font-bold">Despesas por categoria</h2>
            <Input
              id="categories-search"
              value={search}
              onChange={(event) => onSearchChange(event.currentTarget.value)}
              placeholder="Buscar categorias..."
              aria-label="Buscar categorias"
              disabled={categoriesLoading && !search}
            />
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtro de categorias">
              {filters.map((entry) => (
                <Chip key={entry.key} selected={filter === entry.key} onClick={() => onFilterChange(entry.key)}>{entry.label}</Chip>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="border-t border-[var(--border)] px-5 py-6 text-sm text-[var(--text-muted)]" role="status">Carregando limites…</p>
          ) : items.length === 0 ? (
            <div className="border-t border-[var(--border)] px-5 py-6">
              <p className="font-semibold">Nenhuma categoria de despesa</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Crie uma categoria de despesa para começar a definir limites mensais.</p>
            </div>
          ) : rows.length === 0 ? (
            <p className="border-t border-[var(--border)] px-5 py-6 text-sm text-[var(--text-muted)]">Nenhuma categoria neste filtro.</p>
          ) : (
            <ul>
              {rows.map((item) => (
                <BudgetRow key={item.category.id} item={item} currency={currency} showValues={showValues} disabled={controlsDisabled} onEditLimit={onEditLimit} />
              ))}
            </ul>
          )}
        </section>

        <div className="grid gap-4">
          <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] pb-4" aria-labelledby="categories-attention-title">
            <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-5">
              <h2 id="categories-attention-title" className="text-base font-bold">Precisa de atenção</h2>
              {attention.length > 0 && <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--text-muted)]">{attention.length}</span>}
            </div>
            {attention.length === 0 ? (
              <p className="px-4 text-sm text-[var(--text-muted)] sm:px-5">Nenhuma categoria estourou ou está perto do limite.</p>
            ) : (
              <ul className="grid gap-2 px-4 sm:px-5">
                {attention.map((item) => (
                  <li key={item.category.id}>
                    <Link
                      href={`/categorias/show/${encodeURIComponent(item.category.id)}`}
                      className="flex min-h-14 items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
                    >
                      <span className="min-w-0">
                        <strong className="block truncate text-sm">{item.category.name}</strong>
                        <span className={`block truncate text-xs ${stateTextClass(categoryState(item))}`}>
                          {item.isOverBudget ? 'Estourou' : 'Perto do limite'} · <span className="money">{money(item.realized)}</span> de <span className="money">{money(item.limit?.amount ?? null)}</span>
                        </span>
                      </span>
                      <span className="money shrink-0 text-sm font-semibold">{categoryUsageLabel(item)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] pb-4" aria-labelledby="categories-distribution-title">
            <h2 id="categories-distribution-title" className="px-4 pb-3 pt-4 text-base font-bold sm:px-5">Para onde foi o dinheiro</h2>
            {distribution.entries.length === 0 ? (
              <p className="px-4 text-sm text-[var(--text-muted)] sm:px-5">Nenhum gasto neste mês.</p>
            ) : (
              <>
                <div className="mx-4 flex h-3 gap-0.5 overflow-hidden rounded-full sm:mx-5" role="img" aria-label="Distribuição dos gastos por categoria">
                  {distribution.entries.map((entry) => (
                    <span key={entry.id} className="block min-w-[4px]" style={{ flex: entry.amount, backgroundColor: entry.color }} />
                  ))}
                </div>
                <ul className="mt-3 grid gap-1.5 px-4 text-sm sm:px-5">
                  {distribution.entries.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 text-[var(--text-muted)]">
                        <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: entry.color }} aria-hidden="true" />
                        <span className="truncate">{entry.name}</span>
                      </span>
                      <span className="money text-sm font-medium">{entry.percentage.toLocaleString('pt-BR')}%</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] pb-3" aria-labelledby="categories-income-title">
            <h2 id="categories-income-title" className="px-4 pb-2 pt-4 text-base font-bold sm:px-5">Receitas</h2>
            {incomeRows.length === 0 ? (
              <p className="px-4 pb-1 text-sm text-[var(--text-muted)] sm:px-5">Nenhuma categoria de receita{query ? ' neste filtro' : ''}.</p>
            ) : (
              <ul>
                {incomeRows.map((category) => (
                  <li key={category.id}>
                    <Link
                      href={`/categorias/show/${encodeURIComponent(category.id)}`}
                      className="flex min-h-11 items-center gap-3 px-4 py-1.5 text-sm font-semibold transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:px-5"
                    >
                      <span className="grid h-8 w-8 place-items-center rounded-[var(--radius-md)] text-white" style={{ backgroundColor: category.color || DEFAULT_CATEGORY_COLOR }} aria-hidden="true">
                        <IconRenderer iconName={category.icon || 'tag'} size={14} />
                      </span>
                      <span className="truncate">{category.name}</span>
                      {!category.isActive && <span className="ml-auto text-xs font-normal text-[var(--text-muted)]">Inativa</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
