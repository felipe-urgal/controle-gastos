'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/app/context';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { monthlyClosingService } from '@/app/services/monthly-closing-service';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type {
  MonthlyClosingCardStatementState,
  MonthlyClosingData,
  MonthlyClosingLogicalDate,
  MonthlyClosingReconciliationStatus,
} from '@/app/types/monthly-closing';

const CURRENCIES: SupportedCurrency[] = ['BRL', 'USD', 'EUR'];

const PERIOD_STATUS_LABELS = {
  IN_PROGRESS: 'Em andamento',
  REVIEWABLE: 'Pronto para revisão',
  FUTURE: 'Período futuro',
} as const;

const RECONCILIATION_LABELS: Record<
  MonthlyClosingReconciliationStatus,
  string
> = {
  RECONCILED: 'Reconciliada até o fim do período',
  PARTIAL: 'Reconciliação parcial',
  NEVER_RECONCILED: 'Nunca reconciliada',
  UNRECONCILED_ITEMS: 'Possui lançamentos não reconciliados',
};

const CARD_STATE_LABELS: Record<MonthlyClosingCardStatementState, string> = {
  PAID: 'Paga',
  OPEN: 'Em aberto',
  OVERDUE: 'Vencida',
};

function displayMoney(
  amount: number,
  currency: SupportedCurrency,
  showValues: boolean,
) {
  return showValues ? formatCurrency(amount, currency) : '••••';
}

function periodValue(year: number, month: number) {
  return String(year) + '-' + String(month).padStart(2, '0');
}

function formatLogicalDate(date: MonthlyClosingLogicalDate) {
  return (
    String(date.day).padStart(2, '0') +
    '/' +
    String(date.month).padStart(2, '0') +
    '/' +
    String(date.year)
  );
}

export default function MonthlyClosingPage() {
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [currency, setCurrency] = useState<SupportedCurrency>('BRL');
  const [result, setResult] = useState<{
    key: string;
    data: MonthlyClosingData;
  } | null>(null);
  const [failure, setFailure] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const queryKey = periodValue(year, month) + ':' + currency;
  const data = result?.key === queryKey ? result.data : null;
  const error = failure?.key === queryKey ? failure.message : null;
  const loading = data === null && error === null;

  useEffect(() => {
    let active = true;
    const requestKey = queryKey;

    monthlyClosingService
      .get({ year, month, currency })
      .then((response) => {
        if (!active) return;
        setResult({ key: requestKey, data: response.data });
        setFailure(null);
      })
      .catch((cause) => {
        if (!active) return;
        setFailure({
          key: requestKey,
          message:
            cause instanceof Error
              ? cause.message
              : 'Erro ao carregar fechamento',
        });
      });

    return () => {
      active = false;
    };
  }, [currency, month, queryKey, reloadToken, year]);

  function handlePeriod(value: string) {
    const [nextYear, nextMonth] = value.split('-').map(Number);
    if (Number.isInteger(nextYear) && Number.isInteger(nextMonth)) {
      setYear(nextYear);
      setMonth(nextMonth);
    }
  }

  function retry() {
    setResult(null);
    setFailure(null);
    setReloadToken((current) => current + 1);
  }

  const retrospective = data?.retrospective ?? null;
  const transactionsHref =
    '/transacoes?year=' + year + '&month=' + month;
  const pendingHref = transactionsHref + '&status=PENDING';
  const isEmpty =
    retrospective?.summary.income === 0 &&
    retrospective.summary.expense === 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--orbit-primary)]">
            Revisão mensal
          </p>
          <h1 className="mt-1 text-2xl font-black text-[var(--foreground)] sm:text-3xl">
            Fechamento mensal
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
            Retrospectiva calculada a partir dos dados financeiros atuais.
            Alterações retroativas podem mudar esta revisão.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            aria-label="Período do fechamento"
            type="month"
            max={periodValue(currentYear, currentMonth)}
            value={periodValue(year, month)}
            onChange={(event) => handlePeriod(event.target.value)}
            className="ds-control min-h-11 bg-[var(--surface)] px-3 text-[var(--foreground)]"
          />
          <select
            aria-label="Moeda"
            value={currency}
            onChange={(event) =>
              setCurrency(event.target.value as SupportedCurrency)
            }
            className="ds-control min-h-11 bg-[var(--surface)] px-3 text-[var(--foreground)]"
          >
            {CURRENCIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </header>

      {loading && (
        <div
          role="status"
          className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--text-muted)]"
        >
          Carregando revisão do período…
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-[var(--danger)] bg-[var(--danger-subtle)] p-4 text-[var(--expense)]"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-current px-4 text-sm font-bold"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {data && (
        <div className="mt-5 space-y-5">
          <section className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Status do período
              </p>
              <p className="mt-1 font-bold text-[var(--foreground)]">
                {PERIOD_STATUS_LABELS[data.status]}
              </p>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              Dados recalculados com referência em {formatLogicalDate(data.asOf)}.
            </p>
          </section>

          {data.status === 'FUTURE' && (
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <h2 className="text-lg font-bold text-[var(--foreground)]">
                Este período ainda é futuro
              </h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Fechamento é uma retrospectiva. Use Planejamento e Compromissos
                para consultar projeções futuras.
              </p>
              <Link
                href="/compromissos"
                className="mt-4 inline-flex min-h-11 items-center font-bold text-[var(--orbit-primary)]"
              >
                Ver compromissos
              </Link>
            </section>
          )}

          {retrospective && (
            <>
              {isEmpty && (
                <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                  <h2 className="font-bold text-[var(--foreground)]">
                    Sem movimentação realizada
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Não há receitas ou despesas realizadas nesta moeda para o período.
                    Pendências e sinais de conferência continuam listados abaixo.
                  </p>
                </section>
              )}

              <section className="grid gap-3 md:grid-cols-3">
                {[
                  {
                    label: 'Receitas realizadas',
                    amount: retrospective.summary.income,
                  },
                  {
                    label: 'Despesas realizadas',
                    amount: retrospective.summary.expense,
                  },
                  {
                    label: 'Resultado financeiro',
                    amount: retrospective.summary.balance,
                  },
                ].map((item) => (
                  <article
                    key={item.label}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
                  >
                    <p className="text-sm text-[var(--text-muted)]">
                      {item.label}
                    </p>
                    <strong className="mt-2 block text-2xl text-[var(--foreground)]">
                      {displayMoney(item.amount, currency, showValues)}
                    </strong>
                  </article>
                ))}
              </section>

              <p className="text-xs text-[var(--text-muted)]">
                Resultado financeiro reconhece compras de cartão no período da compra;
                pagamento da fatura não é contado como uma nova despesa e este valor
                não representa, por si só, variação de caixa.
              </p>

              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--foreground)]">
                      Prontidão da revisão
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      Conferências informativas: nada aqui bloqueia alterações no mês.
                    </p>
                  </div>
                  <strong className="text-sm text-[var(--foreground)]">
                    {retrospective.readiness.status === 'READY'
                      ? 'Sem pendências conhecidas'
                      : 'Há itens para revisar'}
                  </strong>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  <article className="rounded-xl bg-[var(--surface-raised)] p-4">
                    <h3 className="font-bold text-[var(--foreground)]">
                      Lançamentos pendentes
                    </h3>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      {retrospective.readiness.pendingTransactions.totalCount === 0
                        ? 'Nenhum lançamento pendente no período.'
                        : retrospective.readiness.pendingTransactions.totalCount +
                          ' lançamento(ões) ainda pendente(s).'}
                    </p>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-[var(--text-muted)]">
                          Receitas
                        </dt>
                        <dd className="font-semibold text-[var(--foreground)]">
                          {displayMoney(
                            retrospective.readiness.pendingTransactions.income.amount,
                            currency,
                            showValues,
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-[var(--text-muted)]">
                          Despesas
                        </dt>
                        <dd className="font-semibold text-[var(--foreground)]">
                          {displayMoney(
                            retrospective.readiness.pendingTransactions.expense.amount,
                            currency,
                            showValues,
                          )}
                        </dd>
                      </div>
                    </dl>
                    <Link
                      href={pendingHref}
                      className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-[var(--orbit-primary)]"
                    >
                      Revisar pendências
                    </Link>
                  </article>

                  <article className="rounded-xl bg-[var(--surface-raised)] p-4">
                    <h3 className="font-bold text-[var(--foreground)]">
                      Reconciliação
                    </h3>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      {retrospective.readiness.reconciliation.accountCount === 0
                        ? 'Nenhuma conta com lançamentos concluídos exige conferência.'
                        : retrospective.readiness.reconciliation.reconciledCount +
                          ' de ' +
                          retrospective.readiness.reconciliation.accountCount +
                          ' conta(s) cobrem o fim do período.'}
                    </p>
                    <div className="mt-3 space-y-2">
                      {retrospective.readiness.reconciliation.accounts.map(
                        (account) => (
                          <Link
                            key={account.accountId}
                            href={account.href}
                            className="flex min-h-11 flex-col justify-center rounded-lg border border-[var(--border)] px-3 hover:bg-[var(--surface-hover)]"
                          >
                            <span className="text-sm font-semibold text-[var(--foreground)]">
                              {account.accountName}
                            </span>
                            <span className="text-xs text-[var(--text-muted)]">
                              {RECONCILIATION_LABELS[account.status]}
                              {account.unreconciledCount > 0
                                ? ' · ' +
                                  account.unreconciledCount +
                                  ' não reconciliado(s)'
                                : ''}
                            </span>
                          </Link>
                        ),
                      )}
                    </div>
                  </article>

                  <article className="rounded-xl bg-[var(--surface-raised)] p-4">
                    <h3 className="font-bold text-[var(--foreground)]">
                      Faturas do período
                    </h3>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      {retrospective.readiness.cardStatements.count === 0
                        ? 'Nenhuma fatura com valor a revisar neste período.'
                        : retrospective.readiness.cardStatements.openCount +
                          ' em aberto · ' +
                          retrospective.readiness.cardStatements.overdueCount +
                          ' vencida(s).'}
                    </p>
                    <div className="mt-3 space-y-2">
                      {retrospective.readiness.cardStatements.items.map(
                        (statement) => (
                          <Link
                            key={
                              statement.cardId +
                              '-' +
                              periodValue(
                                statement.closingDate.year,
                                statement.closingDate.month,
                              )
                            }
                            href={statement.href}
                            className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 hover:bg-[var(--surface-hover)]"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
                                {statement.cardName}
                              </span>
                              <span className="block text-xs text-[var(--text-muted)]">
                                Vence {formatLogicalDate(statement.dueDate)} ·{' '}
                                {CARD_STATE_LABELS[statement.state]}
                              </span>
                            </span>
                            <span className="shrink-0 text-sm font-semibold text-[var(--foreground)]">
                              {displayMoney(
                                statement.amount,
                                currency,
                                showValues,
                              )}
                            </span>
                          </Link>
                        ),
                      )}
                    </div>
                  </article>
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                  <h2 className="text-lg font-bold text-[var(--foreground)]">
                    Planejamento
                  </h2>
                  <dl className="mt-4 grid gap-3">
                    {[
                      {
                        label: 'Orçado',
                        amount: retrospective.planning.budget,
                      },
                      {
                        label: 'Realizado',
                        amount: retrospective.planning.realized,
                      },
                      {
                        label:
                          data.status === 'REVIEWABLE'
                            ? 'Despesa ainda pendente'
                            : 'Comprometido',
                        amount: retrospective.planning.committed,
                      },
                      {
                        label: 'Disponível',
                        amount: retrospective.planning.available,
                      },
                      {
                        label:
                          data.status === 'REVIEWABLE'
                            ? 'Receita ainda pendente'
                            : 'Receita esperada',
                        amount: retrospective.planning.expectedIncome,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-2 last:border-0"
                      >
                        <dt className="text-sm text-[var(--text-muted)]">
                          {item.label}
                        </dt>
                        <dd className="font-semibold text-[var(--foreground)]">
                          {displayMoney(item.amount, currency, showValues)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </article>

                <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                  <h2 className="text-lg font-bold text-[var(--foreground)]">
                    Patrimônio
                  </h2>
                  {retrospective.netWorth ? (
                    <dl className="mt-4 grid gap-3">
                      <div className="flex justify-between gap-4">
                        <dt className="text-[var(--text-muted)]">
                          Mês anterior
                        </dt>
                        <dd className="font-semibold">
                          {displayMoney(
                            retrospective.netWorth.previous,
                            currency,
                            showValues,
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[var(--text-muted)]">
                          Fim do período
                        </dt>
                        <dd className="font-semibold">
                          {displayMoney(
                            retrospective.netWorth.current,
                            currency,
                            showValues,
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-[var(--border)] pt-3">
                        <dt className="font-semibold">Variação</dt>
                        <dd className="font-black">
                          {displayMoney(
                            retrospective.netWorth.difference,
                            currency,
                            showValues,
                          )}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-4 text-sm text-[var(--text-muted)]">
                      Ainda não há dois pontos comparáveis de patrimônio nessa
                      moeda para calcular a variação.
                    </p>
                  )}
                  <p className="mt-4 text-xs text-[var(--text-muted)]">
                    {retrospective.netWorthMethodology.description}
                  </p>
                </article>
              </section>

              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg font-bold text-[var(--foreground)]">
                    Maiores categorias
                  </h2>
                  <Link
                    href={transactionsHref}
                    className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--orbit-primary)]"
                  >
                    Ver transações
                  </Link>
                </div>
                {retrospective.topCategories.length === 0 ? (
                  <p className="mt-4 text-sm text-[var(--text-muted)]">
                    Nenhuma despesa realizada no período.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-2">
                    {retrospective.topCategories.map((category) => (
                      <Link
                        key={category.id}
                        href={
                          transactionsHref +
                          '&categoryId=' +
                          encodeURIComponent(category.id)
                        }
                        className="flex min-h-12 items-center justify-between gap-4 rounded-xl border border-[var(--border)] px-4 hover:bg-[var(--surface-hover)]"
                      >
                        <span className="min-w-0 truncate font-semibold text-[var(--foreground)]">
                          {category.name}
                        </span>
                        <span className="shrink-0 text-sm text-[var(--text-muted)]">
                          {displayMoney(
                            category.realized,
                            currency,
                            showValues,
                          )}{' '}
                          · {category.sharePercentage}%
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <h2 className="text-lg font-bold text-[var(--foreground)]">
                  Comparação com o mês anterior
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      label: 'Receitas',
                      metric: retrospective.comparison.income,
                    },
                    {
                      label: 'Despesas',
                      metric: retrospective.comparison.expense,
                    },
                    {
                      label: 'Resultado',
                      metric: retrospective.comparison.balance,
                    },
                  ].map(({ label, metric }) => (
                    <div
                      key={label}
                      className="rounded-xl bg-[var(--surface-raised)] p-4"
                    >
                      <p className="text-xs text-[var(--text-muted)]">
                        {label}
                      </p>
                      <strong className="mt-1 block text-[var(--foreground)]">
                        {displayMoney(
                          metric.difference,
                          currency,
                          showValues,
                        )}
                      </strong>
                      <span className="text-xs text-[var(--text-muted)]">
                        {metric.percentage === null
                          ? 'Sem base comparável'
                          : (metric.percentage > 0 ? '+' : '') +
                            metric.percentage +
                            '%'}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}
