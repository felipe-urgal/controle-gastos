'use client';

import { useCallback, useEffect, useState } from 'react';
import { FaCheck, FaClock, FaTimes, FaTriangleExclamation } from 'react-icons/fa6';

import { formatCurrency } from '@/app/lib/currency/format-currency';
import { subscriptionService } from '@/app/services/subscription-service';
import type {
  SubscriptionItem,
  SubscriptionsData,
  SubscriptionReviewStatus,
} from '@/app/types/subscription';
import type { RecurrenceFrequency } from '@/app/types/transaction';

function displayMoney(amount: number, showValues: boolean, currency: string) {
  return showValues ? formatCurrency(amount, currency) : '••••';
}

function dateLabel(value: { year: number; month: number; day: number }) {
  return new Date(value.year, value.month - 1, value.day).toLocaleDateString('pt-BR');
}

function frequencyLabel(frequency: RecurrenceFrequency, interval: number) {
  if (frequency === 'WEEKLY') return interval === 1 ? 'Semanal' : 'Quinzenal';
  if (frequency === 'MONTHLY') return interval === 1 ? 'Mensal' : 'Trimestral';
  return 'Anual';
}

export function SubscriptionSection({ showValues }: { showValues: boolean }) {
  const [data, setData] = useState<SubscriptionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const response = await subscriptionService.get();
    setData(response.data);
    setError('');
  }, []);

  useEffect(() => {
    let active = true;

    void subscriptionService
      .get()
      .then((response) => {
        if (!active) return;
        setData(response.data);
        setError('');
      })
      .catch((caught) => {
        if (!active) return;
        setError(
          caught instanceof Error
            ? caught.message
            : 'Não foi possível carregar as assinaturas.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function review(id: string, status: SubscriptionReviewStatus) {
    setReviewing(id);
    setError('');
    try {
      await subscriptionService.review(id, { status });
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível atualizar a assinatura.',
      );
    } finally {
      setReviewing(null);
    }
  }

  if (loading) {
    return (
      <section aria-labelledby="subscriptions-title">
        <h2 id="subscriptions-title" className="text-xl font-bold text-[var(--foreground)]">
          Assinaturas
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Analisando cobranças recorrentes…</p>
      </section>
    );
  }

  if (!data) return null;

  return (
    <section aria-labelledby="subscriptions-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="subscriptions-title" className="text-xl font-bold text-[var(--foreground)]">
            Assinaturas
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
            Cobranças detectadas em até {data.windowMonths} meses. Os valores são projeções derivadas do histórico e não criam novos lançamentos.
          </p>
        </div>
        <span className="text-xs font-semibold text-[var(--text-muted)]">
          {data.confirmed.length} confirmada{data.confirmed.length === 1 ? '' : 's'} · {data.possible.length} possível{data.possible.length === 1 ? '' : 'is'}
        </span>
      </div>

      {error && (
        <p role="alert" className="rounded-[14px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]">
          {error}
        </p>
      )}

      {data.totals.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.totals.map((total) => (
            <article key={total.currency} className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4">
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Assinaturas · {total.currency}
              </span>
              <strong className="mt-2 block text-2xl font-extrabold text-[var(--foreground)]">
                {displayMoney(total.monthlyEquivalent, showValues, total.currency)}
                <span className="ml-1 text-xs font-semibold text-[var(--text-muted)]">/ mês</span>
              </strong>
              <span className="mt-1 block text-sm text-[var(--text-muted)]">
                {displayMoney(total.annualEquivalent, showValues, total.currency)} / ano
              </span>
            </article>
          ))}
        </div>
      )}

      {data.priceChanges.length > 0 && (
        <div className="rounded-[18px] border border-[var(--warning)]/35 bg-[var(--surface)] p-4">
          <div className="flex items-center gap-2">
            <FaTriangleExclamation className="text-[var(--warning)]" aria-hidden="true" />
            <h3 className="font-bold text-[var(--foreground)]">Variações recentes de preço</h3>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {data.priceChanges.map((item) => (
              <PriceChange key={item.id} item={item} showValues={showValues} />
            ))}
          </div>
        </div>
      )}

      {data.confirmed.length > 0 && (
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Confirmadas
          </h3>
          <div className="mt-2 grid gap-3 lg:grid-cols-2">
            {data.confirmed.map((item) => (
              <SubscriptionCard
                key={item.id}
                item={item}
                showValues={showValues}
                reviewing={reviewing === item.id}
                onReview={(status) => void review(item.id, status)}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
          Possíveis assinaturas
        </h3>
        {data.possible.length === 0 ? (
          <p className="mt-2 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)]">
            Nenhuma assinatura pendente de revisão.
          </p>
        ) : (
          <div className="mt-2 grid gap-3 lg:grid-cols-2">
            {data.possible.map((item) => (
              <SubscriptionCard
                key={item.id}
                item={item}
                showValues={showValues}
                reviewing={reviewing === item.id}
                onReview={(status) => void review(item.id, status)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SubscriptionCard({
  item,
  showValues,
  reviewing,
  onReview,
}: {
  item: SubscriptionItem;
  showValues: boolean;
  reviewing: boolean;
  onReview: (status: SubscriptionReviewStatus) => void;
}) {
  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary-subtle)] px-2.5 py-1 text-xs font-bold text-[var(--primary)]">
            <FaClock aria-hidden="true" />
            {item.status === 'CONFIRMED' ? 'Assinatura confirmada' : 'Possível assinatura'}
          </span>
          <h4 className="mt-3 truncate text-lg font-bold text-[var(--foreground)]">
            {item.description}
          </h4>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {item.category.name} · {item.account.name}
          </p>
        </div>
        <strong className="shrink-0 text-right text-base text-[var(--foreground)]">
          {displayMoney(item.currentAmount, showValues, item.currency)}
        </strong>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <Metric label="Periodicidade" value={frequencyLabel(item.frequency, item.interval)} />
        <Metric label="Última cobrança" value={dateLabel(item.lastCharge)} />
        <Metric label="Próxima estimativa" value={dateLabel(item.nextCharge)} />
        <Metric label="Equivalente mensal" value={displayMoney(item.monthlyEquivalent, showValues, item.currency)} />
        <Metric label="Custo anual estimado" value={displayMoney(item.annualEquivalent, showValues, item.currency)} />
        <Metric label="Evidências" value={String(item.occurrenceCount)} />
      </div>

      <p className="mt-3 text-sm text-[var(--text-muted)]">{item.explanation}</p>

      {item.possiblyEnded && (
        <p className="mt-2 text-xs font-semibold text-[var(--warning)]">
          Não houve nova cobrança por mais de um ciclo esperado; a assinatura pode ter sido encerrada.
        </p>
      )}

      {item.priceChange && (
        <div className="mt-3">
          <PriceChange item={item} showValues={showValues} />
        </div>
      )}

      <details className="mt-3 rounded-[12px] bg-[var(--surface-raised)] p-3">
        <summary className="cursor-pointer text-sm font-bold text-[var(--foreground)]">
          Revisar cobranças usadas
        </summary>
        <ul className="mt-3 space-y-2">
          {item.evidence.map((evidence) => (
            <li key={evidence.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
              <span>{dateLabel(evidence)} · {evidence.description}</span>
              <strong className="text-[var(--foreground)]">
                {displayMoney(evidence.amount, showValues, item.currency)}
              </strong>
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-4 flex flex-wrap gap-2">
        {item.status === 'POSSIBLE' && (
          <button
            type="button"
            disabled={reviewing}
            onClick={() => onReview('CONFIRMED')}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--orbit-primary)] px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            <FaCheck aria-hidden="true" />
            É assinatura
          </button>
        )}
        <button
          type="button"
          disabled={reviewing}
          onClick={() => onReview('REJECTED')}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] px-4 text-sm font-bold text-[var(--foreground)] disabled:opacity-50"
        >
          <FaTimes aria-hidden="true" />
          Não é assinatura
        </button>
        {item.status === 'POSSIBLE' && (
          <button
            type="button"
            disabled={reviewing}
            onClick={() => onReview('IGNORED')}
            className="min-h-11 rounded-full border border-[var(--border)] px-4 text-sm font-bold text-[var(--text-muted)] disabled:opacity-50"
          >
            Ignorar
          </button>
        )}
      </div>
    </article>
  );
}

function PriceChange({ item, showValues }: { item: SubscriptionItem; showValues: boolean }) {
  const change = item.priceChange;
  if (!change) return null;

  const sign = change.difference > 0 ? '+' : '';
  return (
    <div className="rounded-[12px] bg-[var(--surface-raised)] p-3 text-sm">
      <strong className="text-[var(--foreground)]">{item.description}</strong>
      <p className="mt-1 text-[var(--text-muted)]">
        {displayMoney(change.previousAmount, showValues, item.currency)} → {displayMoney(change.currentAmount, showValues, item.currency)}
      </p>
      <span className={change.difference > 0 ? 'font-bold text-[var(--expense)]' : 'font-bold text-[var(--income)]'}>
        {sign}{displayMoney(change.difference, showValues, item.currency)} ({sign}{change.percent}%)
      </span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-[var(--surface-raised)] p-3">
      <span className="block text-xs text-[var(--text-muted)]">{label}</span>
      <strong className="mt-1 block text-sm text-[var(--foreground)]">{value}</strong>
    </div>
  );
}
