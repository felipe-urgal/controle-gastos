'use client';

import { ShowBelow } from '@/app/components/ui';
import { Button, Chip, Input, Select } from '@/app/components/ui';
import {
  closingDistanceLabel,
  dueDistanceLabel,
  isPayableStatement,
  limitTone,
  pickStatementToPay,
  usagePercent,
} from '@/app/components/pages/account/show/credit-card-overview/card-show-model';
import { appBarTitleClassName } from '@/app/components/base-pages/page-title';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronRight,
  FaCreditCard,
  FaPen,
} from 'react-icons/fa';

import { ModalShell } from '@/app/components/overlays/modal-shell';
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

function localLogicalDate() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

type CardTab = 'current' | 'future' | 'history';

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
  const [tab, setTab] = useState<CardTab>('current');

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
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

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
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => {
            setLoading(true);
            setError(null);
            void load();
          }}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  const today = localLogicalDate();
  const toPay = pickStatementToPay(data, today);
  const focus = toPay ?? data.current;
  const percent = usagePercent(data.card);
  const tone = limitTone(data.card);
  const meterTone = { ok: 'bg-[var(--orbit-primary)]', near: 'bg-[var(--warning)]', over: 'bg-[var(--expense)]' } as const;
  const tabs: Array<{ key: CardTab; label: string }> = [
    { key: 'current', label: 'Fatura atual' },
    ...(data.future.length > 0 ? [{ key: 'future' as const, label: 'Próximas faturas' }] : []),
    { key: 'history', label: 'Histórico de faturas' },
  ];

  return (
    <div className={`w-full space-y-4 pb-5 transition-opacity ${isDeleting ? 'pointer-events-none opacity-50' : ''}`}>
      <ShowBelow breakpoint="lg">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={backUrl}
            aria-label="Voltar para contas"
            className="grid h-11 w-11 place-items-center rounded-full text-[var(--foreground)]"
          >
            <FaArrowLeft aria-hidden="true" />
          </Link>
          <h1 className={`text-center ${appBarTitleClassName}`}>
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
      </ShowBelow>

      <section
        aria-label="Resumo do cartão"
        className="grid gap-5 rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--account-color)_38%,var(--border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--account-color)_15%,var(--surface)),var(--surface)_70%)] p-4 shadow-[var(--shadow-surface)] sm:p-5"
        style={{ ['--account-color' as string]: account.color || 'var(--orbit-primary)' }}
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3.5">
          <span className="grid h-12 w-12 place-items-center rounded-[var(--radius-lg)] text-white" style={{ backgroundColor: account.color || 'var(--orbit-primary)' }} aria-hidden="true">
            <FaCreditCard />
          </span>
          <div className="min-w-0">
            <h2 className="break-words text-xl font-bold tracking-tight">{account.name}</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Fecha dia {data.card.statementClosingDay} · vence dia {data.card.statementDueDay} · {account.currency}
            </p>
          </div>
        </div>

        <div className="grid items-end gap-5 md:grid-cols-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-muted)]">
              {toPay ? `Fatura para pagar · ${dueDistanceLabel(toPay.dueDate, today)}` : `Fatura atual · ${closingDistanceLabel(data.current.closingDate, today)}`}
            </p>
            <strong className="money mt-1 block break-words text-4xl font-semibold leading-none tracking-[-0.035em] text-[var(--foreground)] sm:text-5xl">
              {money(focus.total)}
            </strong>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Fecha {logicalLabel(focus.closingDate)} · vence {logicalLabel(focus.dueDate)}
            </p>
          </div>

          <div className="grid gap-2">
            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]" role="img" aria-label={`${percent}% do limite usado`}>
              <div className={`h-full rounded-full ${meterTone[tone]}`} style={{ width: `${percent}%` }} />
            </div>
            <dl className="grid gap-1 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-[var(--text-muted)]">Limite total</dt><dd className="money font-semibold">{money(data.card.creditLimit)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[var(--text-muted)]">Em uso</dt><dd className="money font-semibold">{money(data.card.usedLimit)} <span className="font-normal text-[var(--text-muted)]">({percent}%)</span></dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[var(--text-muted)]">Disponível</dt><dd className="money font-semibold">{money(data.card.availableLimit)}</dd></div>
              {data.card.overLimit > 0 && (
                <div className="flex justify-between gap-3 text-[var(--expense)]"><dt>Excedido em</dt><dd className="money font-semibold">{money(data.card.overLimit)}</dd></div>
              )}
            </dl>
          </div>
        </div>

        <nav aria-label="Ações do cartão" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {toPay ? (
            <Button type="button" size="xs" className="w-full" onClick={() => openPayment(toPay)}>
              Pagar fatura
            </Button>
          ) : (
            <Button as="a" href="/transacoes/nova" size="xs" className="w-full">
              Lançar compra
            </Button>
          )}
          {toPay && (
            <Button as="a" href="/transacoes/nova" variant="outline" size="xs" className="w-full">
              Lançar compra
            </Button>
          )}
          <Button as="a" href={`/transacoes?accountId=${encodeURIComponent(account.id)}`} variant="outline" size="xs" className="w-full">
            Compras
          </Button>
          <Button as="a" href={editUrl} variant="outline" size="xs" className="w-full">
            Editar
          </Button>
        </nav>
      </section>

      <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex flex-wrap gap-2 px-4 pb-3 pt-4 sm:px-5" role="group" aria-label="Faturas">
          {tabs.map((item) => (
            <Chip key={item.key} selected={tab === item.key} onClick={() => setTab(item.key)}>
              {item.label}
            </Chip>
          ))}
        </div>

        {tab === 'current' && (
          <CurrentStatementPanel
            statement={data.current}
            accountId={account.id}
            currency={account.currency}
            showValues={showValues}
            payable={isPayableStatement(data.current, today)}
            onPay={openPayment}
          />
        )}

        {tab === 'future' && (
          <div className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
            {data.future.map((statement) => (
              <CompactStatement
                key={logicalIso(statement.closingDate)}
                statement={statement}
                currency={account.currency}
                showValues={showValues}
              />
            ))}
          </div>
        )}

        {tab === 'history' && (
          <div className="border-t border-[var(--border)]">
            {data.history.length === 0 ? (
              <p className="px-5 py-6 text-sm text-[var(--text-muted)]">Nenhuma fatura anterior.</p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {data.history.map((statement) => (
                  <div key={logicalIso(statement.closingDate)} className="px-4 py-4 sm:px-5">
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
                          <span className="money">{money(statement.total)}</span>
                        </p>
                        <span className={statement.status === 'PAID'
                          ? 'mt-1 inline-flex items-center gap-1 text-xs font-bold text-[var(--income)]'
                          : 'mt-1 inline-flex items-center gap-1 text-xs font-bold text-[var(--expense)]'}>
                          {statement.status === 'PAID' ? <FaCheckCircle aria-hidden="true" /> : <FaCalendarAlt aria-hidden="true" />}
                          {statement.status === 'PAID' ? 'Paga' : 'Em aberto'}
                        </span>
                      </div>
                    </div>
                    {isPayableStatement(statement, today) && (
                      <Button variant="outline" size="sm" className="mt-3" type="button" onClick={() => openPayment(statement)}>
                        Pagar esta fatura
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <details className="group rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
        <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm text-[var(--text-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:px-5 [&::-webkit-details-marker]:hidden">
          Zona de risco
        </summary>
        <div className="grid gap-3 px-4 pb-4 text-sm text-[var(--text-muted)] sm:px-5">
          <p>Inativar guarda o histórico e tira o cartão dos lançamentos novos. Excluir só é possível quando o cartão não tem movimentações.</p>
          <div className="flex flex-wrap gap-2">
            <Button as="a" href={editUrl} variant="outline" size="sm">Inativar cartão</Button>
            <Button type="button" variant="danger" size="sm" onClick={onDeleteRequest}>Excluir cartão</Button>
          </div>
        </div>
      </details>

      {payingStatement && (
        <ModalShell
          title="Pagar fatura"
          description={`${logicalLabel(payingStatement.closingDate)} · ${money(payingStatement.total)}`}
          onClose={closePayment}
          closeDisabled={isPaying}
          maxWidthClass="max-w-md"
          footer={
    <div className="grid grid-cols-2 gap-3">
      <Button variant="outline" size="lg" onClick={closePayment} disabled={isPaying}>
        Cancelar
      </Button>
      <Button size="lg" onClick={() => void payStatement()} disabled={isPaying || loadingPaymentAccounts || Boolean(paymentAccountsError) || !sourceAccountId}>
        {isPaying ? 'Pagando...' : 'Confirmar'}
      </Button>
    </div>
          }
        >
        <div className="mt-5 space-y-4">
          <Select
            label="Conta pagadora"
            value={sourceAccountId}
            onChange={(value) => {
              setSourceAccountId(String(value));
              setPaymentKey(globalThis.crypto.randomUUID());
            }}
            disabled={isPaying || loadingPaymentAccounts}
            placeholder="Selecione"
            options={paymentAccounts.map((candidate) => ({
              value: candidate.id,
              label: `${candidate.name} · ${candidate.currency}`,
            }))}
          />

          <Input
            label="Data do pagamento"
            type="date"
            value={paymentDate}
            min={logicalIso(payingStatement.closingDate)}
            max={localIsoDate()}
            onChange={(event) => {
              setPaymentDate(event.target.value);
              setPaymentKey(globalThis.crypto.randomUUID());
            }}
            disabled={isPaying}
          />

          {paymentAccountsError ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--danger)]/35 bg-[var(--danger-subtle)] p-3 text-sm">
              <p className="font-semibold text-[var(--expense)]">{paymentAccountsError}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => void loadPaymentAccounts()}
                disabled={loadingPaymentAccounts}
              >
                {loadingPaymentAccounts ? 'Carregando...' : 'Tentar novamente'}
              </Button>
            </div>
          ) : paymentAccounts.length === 0 && !loadingPaymentAccounts ? (
            <p className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm text-[var(--text-muted)]">
              Cadastre uma conta ativa em {account.currency} para registrar o pagamento.
            </p>
          ) : null}

          {paymentError && (
            <p role="alert" className="text-sm font-semibold text-[var(--expense)]">
              {paymentError}
            </p>
          )}
        </div>
        </ModalShell>
      )}
    </div>
  );
}

function CurrentStatementPanel({
  statement,
  accountId,
  currency,
  showValues,
  payable,
  onPay,
}: {
  statement: CreditCardStatementItem;
  accountId: string;
  currency: string;
  showValues: boolean;
  payable: boolean;
  onPay: (statement: CreditCardStatementItem) => void;
}) {
  const visible = statement.transactions.slice(0, 8);

  return (
    <div className="border-t border-[var(--border)]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
        <p className="text-sm text-[var(--text-muted)]">
          Fecha {logicalLabel(statement.closingDate)} · vence {logicalLabel(statement.dueDate)} · {statement.transactionCount} {statement.transactionCount === 1 ? 'compra' : 'compras'}
        </p>
        <span className={statement.status === 'PAID' ? 'text-xs font-bold text-[var(--income)]' : 'text-xs font-bold text-[var(--text-muted)]'}>
          {statement.status === 'PAID' ? 'Paga' : 'Em aberto'}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="px-4 pb-5 text-sm text-[var(--text-muted)] sm:px-5">Nenhuma compra nesta fatura ainda.</p>
      ) : (
        <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
          {visible.map((transaction) => {
            const isCredit = transaction.type === 'INCOME';
            return (
              <li key={transaction.id}>
                <Link href={`/transacoes/show/${transaction.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:px-5">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-[var(--foreground)]">{transaction.description}</span>
                    <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                      {String(transaction.day).padStart(2, '0')}/{String(transaction.month).padStart(2, '0')}
                      {isCredit ? ' · crédito/estorno, reduz a fatura' : ''}
                    </span>
                  </span>
                  <span className={`money flex shrink-0 items-center gap-2 font-semibold ${isCredit ? 'text-[var(--income)]' : 'text-[var(--foreground)]'}`}>
                    {showValues ? `${isCredit ? '−' : ''}${formatCurrency(transaction.amount, currency)}` : '••••'}
                    <FaChevronRight className="text-[var(--text-muted)]" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-3 sm:px-5">
        <Link href={`/transacoes?accountId=${encodeURIComponent(accountId)}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--orbit-primary)]">
          {statement.transactionCount > visible.length ? 'Ver todas as compras' : 'Ver no extrato'}
        </Link>
        {payable && (
          <Button variant="outline" size="sm" type="button" onClick={() => onPay(statement)}>
            Pagar esta fatura
          </Button>
        )}
      </div>
    </div>
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
        <span className="money">{showValues ? formatCurrency(statement.total, currency) : '••••'}</span>
      </strong>
    </div>
  );
}
