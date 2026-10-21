'use client';

import { PageContainer } from '@/app/components/base-pages';
import { pageTitleClassName } from '@/app/components/base-pages/page-title';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { FaChevronRight } from 'react-icons/fa';

import { PageEmpty, PageLoading } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import { ModalShell } from '@/app/components/overlays/modal-shell';
import { Button, Chip, ChipRow, Input, Select } from '@/app/components/ui';
import { useAuth } from '@/app/context';

import { exchangeRateService } from '@/app/services/exchange-rate-service';
import { netWorthService } from '@/app/services/net-worth-service';
import type { ExchangeRateModel } from '@/app/types/exchange-rate';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { NetWorthData } from '@/app/types/net-worth';
import { currencies, currentIsoDate, currentPeriod, decimalRateToRatio, logicalDateLabel, parsePeriodInput, periodInputValue, refreshFailureMessage } from '@/app/components/pages/net-worth/net-worth-page/net-worth-helpers';
import { ConsolidationCard, DistributionCard, HistoryCard, LiabilitiesCard, NetWorthHero, RealReturnCard } from '@/app/components/pages/net-worth/net-worth-page/net-worth-cards';
import { ExchangeRatesCard } from '@/app/components/pages/net-worth/net-worth-page/exchange-rates-card';

export default function NetWorthPage() {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;

  const [{ year, month }, setEndPeriod] = useState(currentPeriod);
  const [months, setMonths] = useState(12);
  const [data, setData] = useState<NetWorthData | null>(null);
  const [selectedCurrency, setSelectedCurrency] =
    useState<SupportedCurrency>('BRL');
  const [baseCurrency, setBaseCurrency] = useState<SupportedCurrency | ''>('');
  const [rates, setRates] = useState<ExchangeRateModel[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesMoreLoading, setRatesMoreLoading] = useState(false);
  const [ratePage, setRatePage] = useState(1);
  const [rateHasMore, setRateHasMore] = useState(false);
  const [rateTotal, setRateTotal] = useState(0);
  const [rateFilterFrom, setRateFilterFrom] = useState<SupportedCurrency | ''>('');
  const [rateFilterTo, setRateFilterTo] = useState<SupportedCurrency | ''>('');
  const [rateSourceTab, setRateSourceTab] =
    useState<ExchangeRateModel['source']>('MANUAL');
  const [rateError, setRateError] = useState('');
  const [rateNotice, setRateNotice] = useState('');
  // Mutação concluída cujo refresh ainda não confirmou: falha de GET não vira falha de POST/DELETE.
  const pendingMutationRef = useRef<string | null>(null);
  const [rateSaving, setRateSaving] = useState(false);
  const [rateFetchingPtax, setRateFetchingPtax] = useState(false);
  const [rateFrom, setRateFrom] = useState<SupportedCurrency>('USD');
  const [rateTo, setRateTo] = useState<SupportedCurrency>('BRL');
  const [rateValue, setRateValue] = useState('');
  const [rateDate, setRateDate] = useState(currentIsoDate);
  const [coreNonce, setCoreNonce] = useState(0);
  const [ratesNonce, setRatesNonce] = useState(0);
  const [consolidationNonce, setConsolidationNonce] = useState(0);
  const [ratePendingDelete, setRatePendingDelete] =
    useState<ExchangeRateModel | null>(null);
  const [rateDeleteLoading, setRateDeleteLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void netWorthService
      .get({
        year,
        month,
        months,
        includeRealEvolution: true,
      })
      .then((response) => {
        if (cancelled) return;
        setData(response.data);
        setError('');
        const firstAvailable = currencies.find((currency) =>
          response.data.byCurrency.some((item) => item.currency === currency),
        );
        if (firstAvailable) {
          setSelectedCurrency((current) =>
            response.data.byCurrency.some((item) => item.currency === current)
              ? current
              : firstAvailable,
          );
        }
      })
      .catch((requestError) => {
        if (cancelled) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Não foi possível carregar o patrimônio',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [coreNonce, month, months, year]);

  useEffect(() => {
    let cancelled = false;

    if (!baseCurrency) {
      return () => {
        cancelled = true;
      };
    }

    void netWorthService
      .get({
        year,
        month,
        months: 1,
        baseCurrency,
      })
      .then((response) => {
        if (cancelled) return;
        setData((current) =>
          current
            ? { ...current, consolidation: response.data.consolidation }
            : response.data,
        );
      })
      .catch((requestError) => {
        if (!cancelled) {
          setRateError(
            refreshFailureMessage(
              pendingMutationRef.current,
              'a consolidação não foi recalculada',
            ) ??
              (requestError instanceof Error
                ? requestError.message
                : 'Não foi possível recalcular a consolidação cambial'),
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [baseCurrency, consolidationNonce, month, year]);

  useEffect(() => {
    let cancelled = false;
    void exchangeRateService
      .getAll({
        page: 1,
        limit: 10,
        ...(rateFilterFrom ? { from: rateFilterFrom } : {}),
        ...(rateFilterTo ? { to: rateFilterTo } : {}),
        source: rateSourceTab,
      })
      .then((response) => {
        if (cancelled) return;
        pendingMutationRef.current = null;
        setRates(response.data.items);
        setRatePage(response.data.page);
        setRateHasMore(response.data.hasMore);
        setRateTotal(response.data.total);
        setRateError('');
      })
      .catch((requestError) => {
        if (!cancelled) {
          setRateError(
            refreshFailureMessage(
              pendingMutationRef.current,
              'a lista não foi atualizada',
            ) ??
              (requestError instanceof Error
                ? requestError.message
                : 'Não foi possível carregar as taxas de câmbio'),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setRatesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rateFilterFrom, rateFilterTo, rateSourceTab, ratesNonce]);

  async function handleRateSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRateError('');
    setRateNotice('');

    if (rateFrom === rateTo) {
      setRateError('Escolha moedas diferentes para a taxa.');
      return;
    }

    const ratio = decimalRateToRatio(rateValue);
    if (!ratio) {
      setRateError('Informe uma taxa positiva com até 6 casas decimais.');
      return;
    }

    if (rateDate > currentIsoDate()) {
      setRateError('A data de referência não pode ser futura.');
      return;
    }

    const [dateYear, dateMonth, dateDay] = rateDate.split('-').map(Number);
    if (!dateYear || !dateMonth || !dateDay) {
      setRateError('Informe uma data de referência válida.');
      return;
    }

    setRateSaving(true);
    try {
      await exchangeRateService.save({
        from: rateFrom,
        to: rateTo,
        ...ratio,
        referenceDate: {
          year: dateYear,
          month: dateMonth,
          day: dateDay,
        },
      });
      setRateValue('');
      pendingMutationRef.current = 'salva';
      setRateNotice('Taxa manual salva.');
      setRatesNonce((current) => current + 1);
      setConsolidationNonce((current) => current + 1);
    } catch (requestError) {
      setRateError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível salvar a taxa manual',
      );
    } finally {
      setRateSaving(false);
    }
  }

  async function handlePtaxFetch() {
    setRateError('');
    setRateNotice('');

    if (rateFrom === rateTo) {
      setRateError('Escolha moedas diferentes para a cotação PTAX.');
      return;
    }

    if (rateDate > currentIsoDate()) {
      setRateError('A data de referência não pode ser futura.');
      return;
    }

    const [dateYear, dateMonth, dateDay] = rateDate.split('-').map(Number);
    if (!dateYear || !dateMonth || !dateDay) {
      setRateError('Informe uma data de referência válida.');
      return;
    }

    setRateFetchingPtax(true);
    try {
      await exchangeRateService.fetchPtax({
        from: rateFrom,
        to: rateTo,
        referenceDate: {
          year: dateYear,
          month: dateMonth,
          day: dateDay,
        },
      });
      pendingMutationRef.current = 'salva';
      setRateNotice('Cotação PTAX salva.');
      setRatesNonce((current) => current + 1);
      setConsolidationNonce((current) => current + 1);
    } catch (requestError) {
      setRateError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível consultar a cotação PTAX',
      );
    } finally {
      setRateFetchingPtax(false);
    }
  }

  async function handleRateRemove() {
    if (!ratePendingDelete) return;

    setRateError('');
    setRateNotice('');
    setRateDeleteLoading(true);
    try {
      await exchangeRateService.remove(ratePendingDelete.id);
      const removedId = ratePendingDelete.id;
      setRates((current) => current.filter((rate) => rate.id !== removedId));
      setRateTotal((current) => Math.max(0, current - 1));
      pendingMutationRef.current = 'excluída';
      setRateNotice('Taxa manual excluída.');
      setRatePendingDelete(null);
      setRatesNonce((current) => current + 1);
      setConsolidationNonce((current) => current + 1);
    } catch (requestError) {
      setRateError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível remover a taxa manual',
      );
    } finally {
      setRateDeleteLoading(false);
    }
  }

  async function loadMoreRates() {
    if (!rateHasMore || ratesMoreLoading) return;

    setRatesMoreLoading(true);
    try {
      const response = await exchangeRateService.getAll({
        page: ratePage + 1,
        limit: 10,
        ...(rateFilterFrom ? { from: rateFilterFrom } : {}),
        ...(rateFilterTo ? { to: rateFilterTo } : {}),
        source: rateSourceTab,
      });
      setRates((current) => [...current, ...response.data.items]);
      setRatePage(response.data.page);
      setRateHasMore(response.data.hasMore);
      setRateTotal(response.data.total);
    } catch (requestError) {
      setRateError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível carregar mais taxas de câmbio',
      );
    } finally {
      setRatesMoreLoading(false);
    }
  }

  const selected = useMemo(
    () =>
      data?.byCurrency.find((item) => item.currency === selectedCurrency) ??
      null,
    [data, selectedCurrency],
  );

  const history = useMemo(
    () =>
      data?.history.map((point) => ({
        ...point,
        value: point.totals[selectedCurrency] ?? 0,
      })) ?? [],
    [data, selectedCurrency],
  );

  const realEvolution = data?.realEvolution?.data ?? null;
  const selectedRealReturn = useMemo(
    () =>
      realEvolution?.byCurrency.find(
        (item) => item.currency === selectedCurrency,
      ) ?? null,
    [realEvolution, selectedCurrency],
  );

  return (
    <ProtectedRoute>
      <PageContainer as="section">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className={pageTitleClassName}>
              Patrimônio
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)] sm:text-base">
              Ativos, passivos e patrimônio líquido por moeda, sem conversão cambial automática.
            </p>
          </div>

          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
            <Input
              label="Mês de referência"
              aria-label="Mês final do patrimônio"
              type="month"
              value={periodInputValue({ year, month })}
              max={periodInputValue(currentPeriod())}
              onChange={(event) => {
                const parsed = parsePeriodInput(event.target.value);
                if (parsed) {
                  setLoading(true);
                  setEndPeriod(parsed);
                }
              }}
            />
            <Select
              label="Histórico"
              value={months}
              onChange={(value) => {
                setLoading(true);
                setMonths(Number(value));
              }}
              options={[6, 12, 24, 36, 60].map((count) => ({ value: count, label: `${count} meses` }))}
            />
          </div>
        </header>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-[14px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
          >
            {error}
          </p>
        )}

        {loading ? (
          <div className="mt-5">
            <PageLoading />
          </div>
        ) : !data || data.byCurrency.length === 0 ? (
          <div className="mt-5 ds-panel p-8">
            <PageEmpty title="Nenhum patrimônio disponível" />
            <p className="mt-2 text-center text-sm text-[var(--text-muted)]">
              Adicione transações concluídas em contas correntes ou investimentos
              para começar a acompanhar a evolução.
            </p>
            <Link
              href="/contas"
              className="mx-auto mt-4 flex min-h-11 w-fit items-center gap-2 rounded-full bg-[var(--orbit-primary)] px-5 font-bold text-white"
            >
              Ver contas
              <FaChevronRight aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <>
            <ChipRow label="Selecionar moeda do patrimônio" className="mt-5">
              {currencies.map((currency) => {
                const available = data.byCurrency.some((item) => item.currency === currency);
                return (
                  <Chip
                    key={currency}
                    disabled={!available}
                    selected={selectedCurrency === currency}
                    onClick={() => setSelectedCurrency(currency)}
                    className="disabled:opacity-35"
                  >
                    {currency}
                  </Chip>
                );
              })}
            </ChipRow>

            <div className="mt-5 space-y-4">
              <ConsolidationCard
                consolidation={data.consolidation}
                baseCurrency={baseCurrency}
                onBaseCurrencyChange={(currency) => {
                  setBaseCurrency(currency);
                  if (!currency) {
                    setData((current) =>
                      current ? { ...current, consolidation: null } : current,
                    );
                  }
                }}
                showValues={showValues}
              />

              <ExchangeRatesCard
                rates={rates}
                loading={ratesLoading}
                moreLoading={ratesMoreLoading}
                hasMore={rateHasMore}
                total={rateTotal}
                filterFrom={rateFilterFrom}
                filterTo={rateFilterTo}
                sourceTab={rateSourceTab}
                notice={rateNotice}
                error={rateError}
                saving={rateSaving}
                fetchingPtax={rateFetchingPtax}
                from={rateFrom}
                to={rateTo}
                value={rateValue}
                referenceDate={rateDate}
                showValues={showValues}
                onFilterFromChange={setRateFilterFrom}
                onFilterToChange={setRateFilterTo}
                onSourceTabChange={setRateSourceTab}
                onFromChange={setRateFrom}
                onToChange={setRateTo}
                onValueChange={setRateValue}
                onReferenceDateChange={setRateDate}
                onSave={handleRateSave}
                onFetchPtax={handlePtaxFetch}
                onLoadMore={() => void loadMoreRates()}
                onRemove={setRatePendingDelete}
              />

              {selected && (
                <>
                <NetWorthHero
                  total={selected.total}
                  assetsTotal={selected.assetsTotal}
                  liabilitiesTotal={selected.liabilitiesTotal}
                  currency={selected.currency}
                  showValues={showValues}
                  accountCount={selected.accounts.length}
                  debtCount={selected.debts.length}
                  valuation={selected.valuation}
                />

                {data.realEvolution?.error && (
                  <article className="rounded-[18px] border border-[var(--warning)]/35 bg-[var(--warning-subtle)] p-4 sm:p-5">
                    <h2 className="font-bold text-[var(--foreground)]">
                      Evolução real indisponível
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {data.realEvolution.error}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-3"
                      onClick={() => {
                        setLoading(true);
                        setCoreNonce((current) => current + 1);
                      }}
                    >
                      Tentar novamente
                    </Button>
                  </article>
                )}

                {realEvolution && selectedRealReturn && (
                  <RealReturnCard
                    data={selectedRealReturn}
                    summary={realEvolution}
                    showValues={showValues}
                  />
                )}

                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                  <HistoryCard
                    history={history}
                    currency={selected.currency}
                    showValues={showValues}
                    valuation={selected.valuation}
                    historyValuation={data.historyValuation}
                  />
                  <div className="space-y-4">
                    <DistributionCard
                      accounts={selected.accounts}
                      currency={selected.currency}
                      showValues={showValues}
                    />
                    <LiabilitiesCard
                      debts={selected.debts}
                      currency={selected.currency}
                      showValues={showValues}
                    />
                  </div>
                </div>
                </>
              )}
            </div>
          </>
        )}

        {ratePendingDelete && (
          <ModalShell
            title="Excluir taxa manual?"
            onClose={() => setRatePendingDelete(null)}
            closeDisabled={rateDeleteLoading}
          >
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              A taxa {ratePendingDelete.from} → {ratePendingDelete.to} de{' '}
              {logicalDateLabel(ratePendingDelete.referenceDate)} será removida.
              Consolidações são recalculadas com a taxa disponível: o total pode
              ficar incompleto, usar uma taxa mais antiga ou voltar a usar a PTAX da
              mesma data, inclusive em períodos anteriores. Você pode recadastrar
              a taxa depois.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setRatePendingDelete(null)} disabled={rateDeleteLoading}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={() => void handleRateRemove()} disabled={rateDeleteLoading}>
                {rateDeleteLoading ? 'Excluindo…' : 'Excluir taxa'}
              </Button>
            </div>
          </ModalShell>
        )}
      </PageContainer>
    </ProtectedRoute>
  );
}
