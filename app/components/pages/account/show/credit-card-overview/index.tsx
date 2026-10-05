'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronRight,
  FaCreditCard,
  FaPen,
  FaTimes,
} from 'react-icons/fa';

import { useAuth } from '@/app/context';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { accountService } from '@/app/services/account-service';
import { creditCardService } from '@/app/services/credit-card-service';
import type { AccountModel } from '@/app/types/account';
import type {
  CreditCardStatementItem,
  CreditCardStatementsData,
} from '@/app/types/credit-card';

function localIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function logicalIso(date: { year: number; month: number; day: number }) {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

function logicalLabel(date: { year: number; month: number; day: number }) {
  return `${String(date.day).padStart(2, '0')}/${String(date.month).padStart(2, '0')}/${date.year}`;
}

interface CreditCardOverviewProps {
  account: AccountModel;
  backUrl: string;
  editUrl: string;
  isDeleting: boolean;
  onDeleteRequest: () => void;
}

export default function CreditCardOverview({
  account,
  backUrl,
  editUrl,
  isDeleting,
  onDeleteRequest,
}: CreditCardOverviewProps) {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const [data, setData] = useState<CreditCardStatementsData | null>(null);
  const [accounts, setAccounts] = useState<AccountModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingStatement, setPayingStatement] = useState<CreditCardStatementItem | null>(null);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [paymentDate, setPaymentDate] = useState(localIsoDate());
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentAccountsError, setPaymentAccountsError] = useState<string | null>(null);
  const [loadingPaymentAccounts, setLoadingPaymentAccounts] = useState(false);
  const [paymentKey, setPaymentKey] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const paymentDialogRef = useRef<HTMLDivElement>(null);
  const paymentCloseRef = useRef<HTMLButtonElement>(null);
  const paymentTriggerRef = useRef<HTMLElement | null>(null);
  const isPayingRef = useRef(false);

  const loadPaymentAccounts = useCallback(async () => {
    setLoadingPaymentAccounts(true);
    try {
      const response = await accountService.getAll();
      setAccounts(response.data.items ?? []);
      setPaymentAccountsError(null);
    } catch (requestError) {
      setAccounts([]);
      setPaymentAccountsError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível carregar as contas pagadoras',
      );
    } finally {
      setLoadingPaymentAccounts(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const statementsResponse = await creditCardService.getStatements(account.id, {
        asOf: localIsoDate(),
        history: 12,
      });
      setData(statementsResponse.data);
      setError(null);
      void loadPaymentAccounts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao carregar cartão');
    } finally {
      setLoading(false);
    }
  }, [account.id, loadPaymentAccounts]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    isPayingRef.current = isPaying;
  }, [isPaying]);

  useEffect(() => {
    if (!payingStatement) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => paymentCloseRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isPayingRef.current) return;
        event.preventDefault();
        setPayingStatement(null);
        setPaymentError(null);
        setPaymentKey(null);
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        paymentDialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => paymentTriggerRef.current?.focus());
    };
  }, [payingStatement]);

  const paymentAccounts = useMemo(
    () =>
      accounts.filter(
        (candidate) =>
          candidate.id !== account.id &&
          candidate.type !== 'CREDIT_CARD' &&
          candidate.isActive &&
          candidate.currency === account.currency,
      ),
    [account.currency, account.id, accounts],
  );

  function openPayment(statement: CreditCardStatementItem) {
    paymentTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPayingStatement(statement);
    setSourceAccountId(paymentAccounts[0]?.id ?? '');
    setPaymentDate(localIsoDate());
    setPaymentError(null);
    setPaymentKey(globalThis.crypto.randomUUID());
  }

  function closePayment() {
    if (isPaying) return;
    setPayingStatement(null);
    setPaymentError(null);
    setPaymentKey(null);
  }

  async function payStatement() {
    if (!payingStatement || !sourceAccountId) {
      setPaymentError('Selecione a conta que pagou a fatura.');
      return;
    }

    const closingDate = logicalIso(payingStatement.closingDate);
    if (paymentDate < closingDate) {
      setPaymentError('A data de pagamento não pode ser anterior ao fechamento.');
      return;
    }

    if (paymentDate > localIsoDate()) {
      setPaymentError('A data de pagamento não pode estar no futuro.');
      return;
    }

    const key = paymentKey ?? globalThis.crypto.randomUUID();
    setPaymentKey(key);
    setIsPaying(true);
    setPaymentError(null);

    try {
      await creditCardService.payStatement(
        account.id,
        {
          sourceAccountId,
          statementClosingDate: closingDate,
          paymentDate,
        },
        key,
      );
      setPayingStatement(null);
      setPaymentKey(null);
      await load();
    } catch (requestError) {
      setPaymentError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível pagar a fatura',
      );
    } finally {
      setIsPaying(false);
    }
  }

  const money = (value: number) =>
    showValues ? formatCurrency(value, account.currency) : '••••';

  if (loading) {
    return (
      <div className="ds-panel p-6 text-sm text-[var(--text-muted)]">
        Carregando cartão...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="ds-panel p-6">
        <p className="font-semibold text-[var(--expense)]">{error || 'Não foi possível carregar o cartão.'}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setError(null);
            void load();
          }}
          className="mt-4 min-h-11 rounded-full border border-[var(--border-strong)] px-4 text-sm font-bold text-[var(--foreground)]"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const usagePercent =
    data.card.creditLimit > 0
      ? Math.min(100, Math.round((data.card.usedLimit / data.card.creditLimit) * 100))
      : 0;

  return (
    <div className={`mx-auto w-full max-w-5xl space-y-5 transition-opacity ${isDeleting ? 'pointer-events-none opacity-50' : ''}`}>
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <Link
          href={backUrl}
          aria-label="Voltar para contas"
          className="grid h-11 w-11 place-items-center rounded-full text-[var(--foreground)]"
        >
          <FaArrowLeft aria-hidden="true" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-center text-xl font-extrabold text-[var(--foreground)]">
          {account.name}
        </h1>
        <Link
          href={editUrl}
          aria-label="Editar cartão"
          className="grid h-11 w-11 place-items-center rounded-full text-[var(--orbit-primary)]"
        >
          <FaPen aria-hidden="true" />
        </Link>
      </div>

      <section className="overflow-hidden rounded-[24px] border border-[var(--orbit-primary)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--orbit-primary)_46%,var(--surface))_0%,#24133f_48%,#10151b_100%)] p-5 text-white shadow-[0_18px_42px_color-mix(in_srgb,var(--orbit-primary)_20%,transparent)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[16px] bg-white/10 text-2xl">
              <FaCreditCard aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-extrabold">{account.name}</h2>
              <p className="mt-1 text-sm text-white/70">
                Fecha dia {data.card.statementClosingDay} · vence dia {data.card.statementDueDay}
              </p>
            </div>
          </div>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-bold">
            {account.currency}
          </span>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <Metric label="Limite total" value={money(data.card.creditLimit)} />
          <Metric label="Em uso" value={money(data.card.usedLimit)} />
          <Metric label="Disponível" value={money(data.card.availableLimit)} />
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-white" style={{ width: `${usagePercent}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs font-semibold text-white/65">
          <span>{usagePercent}% utilizado</span>
          {data.card.overLimit > 0 && (
            <span>Excedido em {money(data.card.overLimit)}</span>
          )}
        </div>
      </section>

      <StatementCard
        title="Fatura atual"
        statement={data.current}
        currency={account.currency}
        showValues={showValues}
        onPay={openPayment}
        emphasize
      />

      {data.future.length > 0 && (
        <section className="ds-panel overflow-hidden">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h3 className="text-lg font-bold text-[var(--foreground)]">Próximas faturas</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Parcelas e compras futuras já materializadas.
            </p>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {data.future.map((statement) => (
              <CompactStatement
                key={logicalIso(statement.closingDate)}
                statement={statement}
                currency={account.currency}
                showValues={showValues}
              />
            ))}
          </div>
        </section>
      )}

      <section className="ds-panel overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h3 className="text-lg font-bold text-[var(--foreground)]">Histórico de faturas</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Até 12 ciclos anteriores, com pagamento quando disponível.
          </p>
        </div>
        {data.history.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[var(--text-muted)]">Nenhuma fatura anterior.</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {data.history.map((statement) => (
              <div key={logicalIso(statement.closingDate)} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-[var(--foreground)]">
                      Fechamento {logicalLabel(statement.closingDate)}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      Vencimento {logicalLabel(statement.dueDate)} · {statement.transactionCount} lançamento{statement.transactionCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-[var(--foreground)]">
                      {money(statement.total)}
                    </p>
                    <span className={statement.status === 'PAID'
                      ? 'mt-1 inline-flex items-center gap-1 text-xs font-bold text-[var(--income)]'
                      : 'mt-1 inline-flex items-center gap-1 text-xs font-bold text-[var(--expense)]'}>
                      {statement.status === 'PAID' ? <FaCheckCircle aria-hidden="true" /> : <FaCalendarAlt aria-hidden="true" />}
                      {statement.status === 'PAID' ? 'Paga' : 'Em aberto'}
                    </span>
                  </div>
                </div>
                {statement.status === 'OPEN' && statement.total > 0 && (
                  <button
                    type="button"
                    onClick={() => openPayment(statement)}
                    className="mt-3 min-h-11 rounded-full bg-[var(--orbit-primary)] px-4 text-sm font-bold text-white"
                  >
                    Pagar fatura
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={editUrl}
          className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] px-4 font-bold text-[var(--orbit-primary)]"
        >
          <FaPen aria-hidden="true" />
          Editar cartão
        </Link>
        <button
          type="button"
          onClick={onDeleteRequest}
          className="min-h-12 rounded-full border border-[var(--expense)]/30 bg-[var(--danger-subtle)] px-4 font-bold text-[var(--expense)]"
        >
          Excluir cartão
        </button>
      </div>

      {payingStatement && (
        <div ref={paymentDialogRef} className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="pay-card-title">
          <div className="w-full max-w-md rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-elevated)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="pay-card-title" className="text-xl font-extrabold text-[var(--foreground)]">Pagar fatura</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {logicalLabel(payingStatement.closingDate)} · {money(payingStatement.total)}
                </p>
              </div>
              <button ref={paymentCloseRef} type="button" onClick={closePayment} className="grid h-10 w-10 place-items-center rounded-full text-[var(--text-muted)]" aria-label="Fechar">
                <FaTimes aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[var(--foreground)]">Conta pagadora</span>
                <select
                  value={sourceAccountId}
                  onChange={(event) => {
                    setSourceAccountId(event.target.value);
                    setPaymentKey(globalThis.crypto.randomUUID());
                  }}
                  disabled={isPaying || loadingPaymentAccounts}
                  className="ds-control min-h-12 w-full px-3"
                >
                  <option value="">Selecione</option>
                  {paymentAccounts.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} · {candidate.currency}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[var(--foreground)]">Data do pagamento</span>
                <input
                  type="date"
                  value={paymentDate}
                  min={logicalIso(payingStatement.closingDate)}
                  max={localIsoDate()}
                  onChange={(event) => {
                    setPaymentDate(event.target.value);
                    setPaymentKey(globalThis.crypto.randomUUID());
                  }}
                  disabled={isPaying}
                  className="ds-control min-h-12 w-full px-3"
                />
              </label>

              {paymentAccountsError ? (
                <div className="rounded-[12px] border border-[var(--danger)]/35 bg-[var(--danger-subtle)] p-3 text-sm">
                  <p className="font-semibold text-[var(--expense)]">{paymentAccountsError}</p>
                  <button
                    type="button"
                    onClick={() => void loadPaymentAccounts()}
                    disabled={loadingPaymentAccounts}
                    className="mt-2 min-h-9 rounded-full border border-[var(--border-strong)] px-3 font-bold text-[var(--foreground)]"
                  >
                    {loadingPaymentAccounts ? 'Carregando...' : 'Tentar novamente'}
                  </button>
                </div>
              ) : paymentAccounts.length === 0 && !loadingPaymentAccounts ? (
                <p className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm text-[var(--text-muted)]">
                  Cadastre uma conta ativa em {account.currency} para registrar o pagamento.
                </p>
              ) : null}

              {paymentError && (
                <p role="alert" className="text-sm font-semibold text-[var(--expense)]">
                  {paymentError}
                </p>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" onClick={closePayment} disabled={isPaying} className="min-h-12 rounded-full border border-[var(--border-strong)] font-bold text-[var(--foreground)]">
                Cancelar
              </button>
              <button type="button" onClick={() => void payStatement()} disabled={isPaying || loadingPaymentAccounts || Boolean(paymentAccountsError) || !sourceAccountId} className="min-h-12 rounded-full bg-[var(--orbit-primary)] font-extrabold text-white disabled:opacity-50">
                {isPaying ? 'Pagando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-white/60">{label}</p>
      <p className="mt-1 text-xl font-extrabold">{value}</p>
    </div>
  );
}

function StatementCard({
  title,
  statement,
  currency,
  showValues,
  onPay,
  emphasize = false,
}: {
  title: string;
  statement: CreditCardStatementItem;
  currency: string;
  showValues: boolean;
  onPay: (statement: CreditCardStatementItem) => void;
  emphasize?: boolean;
}) {
  const money = showValues ? formatCurrency(statement.total, currency) : '••••';
  return (
    <section className={emphasize ? 'ds-panel border-[var(--orbit-primary)] p-5' : 'ds-panel p-5'}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[var(--orbit-primary)]">{title}</p>
          <h3 className="mt-1 text-2xl font-extrabold text-[var(--foreground)]">{money}</h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Fecha {logicalLabel(statement.closingDate)} · vence {logicalLabel(statement.dueDate)}
          </p>
        </div>
        <span className={statement.status === 'PAID'
          ? 'rounded-full bg-[var(--primary-subtle)] px-3 py-1 text-xs font-bold text-[var(--income)]'
          : 'rounded-full bg-[var(--surface-raised)] px-3 py-1 text-xs font-bold text-[var(--text-muted)]'}>
          {statement.status === 'PAID' ? 'Paga' : 'Em aberto'}
        </span>
      </div>

      {statement.transactions.length > 0 && (
        <div className="mt-5 divide-y divide-[var(--border)] border-t border-[var(--border)]">
          {statement.transactions.slice(0, 5).map((transaction) => {
            const isCredit = transaction.type === 'INCOME';
            return (
              <Link key={transaction.id} href={`/transacoes/show/${transaction.id}`} className="flex min-h-14 items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-[var(--foreground)]">{transaction.description}</span>
                  {isCredit && (
                    <span className="mt-0.5 block text-xs font-semibold text-[var(--income)]">
                      Crédito/estorno · reduz a fatura
                    </span>
                  )}
                </span>
                <span className={`flex shrink-0 items-center gap-2 font-bold ${isCredit ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
                  {showValues
                    ? `${isCredit ? '−' : ''}${formatCurrency(transaction.amount, currency)}`
                    : '••••'}
                  <FaChevronRight className="text-[var(--text-muted)]" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {statement.status === 'OPEN' && statement.total > 0 && compareStatementToToday(statement) <= 0 && (
        <button type="button" onClick={() => onPay(statement)} className="mt-4 min-h-11 rounded-full bg-[var(--orbit-primary)] px-4 text-sm font-bold text-white">
          Pagar fatura
        </button>
      )}
    </section>
  );
}

function CompactStatement({
  statement,
  currency,
  showValues,
}: {
  statement: CreditCardStatementItem;
  currency: string;
  showValues: boolean;
}) {
  return (
    <div className="flex min-h-20 items-center justify-between gap-4 px-5 py-3">
      <div>
        <p className="font-bold text-[var(--foreground)]">
          Fecha {logicalLabel(statement.closingDate)}
        </p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {statement.transactionCount} lançamento{statement.transactionCount === 1 ? '' : 's'}
        </p>
      </div>
      <strong className="text-right text-[var(--foreground)]">
        {showValues ? formatCurrency(statement.total, currency) : '••••'}
      </strong>
    </div>
  );
}

function compareStatementToToday(statement: CreditCardStatementItem) {
  return logicalIso(statement.closingDate).localeCompare(localIsoDate());
}
