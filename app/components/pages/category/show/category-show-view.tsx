'use client';

import { MonthBarsChart } from '@/app/components/charts/month-bars-chart';
import { format } from 'date-fns';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';

import { appBarTitleClassName } from '@/app/components/base-pages/page-title';
import {
  buildHistoryBars,
  describeMonth,
  limitPercent,
  limitState,
  longMonthLabel,
} from '@/app/components/pages/category/show/category-show-model';
import { Button, IconLink, IconRenderer, ShowBelow } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { DEFAULT_CATEGORY_COLOR } from '@/app/lib/categories/default-color';
import { typeConfig } from '@/app/lib/constants/category.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { CategoryModel } from '@/app/types/category';

const meterTone = { NO_LIMIT: 'bg-[var(--orbit-primary)]', OK: 'bg-[var(--orbit-primary)]', NEAR: 'bg-[var(--warning)]', OVER: 'bg-[var(--expense)]' } as const;
const statePill = {
  NO_LIMIT: null,
  OK: { label: 'Dentro do limite', className: 'bg-[var(--surface-subtle)] text-[var(--income)]' },
  NEAR: { label: 'Perto do limite', className: 'bg-[var(--warning-subtle)] text-[var(--warning)]' },
  OVER: { label: 'Estourou', className: 'bg-[var(--danger-subtle)] text-[var(--expense)]' },
} as const;

export default function CategoryShowView({
  category,
  backUrl,
  editUrl,
  isDeleting,
  onDeleteRequest,
}: {
  category: CategoryModel;
  backUrl: string;
  editUrl: string;
  isDeleting: boolean;
  onDeleteRequest: () => void;
}) {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const activity = category.activity ?? null;
  const currency = activity?.currency ?? 'BRL';
  const money = (cents: number, code: string = currency) => (showValues ? formatCurrency(cents, code) : '••••');
  const color = category.color || DEFAULT_CATEGORY_COLOR;
  const type = typeConfig[category.type];
  const isExpense = category.type === 'EXPENSE';
  const today = new Date();
  const todayLogical = { year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() };

  const state = activity ? limitState(activity.month) : 'NO_LIMIT';
  const percent = activity ? limitPercent(activity.month) : null;
  const pill = statePill[state];
  const sentences = activity
    ? describeMonth({ month: activity.month, previousAverage: activity.previousAverage, today: todayLogical, type: category.type, money })
    : [];
  const history = activity ? buildHistoryBars(activity.history, isExpense ? activity.month.limit : null) : null;
  const filterHref = `/transacoes?categoryId=${encodeURIComponent(category.id)}`;

  return (
    <div className={`w-full space-y-4 pb-5 transition-opacity duration-150 ${isDeleting ? 'pointer-events-none opacity-50' : ''}`}>
      <ShowBelow breakpoint="lg">
        <header className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2">
          <IconLink label="Voltar para categorias" href={backUrl} icon={<FaArrowLeft />} className="rounded-full text-lg text-[var(--foreground)]" />
          <h1 className={`text-center ${appBarTitleClassName}`}>{category.name}</h1>
          <Button as="a" href={editUrl} variant="outline" size="xs">Editar categoria</Button>
        </header>
      </ShowBelow>

      <section
        aria-label="Resumo da categoria"
        className="grid gap-5 rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--category-color)_38%,var(--border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--category-color)_14%,var(--surface)),var(--surface)_70%)] p-4 shadow-[var(--shadow-surface)] sm:p-5"
        style={{ ['--category-color' as string]: color }}
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5">
          <span className="grid h-12 w-12 place-items-center rounded-[var(--radius-lg)] text-white" style={{ backgroundColor: color }} aria-hidden="true">
            <IconRenderer iconName={category.icon || 'tag'} size={22} />
          </span>
          <div className="min-w-0">
            <h2 className="break-words text-xl font-bold tracking-tight">{category.name}</h2>
            <p className="text-sm text-[var(--text-muted)]">
              <span className={`font-semibold ${type.color}`}>{type.label}</span>
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${category.isActive ? 'bg-[var(--surface-subtle)] text-[var(--income)]' : 'bg-[var(--surface-subtle)] text-[var(--text-muted)]'}`}>
                {category.isActive ? 'Ativa' : 'Inativa'}
              </span>
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{category.description || 'Sem descrição cadastrada.'}</p>
          </div>
          {pill && <span className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline ${pill.className}`}>{pill.label}</span>}
        </div>

        {activity ? (
          <div className="grid gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-muted)]">
                {isExpense ? 'Gasto' : 'Recebido'} em {longMonthLabel(activity.month.month)}
              </p>
              <strong className="money mt-1 block break-words text-4xl font-semibold leading-none tracking-[-0.035em] sm:text-5xl">
                {money(activity.month.realized)}
                {isExpense && activity.month.limit !== null && (
                  <span className="ml-2 text-base font-medium tracking-normal text-[var(--text-muted)] sm:text-xl">de {money(activity.month.limit)}</span>
                )}
              </strong>
              {isExpense && pill && <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold sm:hidden ${pill.className}`}>{pill.label}</span>}
            </div>

            {isExpense && activity.month.limit !== null && (
              <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]" role="img" aria-label={`${Math.min(percent ?? 0, 100)}% do limite consumido`}>
                <div className={`h-full rounded-full ${meterTone[state]}`} style={{ width: `${Math.min(percent ?? 0, 100)}%` }} />
              </div>
            )}

            {isExpense && activity.month.committed > 0 && (
              <p className="text-sm text-[var(--text-muted)]">
                Mais <span className="money font-semibold text-[var(--foreground)]">{money(activity.month.committed)}</span> pendentes neste mês.
              </p>
            )}
            {sentences.length > 0 && <p className="text-sm text-[var(--text-muted)]">{sentences.join(' · ')}.</p>}
            {isExpense && activity.month.limit === null && (
              <p className="text-sm text-[var(--text-muted)]">Sem limite definido para este mês.</p>
            )}
            {activity.otherCurrencies.length > 0 && (
              <p className="text-xs text-[var(--text-muted)]">
                Há movimentações em {activity.otherCurrencies.join(', ')}; os valores acima são em {activity.currency}.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">Os números do mês não estão disponíveis agora.</p>
        )}

        <nav aria-label="Ações da categoria" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Button as="a" href="/transacoes/nova" size="xs" className="w-full">Nova transação</Button>
          {isExpense && (
            <Button as="a" href="/categorias" variant="outline" size="xs" className="w-full">Ajustar limite</Button>
          )}
          <Button as="a" href={filterHref} variant="outline" size="xs" className="w-full">Ver transações</Button>
        </nav>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {history && activity && (
            <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] pb-4" aria-labelledby="category-history-heading">
              <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pb-2 pt-4 sm:px-5">
                <h2 id="category-history-heading" className="text-base font-bold">Últimos 6 meses</h2>
                <p className="text-xs text-[var(--text-muted)]">{isExpense ? 'gasto por mês' : 'recebido por mês'}{history.limitPercentOfScale !== null ? ', com o limite de hoje' : ''}</p>
              </div>
              <div className="mx-4 sm:mx-5">
                <MonthBarsChart
                  ariaLabel={`${isExpense ? 'Gasto' : 'Recebido'} por mês nos últimos 6 meses`}
                  accentColor={color}
                  heightClass="h-28"
                  bars={history.bars.map((bar) => ({ key: bar.key, label: bar.label, valueLabel: money(bar.realized), heightPercent: bar.heightPercent, current: bar.current }))}
                  overlay={
                    history.limitPercentOfScale !== null && activity.month.limit !== null ? (
                      <div className="pointer-events-none absolute inset-x-0 border-t-[1.5px] border-dashed border-[var(--warning)]" style={{ bottom: `${history.limitPercentOfScale}%` }}>
                        <span className="money absolute -top-5 right-0 text-xs text-[var(--warning)]">{money(activity.month.limit)}</span>
                      </div>
                    ) : null
                  }
                />
              </div>
              <p className="px-4 pt-3 text-sm text-[var(--text-muted)] sm:px-5">
                Média dos 5 meses anteriores: <span className="money font-semibold text-[var(--foreground)]">{money(activity.previousAverage)}</span>.
              </p>
            </section>
          )}

          <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]" aria-labelledby="category-movements-heading">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2 pt-4 sm:px-5">
              <h2 id="category-movements-heading" className="text-base font-bold">
                Movimentações de {activity ? longMonthLabel(activity.month.month) : 'este mês'}
              </h2>
              <Link href={filterHref} className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--orbit-primary)]">Ver todas</Link>
            </div>
            {!activity || activity.recent.length === 0 ? (
              <p className="border-t border-[var(--border)] px-4 py-6 text-sm text-[var(--text-muted)] sm:px-5">Nenhuma movimentação nesta categoria neste mês.</p>
            ) : (
              <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
                {activity.recent.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/transacoes/show/${item.id}`}
                      aria-label={`Abrir transação ${item.description || 'sem descrição'}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:px-5"
                    >
                      <span className="min-w-0">
                        <span className="block break-words text-sm font-semibold">
                          {item.description || 'Sem descrição'}
                          {item.status === 'PENDING' && <span className="ml-2 align-middle text-xs font-semibold text-[var(--pending)]">pendente</span>}
                        </span>
                        <span className="block truncate text-xs text-[var(--text-muted)]">
                          {String(item.day).padStart(2, '0')}/{String(item.month).padStart(2, '0')} · {item.account.name}
                        </span>
                      </span>
                      <span className={`money text-sm font-semibold ${item.type === 'INCOME' ? 'text-[var(--income)]' : 'text-[var(--foreground)]'}`}>
                        {item.type === 'INCOME' ? '+ ' : '− '}
                        {money(item.amount, item.account.currency)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]" aria-labelledby="category-about-heading">
          <h2 id="category-about-heading" className="px-4 pb-2 pt-4 text-base font-bold sm:px-5">Sobre a categoria</h2>
          <dl className="grid gap-2 px-4 pb-4 text-sm sm:px-5">
            <div className="flex justify-between gap-3"><dt className="text-[var(--text-muted)]">Tipo</dt><dd>{type.label}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[var(--text-muted)]">Transações</dt><dd className="money">{category.transactionsCount}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[var(--text-muted)]">Criada em</dt><dd>{format(new Date(category.createdAt), 'dd/MM/yyyy')}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[var(--text-muted)]">Atualizada em</dt><dd>{format(new Date(category.updatedAt), 'dd/MM/yyyy')}</dd></div>
          </dl>
          <p className="px-4 pb-4 text-sm leading-relaxed text-[var(--text-muted)] sm:px-5">
            O tipo define se a categoria conta como receita ou despesa nas transações. Cor e ícone só ajudam a reconhecê-la.
          </p>
          <details className="group border-t border-[var(--border)]">
            <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm text-[var(--text-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:px-5 [&::-webkit-details-marker]:hidden">
              Zona de risco
            </summary>
            <div className="grid gap-3 px-4 pb-4 text-sm text-[var(--text-muted)] sm:px-5">
              <p>Categorias com transações, limites, regras de importação ou modelos não podem ser excluídas. Inativar guarda o histórico.</p>
              <div className="flex flex-wrap gap-2">
                <Button as="a" href={editUrl} variant="outline" size="sm">Inativar categoria</Button>
                <Button type="button" variant="danger" size="sm" onClick={onDeleteRequest}>Excluir categoria</Button>
              </div>
            </div>
          </details>
        </section>
      </div>
    </div>
  );
}
