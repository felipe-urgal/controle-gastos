'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaArrowRight,
  FaCheck,
  FaClock,
  FaSyncAlt,
  FaTimes,
} from 'react-icons/fa';

import { PageEmpty, PageLoading } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import { useAuth } from '@/app/context';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { recurrenceService } from '@/app/services/recurrence-service';
import type {
  RecurrenceCandidate,
  RecurrenceLogicalDate,
  RecurrencesData,
  RecurrenceSummaryItem,
} from '@/app/types/recurrence';
import type { RecurrenceFrequency } from '@/app/types/transaction';

function displayMoney(amount: number, showValues: boolean, currency: string) {
  return showValues ? formatCurrency(amount, currency) : '••••';
}

function dateLabel(value: RecurrenceLogicalDate) {
  return new Date(value.year, value.month - 1, value.day).toLocaleDateString('pt-BR');
}

function frequencyLabel(frequency: RecurrenceFrequency, interval: number) {
  if (frequency === 'WEEKLY') return interval === 1 ? 'Semanal' : `A cada ${interval} semanas`;
  if (frequency === 'MONTHLY') return interval === 1 ? 'Mensal' : `A cada ${interval} meses`;
  return interval === 1 ? 'Anual' : `A cada ${interval} anos`;
}

export default function RecurrencesCenter() {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const [data, setData] = useState<RecurrencesData | null>(null);
  const [ignored, setIgnored] = useState<Set<string>>(() => new Set());
  const [confirming, setConfirming] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await recurrenceService.get();
      setData(response.data);
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar as recorrências.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleCandidates = useMemo(
    () => data?.candidates.filter((candidate) => !ignored.has(candidate.id)) ?? [],
    [data, ignored],
  );

  async function confirm(candidate: RecurrenceCandidate) {
    setConfirming(candidate.id);
    setError('');
    try {
      await recurrenceService.confirmCandidate(candidate.id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível confirmar a recorrência.');
    } finally {
      setConfirming(null);
    }
  }

  function ignore(id: string) {
    setIgnored((current) => new Set(current).add(id));
  }

  return (
    <ProtectedRoute>
      <section className="mx-auto w-full max-w-6xl pb-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[34px] font-extrabold tracking-tight text-[var(--foreground)]">
              Recorrências e assinaturas
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)] sm:text-base">
              Acompanhe séries cadastradas e revise padrões detectados antes de transformá-los em recorrências.
            </p>
          </div>
          <Link
            href="/transacoes/nova"
            className="flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--foreground)]"
          >
            Nova transação
            <FaArrowRight aria-hidden="true" />
          </Link>
        </header>

        {error && (
          <p role="alert" className="mt-4 rounded-[14px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]">
            {error}
          </p>
        )}

        {loading ? (
          <div className="mt-5"><PageLoading /></div>
        ) : !data ? null : (
          <div className="mt-5 space-y-5">
            <Totals data={data} showValues={showValues} />

            <section aria-labelledby="formal-recurrences-title">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 id="formal-recurrences-title" className="text-xl font-bold text-[var(--foreground)]">
                    Recorrências ativas
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Séries formais já cadastradas. Candidatos não entram nos totais até serem confirmados.
                  </p>
                </div>
                <span className="text-xs font-semibold text-[var(--text-muted)]">
                  {data.formal.length} {data.formal.length === 1 ? 'série' : 'séries'}
                </span>
              </div>

              {data.formal.length === 0 ? (
                <div className="mt-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-6">
                  <PageEmpty title="Nenhuma recorrência ativa" />
                </div>
              ) : (
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  {data.formal.map((item) => (
                    <FormalCard key={item.id} item={item} showValues={showValues} />
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="candidate-recurrences-title">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="candidate-recurrences-title" className="text-xl font-bold text-[var(--foreground)]">
                    Padrões detectados
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
                    Sugestões baseadas em até {data.candidateWindowMonths} meses e {data.candidateHistoryLimit} lançamentos. Nada é criado sem confirmação.
                  </p>
                </div>
                <span className="text-xs font-semibold text-[var(--text-muted)]">
                  {visibleCandidates.length} {visibleCandidates.length === 1 ? 'sugestão' : 'sugestões'}
                </span>
              </div>

              {visibleCandidates.length === 0 ? (
                <div className="mt-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-6">
                  <PageEmpty title="Nenhum padrão pendente de revisão" />
                </div>
              ) : (
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  {visibleCandidates.map((candidate) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      showValues={showValues}
                      confirming={confirming === candidate.id}
                      onConfirm={() => void confirm(candidate)}
                      onIgnore={() => ignore(candidate.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </ProtectedRoute>
  );
}

function Totals({ data, showValues }: { data: RecurrencesData; showValues: boolean }) {
  if (data.totals.length === 0) return null;

  return (
    <section aria-label="Totais de recorrências" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {data.totals.map((total) => (
        <article key={total.currency} className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4">
          <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">{total.currency}</span>
          <strong className="mt-2 block text-2xl font-extrabold text-[var(--foreground)]">
            {displayMoney(total.monthlyEquivalent, showValues, total.currency)}
            <span className="ml-1 text-xs font-semibold text-[var(--text-muted)]">/ mês</span>
          </strong>
          <span className="mt-1 block text-sm text-[var(--text-muted)]">
            {displayMoney(total.annualEquivalent, showValues, total.currency)} / ano
          </span>
        </article>
      ))}
    </section>
  );
}

function FormalCard({ item, showValues }: { item: RecurrenceSummaryItem; showValues: boolean }) {
  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary-subtle)] px-2.5 py-1 text-xs font-bold text-[var(--primary)]">
            <FaSyncAlt aria-hidden="true" />
            Recorrência cadastrada
          </span>
          <h3 className="mt-3 truncate text-lg font-bold text-[var(--foreground)]">{item.description}</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{item.category.name} · {item.account.name}</p>
        </div>
        <strong className="shrink-0 text-right text-base text-[var(--foreground)]">
          {displayMoney(item.amount, showValues, item.currency)}
        </strong>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <Metric label="Frequência" value={frequencyLabel(item.frequency, item.interval)} />
        <Metric label="Próximo lançamento" value={dateLabel(item.nextOccurrence)} />
        <Metric label="Equivalente mensal" value={displayMoney(item.monthlyEquivalent, showValues, item.currency)} />
      </div>

      <Link
        href={`/transacoes/alterar/${item.transactionId}`}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] px-4 text-sm font-bold text-[var(--foreground)]"
      >
        Editar próxima ocorrência
        <FaArrowRight aria-hidden="true" />
      </Link>
    </article>
  );
}

function CandidateCard({
  candidate,
  showValues,
  confirming,
  onConfirm,
  onIgnore,
}: {
  candidate: RecurrenceCandidate;
  showValues: boolean;
  confirming: boolean;
  onConfirm: () => void;
  onIgnore: () => void;
}) {
  return (
    <article className="rounded-[18px] border border-dashed border-[var(--orbit-primary)]/45 bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--orbit-primary-subtle)] px-2.5 py-1 text-xs font-bold text-[var(--orbit-primary)]">
            <FaClock aria-hidden="true" />
            Detectada · {candidate.occurrenceCount} ocorrências
          </span>
          <h3 className="mt-3 truncate text-lg font-bold text-[var(--foreground)]">{candidate.description}</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{candidate.category.name} · {candidate.account.name}</p>
        </div>
        <div className="text-right">
          <strong className="block text-base text-[var(--foreground)]">
            {displayMoney(candidate.amount, showValues, candidate.currency)}
          </strong>
          {candidate.variableAmount && (
            <span className="mt-1 block text-xs font-semibold text-[var(--warning)]">valor variável</span>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <Metric label="Padrão" value={frequencyLabel(candidate.frequency, candidate.interval)} />
        <Metric label="Próxima estimativa" value={dateLabel(candidate.nextOccurrence)} />
        <Metric label="Equivalente anual" value={displayMoney(candidate.annualEquivalent, showValues, candidate.currency)} />
      </div>

      {candidate.variableAmount && (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Faixa observada: {displayMoney(candidate.minAmount, showValues, candidate.currency)} a {displayMoney(candidate.maxAmount, showValues, candidate.currency)}.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirming}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--orbit-primary)] px-4 text-sm font-bold text-white disabled:opacity-50"
        >
          <FaCheck aria-hidden="true" />
          {confirming ? 'Confirmando…' : 'Confirmar recorrência'}
        </button>
        <button
          type="button"
          onClick={onIgnore}
          disabled={confirming}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] px-4 text-sm font-bold text-[var(--foreground)] disabled:opacity-50"
        >
          <FaTimes aria-hidden="true" />
          Ignorar
        </button>
      </div>
    </article>
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
