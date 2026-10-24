'use client';

import { MonthBarsChart } from '@/app/components/charts/month-bars-chart';
import { format } from 'date-fns';
import Link from 'next/link';
import { useState } from 'react';
import { FaArrowLeft } from 'react-icons/fa';

import { appBarTitleClassName } from '@/app/components/base-pages/page-title';
import { Alert } from '@/app/components/feedback';
import MerchantAliasesCard from '@/app/components/pages/merchant/show/merchant-aliases-card';
import {
  buildHistoryBars,
  describeMonth,
  longMonthLabel,
} from '@/app/components/pages/merchant/show/merchant-show-model';
import { Button, IconLink, Input, ShowBelow } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { MerchantDTO } from '@/app/types/merchant';

export default function MerchantShowView({
  merchant,
  backUrl,
  isBusy,
  error,
  onUpdate,
  onDeleteRequest,
}: {
  merchant: MerchantDTO;
  backUrl: string;
  isBusy: boolean;
  error: string;
  onUpdate: (data: { name?: string; isActive?: boolean }) => Promise<void>;
  onDeleteRequest: () => void;
}) {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const activity = merchant.activity ?? null;
  const currency = activity?.currency ?? 'BRL';
  const money = (cents: number, code: string = currency) => (showValues ? formatCurrency(cents, code) : '••••');
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(merchant.name);
  const [saving, setSaving] = useState(false);
  const filterHref = `/transacoes?merchantId=${encodeURIComponent(merchant.id)}`;
  const bars = activity ? buildHistoryBars(activity.history) : null;
  const sentences = activity ? describeMonth({ month: activity.month, previousAverage: activity.previousAverage, money }) : [];
  const disabled = isBusy || saving;

  async function run(data: { name?: string; isActive?: boolean }) {
    setSaving(true);
    try {
      await onUpdate(data);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveName() {
    const name = draft.trim();
    if (name.length < 2 || name === merchant.name) {
      setRenaming(false);
      setDraft(merchant.name);
      return;
    }
    if (await run({ name })) setRenaming(false);
  }

  return (
    <div className={`w-full space-y-4 pb-5 transition-opacity duration-150 ${isBusy ? 'pointer-events-none opacity-50' : ''}`}>
      <ShowBelow breakpoint="lg">
        <header className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
          <IconLink label="Voltar para estabelecimentos" href={backUrl} icon={<FaArrowLeft />} className="rounded-full text-lg text-[var(--foreground)]" />
          <h1 className={`text-center ${appBarTitleClassName}`}>{merchant.name}</h1>
        </header>
      </ShowBelow>

      {error ? <Alert variant="error" message={error} /> : null}

      <section
        aria-label="Resumo do estabelecimento"
        className="grid gap-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-5"
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3.5">
          <span className="grid h-12 w-12 place-items-center rounded-[var(--radius-lg)] bg-[var(--primary)] text-lg font-bold text-[var(--on-primary)]" aria-hidden="true">
            {merchant.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            {renaming ? (
              <form
                className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveName();
                }}
              >
                <Input aria-label="Novo nome do estabelecimento" value={draft} maxLength={120} autoFocus disabled={saving} onChange={(event) => setDraft(event.target.value)} />
                <Button type="submit" size="sm" isLoading={saving} disabled={draft.trim().length < 2}>Salvar nome</Button>
                <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => { setRenaming(false); setDraft(merchant.name); }}>Cancelar</Button>
              </form>
            ) : (
              <>
                <h2 className="break-words text-xl font-bold tracking-tight">{merchant.name}</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  <span className={`mr-2 rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-xs font-semibold ${merchant.isActive ? 'text-[var(--income)]' : 'text-[var(--text-muted)]'}`}>
                    {merchant.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                  {merchant.transactionsCount} transação(ões) · {merchant.aliasesCount} alias(es)
                </p>
              </>
            )}
          </div>
        </div>

        {activity ? (
          <div className="grid gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-muted)]">Gasto em {longMonthLabel(activity.month.month)}</p>
              <strong className="money mt-1 block break-words text-4xl font-semibold leading-none tracking-[-0.035em] sm:text-5xl">
                {money(activity.month.expense)}
              </strong>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              {activity.month.count > 0 ? `${activity.month.count} ${activity.month.count === 1 ? 'compra' : 'compras'} neste mês. ` : 'Nenhuma compra neste mês. '}
              {sentences.length > 0 ? `${sentences.join(' · ')}. ` : ''}
              {activity.topCategory ? (
                <>
                  Mais usado em <strong className="text-[var(--foreground)]">{activity.topCategory.name}</strong> ({activity.topCategory.share}%).
                </>
              ) : null}
            </p>
            {activity.otherCurrencies.length > 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                Há gastos em {activity.otherCurrencies.join(', ')}; os valores acima são em {activity.currency}.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">Os números do mês não estão disponíveis agora.</p>
        )}

        <nav aria-label="Ações do estabelecimento" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button as="a" href="/transacoes/nova" size="xs" className="w-full">Nova transação</Button>
          <Button as="a" href={filterHref} variant="outline" size="xs" className="w-full">Ver transações</Button>
          <Button type="button" variant="outline" size="xs" className="w-full" disabled={disabled || renaming} onClick={() => { setDraft(merchant.name); setRenaming(true); }}>
            Renomear
          </Button>
        </nav>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {bars && activity ? (
            <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] pb-4" aria-labelledby="merchant-history-heading">
              <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pb-2 pt-4 sm:px-5">
                <h2 id="merchant-history-heading" className="text-base font-bold">Últimos 6 meses</h2>
                <p className="text-xs text-[var(--text-muted)]">gasto por mês</p>
              </div>
              <div className="mx-4 sm:mx-5">
                <MonthBarsChart
                  ariaLabel="Gasto por mês nos últimos 6 meses"
                  heightClass="h-28"
                  bars={bars.map((bar) => ({ key: bar.key, label: bar.label, valueLabel: money(bar.expense), heightPercent: bar.heightPercent, current: bar.current }))}
                />
              </div>
              <p className="px-4 pt-3 text-sm text-[var(--text-muted)] sm:px-5">
                Média dos 5 meses anteriores: <span className="money font-semibold text-[var(--foreground)]">{money(activity.previousAverage)}</span>.
              </p>
            </section>
          ) : null}

          <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]" aria-labelledby="merchant-movements-heading">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2 pt-4 sm:px-5">
              <h2 id="merchant-movements-heading" className="text-base font-bold">
                Movimentações de {activity ? longMonthLabel(activity.month.month) : 'este mês'}
              </h2>
              <Link href={filterHref} className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--primary)]">Ver todas</Link>
            </div>
            {!activity || activity.recent.length === 0 ? (
              <p className="border-t border-[var(--border)] px-4 py-6 text-sm text-[var(--text-muted)] sm:px-5">Nenhuma movimentação neste estabelecimento neste mês.</p>
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

        <div className="space-y-4">
          <MerchantAliasesCard merchantId={merchant.id} merchantName={merchant.name} />

          <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]" aria-labelledby="merchant-about-heading">
            <h2 id="merchant-about-heading" className="px-4 pb-2 pt-4 text-base font-bold sm:px-5">Sobre</h2>
            <dl className="grid gap-2 px-4 pb-4 text-sm sm:px-5">
              <div className="flex justify-between gap-3"><dt className="text-[var(--text-muted)]">Transações</dt><dd className="money">{merchant.transactionsCount}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[var(--text-muted)]">Criado em</dt><dd>{format(new Date(merchant.createdAt), 'dd/MM/yyyy')}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[var(--text-muted)]">Atualizado em</dt><dd>{format(new Date(merchant.updatedAt), 'dd/MM/yyyy')}</dd></div>
            </dl>
            <details className="border-t border-[var(--border)]">
              <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm text-[var(--text-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:px-5 [&::-webkit-details-marker]:hidden">
                Zona de risco
              </summary>
              <div className="grid gap-3 px-4 pb-4 text-sm text-[var(--text-muted)] sm:px-5">
                <p>Com transações ou aliases vinculados, só é possível inativar: o histórico é preservado e o estabelecimento deixa de ser sugerido. Para excluir, remova antes os aliases.</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => void run({ isActive: !merchant.isActive })}>
                    {merchant.isActive ? 'Inativar estabelecimento' : 'Reativar estabelecimento'}
                  </Button>
                  <Button type="button" variant="danger" size="sm" disabled={disabled} onClick={onDeleteRequest}>Excluir estabelecimento</Button>
                </div>
              </div>
            </details>
          </section>
        </div>
      </div>
    </div>
  );
}
