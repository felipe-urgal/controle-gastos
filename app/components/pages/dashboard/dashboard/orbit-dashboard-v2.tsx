'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaExclamationTriangle,
  FaTimes,
  FaWallet,
} from 'react-icons/fa';

import { ProtectedRoute } from '@/app/components/layout';
import { IconRenderer, Select } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { useMonthlyDashboard } from '@/app/hooks/dashboard/use-monthly-dashboard';
import { currencyOptions } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { forecastService } from '@/app/services/forecast-service';
import type { MonthlyDashboard } from '@/app/types/dashboard';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { ForecastData, ForecastItem } from '@/app/types/forecast';

type DashboardView = 'summary' | 'spending' | 'limits' | 'accounts';

type OrbitNode = {
  key: string;
  label: string;
  value: string;
  detail: string;
  href?: string;
  glyph: string;
  tone: 'primary' | 'income' | 'expense' | 'warning' | 'neutral';
};

const views: Array<{ key: DashboardView; label: string }> = [
  { key: 'summary', label: 'Resumo' },
  { key: 'spending', label: 'Gastos' },
  { key: 'limits', label: 'Limites' },
  { key: 'accounts', label: 'Contas' },
];

const nodePositions = [
  'left-[14%] top-[10%]',
  'right-[8%] top-[18%]',
  'right-[12%] bottom-[14%]',
  'left-[22%] bottom-[7%]',
  'left-[-1%] top-[46%]',
];

function displayMoney(amount: number, showValues: boolean, currency: string) {
  return showValues ? formatCurrency(amount, currency) : '••••';
}

function signedMoney(amount: number, showValues: boolean, currency: string) {
  if (!showValues) return '••••';
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
  return `${sign}${formatCurrency(Math.abs(amount), currency)}`;
}

function periodOffset(periodValue: string, offset: number) {
  const [year, month] = periodValue.split('-').map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(periodValue: string) {
  const [year, month] = periodValue.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
}

function logicalDateLabel(item: { year: number; month: number; day: number }) {
  return new Date(item.year, item.month - 1, item.day)
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    .replace('.', '');
}

function useForecast(currency: SupportedCurrency) {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await forecastService.get(currency, 30);
        if (active) setData(response.data);
      } catch (caught) {
        if (active) {
          setData(null);
          setError(caught instanceof Error ? caught.message : 'Não foi possível carregar a projeção.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [currency]);

  return { data, loading, error };
}

export default function OrbitDashboardV2() {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const {
    data,
    loading,
    error,
    periodValue,
    currency,
    setPeriodValue,
    setCurrency,
  } = useMonthlyDashboard();
  const forecast = useForecast(currency);
  const [activeView, setActiveView] = useState<DashboardView>('summary');

  return (
    <ProtectedRoute>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">VISÃO FINANCEIRA</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-[30px]">Seu dinheiro em órbita</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Saldo, destinos e compromissos como um único sistema.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setPeriodValue(periodOffset(periodValue, -1))} disabled={loading} aria-label="Mês anterior" className="grid min-h-11 min-w-11 place-items-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-50"><FaChevronLeft aria-hidden="true" /></button>
          <label className="relative min-h-11 min-w-[180px] cursor-pointer rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-center text-sm font-semibold capitalize focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus)]">
            {monthLabel(periodValue)}
            <span className="sr-only">Escolher mês do dashboard</span>
            <input type="month" value={periodValue} min="2000-01" max="2100-12" onChange={(event) => event.currentTarget.value && setPeriodValue(event.currentTarget.value)} disabled={loading} className="absolute inset-0 cursor-pointer opacity-0" />
          </label>
          <button type="button" onClick={() => setPeriodValue(periodOffset(periodValue, 1))} disabled={loading} aria-label="Próximo mês" className="grid min-h-11 min-w-11 place-items-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-50"><FaChevronRight aria-hidden="true" /></button>
          <div className="w-[145px]"><Select ariaLabel="Moeda" value={currency} options={currencyOptions} onChange={(value) => setCurrency(value as SupportedCurrency)} disabled={loading} /></div>
        </div>
      </header>

      <nav className="my-[18px] flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Visões do dashboard">
        {views.map((view) => {
          const active = activeView === view.key;
          return <button key={view.key} type="button" aria-pressed={active} onClick={() => setActiveView(view.key)} className={`min-h-10 shrink-0 rounded-[10px] border px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${active ? 'border-[var(--orbit-primary)] bg-[var(--primary-subtle)] text-[var(--orbit-primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--foreground)]'}`}>{view.label}</button>;
        })}
      </nav>

      {error && <p role="alert" className="mb-4 rounded-xl border border-[var(--expense)]/35 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]">{error}</p>}

      {loading ? <DashboardLoading /> : data ? <ViewPanel data={data} showValues={showValues} activeView={activeView} forecast={forecast} /> : null}
    </ProtectedRoute>
  );
}

function ViewPanel({ data, showValues, activeView, forecast }: { data: MonthlyDashboard; showValues: boolean; activeView: DashboardView; forecast: ReturnType<typeof useForecast> }) {
  if (activeView === 'spending') return <SpendingView data={data} showValues={showValues} />;
  if (activeView === 'limits') return <LimitsView data={data} showValues={showValues} />;
  if (activeView === 'accounts') return <AccountsView data={data} showValues={showValues} />;
  return <SummaryView data={data} showValues={showValues} forecast={forecast} />;
}

function SummaryView({ data, showValues, forecast }: { data: MonthlyDashboard; showValues: boolean; forecast: ReturnType<typeof useForecast> }) {
  const [forecastOpen, setForecastOpen] = useState(false);
  const activeAccounts = data.accounts.filter((account) => account.isActive && account.currency === data.currency);
  const availableNow = activeAccounts.reduce((sum, account) => sum + account.balance, 0);
  const primaryAccount = activeAccounts[0] ?? data.accounts.find((account) => account.currency === data.currency) ?? null;
  const topCategories = [...data.categories].sort((left, right) => right.realized - left.realized).slice(0, 2);
  const topLimit = [...data.limits].sort((left, right) => right.percentage - left.percentage)[0] ?? null;
  const nearestUpcoming = forecast.data?.upcoming[0] ?? forecast.data?.overdue[0] ?? null;
  const projectedBalance = forecast.data?.accounts.reduce((sum, account) => sum + account.projectedBalance, 0) ?? null;
  const lowestProjected = forecast.data?.accounts.reduce<number | null>((lowest, account) => lowest === null ? account.lowestProjectedBalance : Math.min(lowest, account.lowestProjectedBalance), null) ?? null;

  const daysInMonth = new Date(data.period.year, data.period.month, 0).getDate();
  const now = new Date();
  const isCurrent = now.getFullYear() === data.period.year && now.getMonth() + 1 === data.period.month;
  const isPast = data.period.year < now.getFullYear() || (data.period.year === now.getFullYear() && data.period.month < now.getMonth() + 1);
  const elapsed = isCurrent ? now.getDate() : isPast ? daysInMonth : 1;
  const spentPerDay = data.summary.expense / Math.max(1, elapsed);
  const budgetTotal = data.limits.reduce((sum, limit) => sum + limit.amount, 0);
  const idealPerDay = budgetTotal > 0 ? budgetTotal / daysInMonth : null;
  const rhythmWidth = idealPerDay ? Math.min(100, Math.round((spentPerDay / idealPerDay) * 100)) : 0;

  const nodes: OrbitNode[] = [];
  if (primaryAccount) nodes.push({ key: `account-${primaryAccount.id}`, label: primaryAccount.name, value: displayMoney(primaryAccount.balance, showValues, primaryAccount.currency), detail: `${primaryAccount.currency} · saldo atual`, href: '/contas', glyph: '▣', tone: 'primary' });
  topCategories.forEach((category) => nodes.push({ key: `category-${category.id}`, label: category.name, value: displayMoney(category.realized, showValues, data.currency), detail: `${category.sharePercentage.toLocaleString('pt-BR')}% das despesas`, href: '/categorias', glyph: '◎', tone: category.sharePercentage >= 50 ? 'warning' : 'neutral' }));
  if (nearestUpcoming) nodes.push({ key: `future-${nearestUpcoming.id}`, label: 'Próximos compromissos', value: displayMoney(nearestUpcoming.amount, showValues, data.currency), detail: `${nearestUpcoming.description} · ${logicalDateLabel(nearestUpcoming)}`, href: '/calendario', glyph: '◷', tone: 'expense' });
  if (topLimit && nodes.length < 5) nodes.push({ key: `limit-${topLimit.category.id}`, label: topLimit.category.name, value: `${topLimit.percentage.toLocaleString('pt-BR')}%`, detail: `restante ${displayMoney(topLimit.remaining, showValues, data.currency)}`, href: '/categorias', glyph: '◉', tone: topLimit.percentage >= 80 ? 'warning' : 'income' });
  if (nodes.length < 5) nodes.push({ key: 'income', label: 'Receitas', value: displayMoney(data.summary.income, showValues, data.currency), detail: 'receitas concluídas no mês', glyph: '↑', tone: 'income' });

  const [selectedKey, setSelectedKey] = useState(nodes[0]?.key ?? 'income');
  const selectedNode = nodes.find((node) => node.key === selectedKey) ?? nodes[0] ?? null;

  return (
    <>
      <section className="grid gap-[18px] min-[901px]:grid-cols-[minmax(520px,1.55fr)_minmax(300px,.8fr)]">
        <article className="relative min-h-[450px] overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:min-h-[480px] sm:p-[22px] min-[901px]:min-h-[535px]">
          <h2 className="text-base font-bold">Mapa do mês</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Clique em um ponto para explorar.</p>
          <div className="absolute left-1/2 top-[58%] h-[245px] w-[245px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--border-strong)] sm:h-[280px] sm:w-[280px] min-[901px]:top-[56%] min-[901px]:h-[340px] min-[901px]:w-[340px]">
            <span className="absolute inset-[13%] rounded-full border border-[var(--border)]" aria-hidden="true" /><span className="absolute inset-[27%] rounded-full border border-[var(--income)]/25" aria-hidden="true" />
            <div className="absolute left-1/2 top-1/2 grid h-[116px] w-[116px] -translate-x-1/2 -translate-y-1/2 place-content-center rounded-full border border-[var(--income)]/40 bg-[var(--surface-raised)] px-2 text-center sm:h-32 sm:w-32 min-[901px]:h-[148px] min-[901px]:w-[148px]"><strong className={`break-words text-lg font-bold sm:text-xl min-[901px]:text-2xl ${availableNow < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}>{displayMoney(availableNow, showValues, data.currency)}</strong><span className="mt-1 text-[10px] text-[var(--text-muted)] sm:text-[11px]">disponível agora</span></div>
            {nodes.slice(0, 5).map((node, index) => <button key={node.key} type="button" onClick={() => setSelectedKey(node.key)} aria-pressed={selectedNode?.key === node.key} aria-label={`${node.label}: ${node.value}. ${node.detail}`} className={`absolute grid h-[42px] w-[42px] place-items-center rounded-full border bg-[var(--surface-raised)] text-base font-extrabold shadow-[0_0_0_7px_rgba(255,255,255,.02)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)] min-[901px]:h-[46px] min-[901px]:w-[46px] ${toneClass(node.tone)} ${selectedNode?.key === node.key ? 'ring-2 ring-white ring-offset-3 ring-offset-[var(--surface)]' : ''} ${nodePositions[index] ?? nodePositions[0]}`}>{node.glyph}<span className="absolute top-[calc(100%+7px)] hidden w-32 text-center text-[11px] font-semibold text-[var(--foreground)] min-[901px]:block">{node.label}</span><span className="absolute top-[calc(100%+23px)] hidden w-32 text-center text-[10px] text-[var(--text-muted)] min-[901px]:block">{node.value}</span></button>)}
          </div>
          {selectedNode && <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3"><div className="flex items-end justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold">{selectedNode.label}</p><p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{selectedNode.value} · {selectedNode.detail}</p></div>{selectedNode.href && <Link href={selectedNode.href} className="shrink-0 text-xs font-semibold text-[var(--orbit-primary)]">Explorar →</Link>}</div></div>}
        </article>

        <aside className="grid gap-3.5 sm:grid-cols-2 min-[901px]:grid-cols-1">
          <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-[18px]"><p className="text-xs text-[var(--text-muted)]">SALDO PROJETADO</p>{forecast.loading ? <div className="mt-2 h-8 animate-pulse rounded bg-[var(--skeleton)]" /> : projectedBalance === null ? <strong className="mt-2 block text-2xl">—</strong> : <strong className={`mt-2 block text-[28px] font-bold ${projectedBalance < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}>{displayMoney(projectedBalance, showValues, data.currency)}</strong>}<small className="mt-1 block text-xs text-[var(--text-muted)]">após compromissos dos próximos 30 dias</small><button type="button" onClick={() => setForecastOpen(true)} disabled={!forecast.data || forecast.loading} className="mt-3 min-h-10 rounded-[10px] border border-[var(--income)]/35 bg-[var(--primary-subtle)] px-3 text-sm font-bold text-[var(--income)] disabled:opacity-50">Ver projeção</button></article>
          <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-[18px]"><p className="text-xs text-[var(--text-muted)]">RITMO DO MÊS</p><strong className="mt-2 block text-[28px] font-bold">{showValues ? `${formatCurrency(Math.round(spentPerDay), data.currency)}/dia` : '••••'}</strong><small className="mt-1 block text-xs text-[var(--text-muted)]">ideal: {idealPerDay === null ? 'sem orçamento configurado' : showValues ? `${formatCurrency(Math.round(idealPerDay), data.currency)}/dia` : '••••'}</small>{idealPerDay !== null && <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]"><span className={`block h-full rounded-full ${spentPerDay > idealPerDay ? 'bg-[var(--warning)]' : 'bg-[var(--income)]'}`} style={{ width: `${rhythmWidth}%` }} /></div>}</article>
          <article className="col-span-full rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 min-[901px]:col-span-1"><h2 className="flex items-center gap-2 text-sm font-bold"><FaExclamationTriangle className={lowestProjected !== null && lowestProjected < 0 ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'} aria-hidden="true" /> Atenção agora</h2>{forecast.error ? <p className="mt-2 text-xs text-[var(--expense)]">{forecast.error}</p> : nearestUpcoming ? <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">{nearestUpcoming.description} · {logicalDateLabel(nearestUpcoming)}{lowestProjected !== null && lowestProjected < 0 ? ` · menor saldo projetado ${displayMoney(lowestProjected, showValues, data.currency)}` : ''}</p> : <p className="mt-2 text-xs text-[var(--text-muted)]">Nenhum compromisso pendente nos próximos 30 dias.</p>}<Link href="/calendario" className="mt-3 inline-flex min-h-10 items-center rounded-[10px] border border-[var(--border)] px-3 text-sm font-semibold">Revisar cenário</Link></article>
        </aside>
      </section>

      <h2 className="mb-3 mt-[26px] text-[15px] font-bold">Fluxo do mês</h2>
      <section className="grid gap-3 min-[901px]:grid-cols-[1.2fr_1fr_1fr]"><RealizedCard data={data} showValues={showValues} /><UpcomingCard items={forecast.data?.upcoming ?? []} currency={data.currency} showValues={showValues} /><PrimaryAccountCard account={primaryAccount} showValues={showValues} /></section>
      {forecastOpen && forecast.data && <ForecastDialog data={forecast.data} showValues={showValues} onClose={() => setForecastOpen(false)} />}
    </>
  );
}

function RealizedCard({ data, showValues }: { data: MonthlyDashboard; showValues: boolean }) {
  return <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-[18px]"><h3 className="text-[15px] font-bold">Realizado</h3><p className="mt-1 text-xs text-[var(--text-muted)]">O que já entrou e saiu.</p><div className="mt-3 divide-y divide-[var(--border)]"><MetricRow label="Receitas" value={displayMoney(data.summary.income, showValues, data.currency)} tone="income" /><MetricRow label="Despesas" value={displayMoney(data.summary.expense, showValues, data.currency)} tone="expense" /><MetricRow label="Saldo" value={signedMoney(data.summary.balance, showValues, data.currency)} tone={data.summary.balance < 0 ? 'expense' : 'income'} /></div></article>;
}

function UpcomingCard({ items, currency, showValues }: { items: ForecastItem[]; currency: string; showValues: boolean }) {
  return <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-[18px]"><h3 className="text-[15px] font-bold">Próximos compromissos</h3>{items.length === 0 ? <p className="mt-3 text-sm text-[var(--text-muted)]">Nenhuma pendência no horizonte.</p> : <div className="mt-3 divide-y divide-[var(--border)]">{items.slice(0, 2).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-2.5"><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.description}</p><small className="text-xs text-[var(--text-muted)]">{logicalDateLabel(item)}</small></div><strong className={item.type === 'INCOME' ? 'text-[var(--income)]' : 'text-[var(--expense)]'}>{showValues ? `${item.type === 'INCOME' ? '+' : '-'}${formatCurrency(item.amount, currency)}` : '••••'}</strong></div>)}</div>}</article>;
}

function PrimaryAccountCard({ account, showValues }: { account: MonthlyDashboard['accounts'][number] | null; showValues: boolean }) {
  return <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-[18px]"><h3 className="text-[15px] font-bold">Conta principal</h3>{account ? <><p className="mt-1 text-xs text-[var(--text-muted)]">{account.name} · {account.currency}</p><strong className={`mt-3 block text-[30px] font-extrabold ${account.balance < 0 ? 'text-[var(--expense)]' : ''}`}>{displayMoney(account.balance, showValues, account.currency)}</strong><Link href="/contas" className="mt-3 inline-flex min-h-10 items-center rounded-[10px] border border-[var(--border)] px-3 text-sm font-semibold">Abrir conta</Link></> : <p className="mt-3 text-sm text-[var(--text-muted)]">Nenhuma conta disponível.</p>}</article>;
}

function SpendingView({ data, showValues }: { data: MonthlyDashboard; showValues: boolean }) {
  const max = Math.max(1, ...data.flow.flatMap((point) => [point.income, point.expense]));
  return <section className="grid gap-4 min-[901px]:grid-cols-[1.2fr_1fr]"><article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-[18px]"><h2 className="text-base font-bold">Despesas por categoria</h2><p className="mt-1 text-sm text-[var(--text-muted)]">{displayMoney(data.summary.expense, showValues, data.currency)} no período.</p><div className="mt-4 space-y-4">{data.categories.map((category) => <div key={category.id}><div className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold">{category.name}</span><strong>{displayMoney(category.realized, showValues, data.currency)} · {category.sharePercentage.toLocaleString('pt-BR')}%</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]"><span className="block h-full rounded-full" style={{ width: `${Math.min(100, category.sharePercentage)}%`, backgroundColor: category.color }} /></div></div>)}</div></article><article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-[18px]"><h2 className="text-base font-bold">Evolução recente</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Últimos {data.flow.length} meses.</p><div className="mt-5 space-y-3">{data.flow.map((point) => <div key={`${point.year}-${point.month}`} className="grid grid-cols-[70px_1fr] items-center gap-2"><span className="text-xs text-[var(--text-muted)]">{String(point.month).padStart(2, '0')}/{String(point.year).slice(-2)}</span><div className="space-y-1"><div className="h-2 rounded-full bg-[var(--surface-subtle)]"><span className="block h-full rounded-full bg-[var(--income)]" style={{ width: `${(point.income / max) * 100}%` }} /></div><div className="h-2 rounded-full bg-[var(--surface-subtle)]"><span className="block h-full rounded-full bg-[var(--expense)]" style={{ width: `${(point.expense / max) * 100}%` }} /></div></div></div>)}</div></article></section>;
}

function LimitsView({ data, showValues }: { data: MonthlyDashboard; showValues: boolean }) {
  const limits = [...data.limits].sort((left, right) => right.percentage - left.percentage);
  return <section className="grid gap-4 min-[901px]:grid-cols-[1.2fr_1fr]"><article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-[18px]"><h2 className="text-base font-bold">Limites do mês</h2><div className="mt-4 space-y-4">{limits.length === 0 ? <p className="text-sm text-[var(--text-muted)]">Nenhum limite configurado.</p> : limits.map((limit) => <div key={limit.category.id}><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">{limit.category.name}</span><strong className={limit.percentage > 100 ? 'text-[var(--expense)]' : limit.percentage >= 80 ? 'text-[var(--warning)]' : ''}>{limit.percentage.toLocaleString('pt-BR')}%</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]"><span className={`block h-full rounded-full ${limit.percentage > 100 ? 'bg-[var(--expense)]' : limit.percentage >= 80 ? 'bg-[var(--warning)]' : 'bg-[var(--orbit-primary)]'}`} style={{ width: `${Math.min(100, Math.max(0, limit.percentage))}%` }} /></div><p className="mt-1 text-xs text-[var(--text-muted)]">{displayMoney(limit.realized, showValues, data.currency)} de {displayMoney(limit.amount, showValues, data.currency)}</p></div>)}</div></article><article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-[18px]"><h2 className="text-base font-bold">Resumo</h2><div className="mt-3 divide-y divide-[var(--border)]"><MetricRow label="Orçamento" value={displayMoney(limits.reduce((sum, item) => sum + item.amount, 0), showValues, data.currency)} /><MetricRow label="Realizado" value={displayMoney(limits.reduce((sum, item) => sum + item.realized, 0), showValues, data.currency)} /><MetricRow label="Críticas" value={String(limits.filter((item) => item.percentage >= 80).length)} tone="warning" /></div></article></section>;
}

function AccountsView({ data, showValues }: { data: MonthlyDashboard; showValues: boolean }) {
  return <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-[18px]"><h2 className="flex items-center gap-2 text-base font-bold"><FaWallet aria-hidden="true" /> Contas</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Cada moeda permanece isolada.</p><div className="mt-4 divide-y divide-[var(--border)]">{data.accounts.map((account) => <Link key={account.id} href="/contas" className="flex min-h-14 items-center gap-3 py-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-white" style={{ backgroundColor: account.color }}><IconRenderer iconName={account.icon} size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{account.name}</p><small className="text-xs text-[var(--text-muted)]">{account.currency}</small></div><strong className={account.balance < 0 ? 'text-[var(--expense)]' : ''}>{displayMoney(account.balance, showValues, account.currency)}</strong></Link>)}</div></article>;
}

function ForecastDialog({ data, showValues, onClose }: { data: ForecastData; showValues: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onCloseRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      window.requestAnimationFrame(() => previousFocus?.focus());
    };
  }, []);

  return <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--overlay)] p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section role="dialog" aria-modal="true" aria-labelledby="forecast-dialog-title" className="max-h-[86dvh] w-full max-w-[760px] overflow-y-auto rounded-[18px] border border-[var(--border-strong)] bg-[var(--background)] p-5 shadow-[var(--shadow-surface)]"><header className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--orbit-primary)]">Próximos movimentos</p><h2 id="forecast-dialog-title" className="mt-1 text-xl font-bold">Saldo projetado · 30 dias</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Pendências reais já cadastradas; esta leitura não cria nem conclui lançamentos.</p></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar projeção" className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"><FaTimes aria-hidden="true" /></button></header><div className="mt-4 grid gap-3 sm:grid-cols-2">{data.accounts.map((account) => <article key={account.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><p className="text-sm font-bold">{account.name}</p><dl className="mt-3 grid grid-cols-2 gap-2"><MiniMetric label="Realizado" value={displayMoney(account.realizedBalance, showValues, data.currency)} /><MiniMetric label="Projetado" value={displayMoney(account.projectedBalance, showValues, data.currency)} tone={account.projectedBalance < 0 ? 'expense' : 'income'} /><MiniMetric label="Entradas" value={displayMoney(account.pendingIncome, showValues, data.currency)} tone="income" /><MiniMetric label="Saídas" value={displayMoney(account.pendingExpense, showValues, data.currency)} tone="expense" /></dl></article>)}</div><h3 className="mt-5 flex items-center gap-2 text-sm font-bold"><FaClock aria-hidden="true" /> Próximos lançamentos</h3><div className="mt-2 divide-y divide-[var(--border)]">{data.upcoming.slice(0, 8).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-2.5"><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.description}</p><small className="text-xs text-[var(--text-muted)]">{logicalDateLabel(item)}{item.kind === 'TRANSFER' ? ' · Transferência' : ''}</small></div><strong className={item.type === 'INCOME' ? 'text-[var(--income)]' : 'text-[var(--expense)]'}>{showValues ? `${item.type === 'INCOME' ? '+' : '-'}${formatCurrency(item.amount, data.currency)}` : '••••'}</strong></div>)}</div></section></div>;
}

function MetricRow({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'income' | 'expense' | 'warning' | 'neutral' }) {
  return <div className="flex items-center justify-between gap-3 py-2.5"><span className="text-sm text-[var(--text-muted)]">{label}</span><strong className={tone === 'income' ? 'text-[var(--income)]' : tone === 'expense' ? 'text-[var(--expense)]' : tone === 'warning' ? 'text-[var(--warning)]' : ''}>{value}</strong></div>;
}

function MiniMetric({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'income' | 'expense' | 'neutral' }) {
  return <div className="rounded-lg bg-[var(--surface-raised)] p-2.5"><dt className="text-[10px] text-[var(--text-muted)]">{label}</dt><dd className={`mt-1 break-words text-sm font-bold ${tone === 'income' ? 'text-[var(--income)]' : tone === 'expense' ? 'text-[var(--expense)]' : ''}`}>{value}</dd></div>;
}

function toneClass(tone: OrbitNode['tone']) {
  if (tone === 'income') return 'border-[var(--income)] text-[var(--income)]';
  if (tone === 'expense') return 'border-[var(--expense)] text-[var(--expense)]';
  if (tone === 'warning') return 'border-[var(--warning)] text-[var(--warning)]';
  if (tone === 'primary') return 'border-[var(--orbit-primary)] text-[var(--orbit-primary)]';
  return 'border-[var(--border-strong)] text-[var(--foreground)]';
}

function DashboardLoading() {
  return <div className="grid gap-[18px] min-[901px]:grid-cols-[minmax(520px,1.55fr)_minmax(300px,.8fr)]" role="status" aria-label="Carregando dashboard"><div className="h-[535px] animate-pulse rounded-[18px] border border-[var(--border)] bg-[var(--skeleton)]" /><div className="grid gap-3.5"><div className="h-40 animate-pulse rounded-[18px] bg-[var(--skeleton)]" /><div className="h-40 animate-pulse rounded-[18px] bg-[var(--skeleton)]" /><div className="h-32 animate-pulse rounded-[18px] bg-[var(--skeleton)]" /></div></div>;
}