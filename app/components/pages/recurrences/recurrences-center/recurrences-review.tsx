'use client';

import { FaCheck, FaClock, FaQuestion, FaSyncAlt, FaArrowUp } from 'react-icons/fa';

import {
  frequencyLabel,
  shortDate,
  type ReviewEntry,
} from '@/app/components/pages/recurrences/recurrences-center/recurrences-model';
import { Alert } from '@/app/components/feedback';
import { Button, MoneyText } from '@/app/components/ui';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { RecurrenceCandidate } from '@/app/types/recurrence';
import type { SubscriptionReviewStatus } from '@/app/types/subscription';

type Actions = {
  busyKey: string | null;
  onReview: (id: string, status: SubscriptionReviewStatus) => void;
  onCreateRecurrence: (id: string) => void;
  onConfirmCandidate: (candidate: RecurrenceCandidate) => void;
  onSuppressCandidate: (id: string) => void;
  onIgnore: (id: string) => void;
};

const REASON_BADGE = {
  PRICE: { label: 'Preço subiu', tone: 'bg-[var(--danger-subtle)] text-[var(--expense)]' },
  STALE: { label: 'Sem cobrança recente', tone: 'bg-[var(--warning-subtle)] text-[var(--warning)]' },
  POSSIBLE: { label: 'Possível assinatura', tone: 'bg-[var(--primary-subtle)] text-[var(--primary)]' },
} as const;

export default function RecurrencesReview({
  entries,
  showValues,
  error,
  window: candidateWindow,
  ...actions
}: {
  entries: ReviewEntry[];
  showValues: boolean;
  error: string;
  window: { months: number; limit: number };
} & Actions) {
  const money = (cents: number, currency: string) => (showValues ? formatCurrency(cents, currency) : '••••');

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--primary)] bg-[var(--surface)]" aria-labelledby="recurrences-review-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 pb-2 pt-4 sm:px-5">
        <h2 id="recurrences-review-heading" className="text-base font-bold">Para revisar</h2>
        <p className="text-xs text-[var(--text-muted)]">
          Nada é criado sem a sua confirmação. Sugestões usam até {candidateWindow.months} meses e {candidateWindow.limit} lançamentos.
        </p>
      </div>
      {error && (
        <div className="px-4 pb-2 sm:px-5">
          <Alert variant="error" message={error} />
        </div>
      )}
      {entries.length === 0 ? (
        <div className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-3 border-t border-[var(--border)] px-4 py-4 sm:px-5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--primary-subtle)] text-[var(--income)]" aria-hidden="true">
            <FaCheck />
          </span>
          <span>
            <strong className="block text-sm">Nada para revisar</strong>
            <span className="text-sm text-[var(--text-muted)]">Sem sugestões novas, preços alterados ou assinaturas paradas.</span>
          </span>
        </div>
      ) : (
        <ul>
          {entries.map((entry) => (
            <li key={entry.key} className="border-t border-[var(--border)]">
              {entry.kind === 'subscription' ? (
                <SubscriptionRow entry={entry} money={money} {...actions} />
              ) : (
                <CandidateRow candidate={entry.candidate} money={money} {...actions} />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RowShell({
  icon,
  title,
  badge,
  badgeTone,
  subtitle,
  amount,
  amountHint,
  children,
  actions,
}: {
  icon: React.ReactNode;
  title: string;
  badge: string;
  badgeTone: string;
  subtitle: string;
  amount: string;
  amountHint: string;
  children?: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:px-5">
      <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] bg-[var(--primary-subtle)] text-[var(--primary)]" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <strong className="block break-words text-sm">
          {title} <span className={`ml-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeTone}`}>{badge}</span>
        </strong>
        <span className="block break-words text-xs text-[var(--text-muted)]">{subtitle}</span>
        {children}
      </div>
      <div className="col-start-2 sm:col-start-3 sm:text-right">
        <span className="money block text-sm font-semibold">{amount}</span>
        <span className="text-xs text-[var(--text-muted)]">{amountHint}</span>
      </div>
      <div className="col-start-2 flex flex-wrap gap-2 sm:col-span-2">{actions}</div>
    </div>
  );
}

function SubscriptionRow({
  entry,
  money,
  busyKey,
  onReview,
  onCreateRecurrence,
  onIgnore,
}: { entry: Extract<ReviewEntry, { kind: 'subscription' }>; money: (cents: number, currency: string) => string } & Actions) {
  const { item, reason } = entry;
  const busy = busyKey === `subscription:${item.id}`;
  const badge = REASON_BADGE[reason];
  const change = item.priceChange;

  return (
    <RowShell
      icon={reason === 'PRICE' ? <FaArrowUp /> : reason === 'STALE' ? <FaClock /> : <FaQuestion />}
      title={item.description}
      badge={badge.label}
      badgeTone={badge.tone}
      subtitle={`${item.status === 'CONFIRMED' ? 'Assinatura confirmada' : `${item.occurrenceCount} cobranças`} · ${item.account.name} · ${frequencyLabel(item.frequency, item.interval)}`}
      amount={money(item.currentAmount, item.currency)}
      amountHint={`${money(item.annualEquivalent, item.currency)}/ano`}
      actions={
        <>
          {reason === 'STALE' && (
            <Button size="sm" disabled={busy} onClick={() => onReview(item.id, 'CONFIRMED')}>
              {busy ? 'Confirmando…' : 'Continua ativa'}
            </Button>
          )}
          {reason === 'POSSIBLE' && (
            <Button size="sm" disabled={busy} onClick={() => onReview(item.id, 'CONFIRMED')}>
              {busy ? 'Salvando…' : 'É assinatura'}
            </Button>
          )}
          {reason === 'PRICE' && !item.recurrenceSeriesId && item.status === 'CONFIRMED' && (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => onCreateRecurrence(item.id)}>
              Criar recorrência
            </Button>
          )}
          {reason === 'PRICE' && (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => onIgnore(item.id)}>
              Entendi
            </Button>
          )}
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => onReview(item.id, 'REJECTED')}>
            Não é assinatura
          </Button>
          {reason === 'POSSIBLE' && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => onReview(item.id, 'IGNORED')}>
              Ignorar
            </Button>
          )}
        </>
      }
    >
      {change && (
        <p className={`mt-1 text-xs font-semibold ${change.difference > 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}>
          <MoneyText>{`${money(change.previousAmount, item.currency)} → ${money(change.currentAmount, item.currency)} · ${change.difference > 0 ? '+' : '−'} ${money(Math.abs(change.difference), item.currency)} (${change.percent > 0 ? '+' : ''}${change.percent}%)`}</MoneyText>
        </p>
      )}
      {reason === 'STALE' && (
        <p className="mt-1 text-xs font-semibold text-[var(--warning)]">
          Sem nova cobrança por mais de dois ciclos. Fora dos totais ativos até você confirmar que continua vigente.
        </p>
      )}
      <p className="mt-1 text-xs text-[var(--text-muted)]">{item.explanation}</p>
      <Evidence
        label="Ver cobranças usadas"
        items={item.evidence.map((evidence) => ({
          id: evidence.id,
          text: `${String(evidence.day).padStart(2, '0')}/${String(evidence.month).padStart(2, '0')} · ${evidence.description}`,
          amount: money(evidence.amount, item.currency),
        }))}
      />
    </RowShell>
  );
}

function CandidateRow({
  candidate,
  money,
  busyKey,
  onConfirmCandidate,
  onSuppressCandidate,
  onIgnore,
}: { candidate: RecurrenceCandidate; money: (cents: number, currency: string) => string } & Actions) {
  const busy = busyKey === `candidate:${candidate.id}`;

  return (
    <RowShell
      icon={<FaSyncAlt />}
      title={candidate.description}
      badge="Padrão detectado"
      badgeTone="bg-[var(--primary-subtle)] text-[var(--primary)]"
      subtitle={`${candidate.type === 'INCOME' ? 'Receita' : 'Despesa'} · ${candidate.account.name} · ${candidate.category.name}`}
      amount={money(candidate.amount, candidate.currency)}
      amountHint={candidate.variableAmount ? 'média' : frequencyLabel(candidate.frequency, candidate.interval).toLowerCase()}
      actions={
        <>
          <Button size="sm" disabled={busy} onClick={() => onConfirmCandidate(candidate)}>
            {busy ? 'Salvando…' : 'Confirmar recorrência'}
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => onIgnore(candidate.id)}>
            Ignorar agora
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => onSuppressCandidate(candidate.id)}>
            Não sugerir novamente
          </Button>
        </>
      }
    >
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        {frequencyLabel(candidate.frequency, candidate.interval)} · {candidate.occurrenceCount} ocorrências · próxima estimativa em {shortDate(candidate.nextOccurrence)}. {candidate.explanation}
      </p>
      {candidate.variableAmount && (
        <p className="mt-1 text-xs font-semibold text-[var(--warning)]">
          Valor variável: <MoneyText>{`de ${money(candidate.minAmount, candidate.currency)} a ${money(candidate.maxAmount, candidate.currency)}`}</MoneyText>.
        </p>
      )}
      <Evidence
        label={`Revisar ${candidate.evidence.length} lançamentos usados`}
        items={candidate.evidence.map((evidence) => ({
          id: evidence.id,
          text: `${String(evidence.day).padStart(2, '0')}/${String(evidence.month).padStart(2, '0')} · ${evidence.description}`,
          amount: money(evidence.amount, candidate.currency),
        }))}
      />
    </RowShell>
  );
}

function Evidence({ label, items }: { label: string; items: Array<{ id: string; text: string; amount: string }> }) {
  if (items.length === 0) return null;
  return (
    <details className="mt-1">
      <summary className="flex min-h-11 cursor-pointer list-none items-center text-xs font-bold text-[var(--primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] [&::-webkit-details-marker]:hidden">
        {label}
      </summary>
      <ul className="grid gap-1 pb-2 text-xs text-[var(--text-muted)]">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap justify-between gap-2">
            <span className="break-words">{item.text}</span>
            <span className="money font-semibold text-[var(--foreground)]">{item.amount}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
