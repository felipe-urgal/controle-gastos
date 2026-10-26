'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { ListPageHeader, PageContainer } from '@/app/components/base-pages';
import { Alert, PageLoading } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import { ModalShell } from '@/app/components/overlays/modal-shell';
import EditSeriesModal from '@/app/components/pages/recurrences/recurrences-center/edit-series-modal';
import RecurrencesHero from '@/app/components/pages/recurrences/recurrences-center/recurrences-hero';
import { ConfirmedSubscriptions, FormalList } from '@/app/components/pages/recurrences/recurrences-center/recurrences-lists';
import {
  buildReviewQueue,
  logicalToday,
} from '@/app/components/pages/recurrences/recurrences-center/recurrences-model';
import RecurrencesReview from '@/app/components/pages/recurrences/recurrences-center/recurrences-review';
import { Button } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { recurrenceService } from '@/app/services/recurrence-service';
import { subscriptionService } from '@/app/services/subscription-service';
import type {
  RecurrenceCandidate,
  RecurrencesData,
  RecurrenceSummaryItem,
  UpdateRecurrenceSeriesInput,
} from '@/app/types/recurrence';
import type { SubscriptionReviewStatus } from '@/app/types/subscription';

function messageOf(caught: unknown, fallback: string) {
  return caught instanceof Error && caught.message ? caught.message : fallback;
}

export default function RecurrencesCenter() {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const today = useMemo(() => logicalToday(), []);
  const [data, setData] = useState<RecurrencesData | null>(null);
  const [ignored, setIgnored] = useState<Set<string>>(() => new Set());
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<RecurrenceSummaryItem | null>(null);
  const [endCandidate, setEndCandidate] = useState<RecurrenceSummaryItem | null>(null);
  const [ending, setEnding] = useState(false);
  const [heroCurrency, setHeroCurrency] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await recurrenceService.get();
      setData(response.data);
      setError('');
    } catch (caught) {
      setError(messageOf(caught, 'Não foi possível carregar as recorrências.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const queue = useMemo(() => (data ? buildReviewQueue(data, ignored) : []), [data, ignored]);
  const currency = heroCurrency ?? data?.totals[0]?.currency ?? data?.subscriptions.totals[0]?.currency ?? 'BRL';

  async function run(key: string, action: () => Promise<unknown>, fallback: string) {
    setBusyKey(key);
    setError('');
    try {
      await action();
      await load();
    } catch (caught) {
      setError(messageOf(caught, fallback));
    } finally {
      setBusyKey(null);
    }
  }

  function ignore(id: string) {
    setIgnored((current) => new Set(current).add(id));
  }

  async function endSeries(item: RecurrenceSummaryItem) {
    setEnding(true);
    setError('');
    try {
      await recurrenceService.endSeries(item.id);
      setEndCandidate(null);
      await load();
    } catch (caught) {
      setError(messageOf(caught, 'Não foi possível encerrar a recorrência.'));
      setEndCandidate(null);
    } finally {
      setEnding(false);
    }
  }

  async function saveSeries(item: RecurrenceSummaryItem, input: UpdateRecurrenceSeriesInput) {
    await recurrenceService.updateSeries(item.id, input);
    setEditing(null);
    await load();
  }

  return (
    <ProtectedRoute>
      <PageContainer as="section">
        <ListPageHeader title="Recorrências e assinaturas" createHref="/transacoes/nova" createLabel="Nova transação" />

        {error && !data && (
          <div className="mt-4">
            <Alert variant="error" message={error} />
          </div>
        )}

        {loading ? (
          <div className="mt-5"><PageLoading /></div>
        ) : !data ? null : (
          <div className="mt-5 space-y-4">
            <RecurrencesHero
              data={data}
              showValues={showValues}
              today={today}
              currency={currency}
              onCurrency={setHeroCurrency}
              reviewCount={queue.length}
            />

            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
              <FormalList
                items={data.formal}
                showValues={showValues}
                today={today}
                endingId={ending ? endCandidate?.id ?? null : null}
                onEdit={setEditing}
                onEnd={setEndCandidate}
              />
              <ConfirmedSubscriptions
                items={data.subscriptions.confirmed}
                showValues={showValues}
                busyKey={busyKey}
                onCreateRecurrence={(id) =>
                  void run(`subscription:${id}`, () => subscriptionService.createRecurrence(id), 'Não foi possível criar a recorrência.')
                }
              />
            </div>

            <RecurrencesReview
              entries={queue}
              showValues={showValues}
              error={error}
              window={{ months: data.candidateWindowMonths, limit: data.candidateHistoryLimit }}
              busyKey={busyKey}
              onReview={(id: string, status: SubscriptionReviewStatus) =>
                void run(`subscription:${id}`, () => subscriptionService.review(id, { status }), 'Não foi possível atualizar a assinatura.')
              }
              onCreateRecurrence={(id: string) =>
                void run(`subscription:${id}`, () => subscriptionService.createRecurrence(id), 'Não foi possível criar a recorrência.')
              }
              onConfirmCandidate={(candidate: RecurrenceCandidate) =>
                void run(`candidate:${candidate.id}`, () => recurrenceService.confirmCandidate(candidate.id), 'Não foi possível confirmar a recorrência.')
              }
              onSuppressCandidate={(id: string) =>
                void run(`candidate:${id}`, () => recurrenceService.suppressCandidate(id), 'Não foi possível ocultar o padrão.')
              }
              onIgnore={ignore}
            />

            <details className="group rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
              <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between px-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:px-5 [&::-webkit-details-marker]:hidden">
                Qual a diferença entre recorrência e assinatura?
                <span className="text-lg text-[var(--text-muted)] group-open:hidden" aria-hidden="true">+</span>
                <span className="hidden text-lg text-[var(--text-muted)] group-open:inline" aria-hidden="true">−</span>
              </summary>
              <div className="grid max-w-[78ch] gap-2.5 px-4 pb-5 text-sm text-[var(--text-muted)] sm:px-5">
                <p><strong className="text-[var(--foreground)]">Recorrência</strong> é o mecanismo que cria lançamentos futuros. Só nasce de uma ação explícita sua e é a única que entra no custo fixo.</p>
                <p><strong className="text-[var(--foreground)]">Assinatura</strong> é uma classificação detectada do histórico. Serve para acompanhar preços e cobranças; não cria lançamentos sozinha.</p>
                <p><strong className="text-[var(--foreground)]">Cada moeda é calculada separada.</strong> Candidatos não entram nos totais até serem confirmados.</p>
              </div>
            </details>
          </div>
        )}

        {editing && (
          <EditSeriesModal item={editing} onClose={() => setEditing(null)} onSave={(input) => saveSeries(editing, input)} />
        )}

        {endCandidate && (
          <ModalShell
            title={`Encerrar “${endCandidate.description}”?`}
            description="Lançamentos concluídos serão preservados e apenas ocorrências futuras pendentes serão canceladas."
            onClose={() => setEndCandidate(null)}
            closeDisabled={ending}
            maxWidthClass="max-w-md"
            footer={
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" disabled={ending} onClick={() => setEndCandidate(null)}>
                  Cancelar
                </Button>
                <Button variant="danger" disabled={ending} onClick={() => void endSeries(endCandidate)}>
                  {ending ? 'Encerrando…' : 'Encerrar recorrência'}
                </Button>
              </div>
            }
          >
            {null}
          </ModalShell>
        )}
      </PageContainer>
    </ProtectedRoute>
  );
}
