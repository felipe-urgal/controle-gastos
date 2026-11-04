'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { FaArrowLeft, FaCheckCircle } from 'react-icons/fa';

import { Alert } from '@/app/components/feedback';
import { Button, Chip, Input, Select } from '@/app/components/ui';
import { errorMessage } from '@/app/lib/error-message';
import { formatCurrency } from '@/app/lib/currency/format-money';
import { formatPtBrLogicalDate, type LogicalDate } from '@/app/lib/date/logical-date';
import type { QuickEntryParsed, QuickEntryType } from '@/app/lib/transactions/quick-entry';
import {
  buildQuickEntryPayload,
  categoriesForType,
  pickInitialAccount,
  quickEntryStatus,
} from '@/app/lib/transactions/quick-entry-flow';
import type { QuickEntrySuggestion } from '@/app/lib/transactions/quick-entry-suggestion';
import { TRANSACTIONS_CHANGED_EVENT } from '@/app/lib/transactions/transaction-events';
import { ApiClientError } from '@/app/services/api-client';
import { accountService } from '@/app/services/account-service';
import { categoryService } from '@/app/services/category-service';
import { transactionService } from '@/app/services/transaction-service';
import type { AccountModel } from '@/app/types/account';
import type { CategoryModel } from '@/app/types/category';

export type QuickEntryDraft = QuickEntryParsed;

const TYPE_LABEL: Record<QuickEntryType, string> = { EXPENSE: 'Despesa', INCOME: 'Receita' };

const SUGGESTION_NOTE: Record<QuickEntrySuggestion['source'], (name: string | null) => string | null> = {
  SAME_DESCRIPTION: () => 'Conta e categoria sugeridas pelo último lançamento com esta descrição.',
  MERCHANT: (name) => `Conta e categoria sugeridas pelo último lançamento de ${name ?? 'este estabelecimento'}.`,
  LAST_ACCOUNT: () => 'Conta sugerida pelo último lançamento.',
  NONE: () => null,
};

/**
 * Prévia do lançamento rápido: mostra o que foi entendido, deixa trocar tipo, descrição, conta e
 * categoria, e só grava quando o usuário confirma. A gravação é a mesma do formulário
 * (`createIdempotent`), então um duplo clique ou um retry nunca cria dois lançamentos.
 */
export default function QuickEntryPreview({
  draft,
  today,
  onBack,
  onClose,
  backLabel = 'Voltar',
}: {
  draft: QuickEntryDraft;
  today: LogicalDate;
  onBack: () => void;
  onClose: () => void;
  /** Rótulo do botão de voltar; fora da busca ele leva ao formulário completo. */
  backLabel?: string;
}) {
  const [type, setType] = useState<QuickEntryType>(draft.type);
  const [description, setDescription] = useState(draft.description);
  const [accounts, setAccounts] = useState<AccountModel[] | null>(null);
  const [categories, setCategories] = useState<CategoryModel[] | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<QuickEntrySuggestion | null>(null);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [created, setCreated] = useState<{ id: string } | null>(null);
  // Uma tentativa por conteúdo: repetir o envio com os mesmos dados reaproveita a chave de idempotência.
  const attempt = useRef<{ key: string; body: string } | null>(null);
  const suggestionRequest = useRef(0);

  function loadSuggestion(nextType: QuickEntryType, categoryList: CategoryModel[] | null) {
    const request = ++suggestionRequest.current;
    void transactionService
      .quickEntrySuggestion(draft.description, nextType)
      .then(({ data }) => {
        if (request !== suggestionRequest.current) return;
        setSuggestion(data);
        const category = categoryList?.find((item) => item.id === data.categoryId);
        setCategoryId(category && category.isActive && category.type === nextType ? category.id : null);
      })
      .catch(() => {
        // A sugestão é um atalho; sem ela o usuário só escolhe à mão.
        if (request === suggestionRequest.current) setSuggestion(null);
      });
  }

  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      accountService.getAll(),
      categoryService.getAll(),
      transactionService.quickEntrySuggestion(draft.description, draft.type),
    ]).then(([accountsResult, categoriesResult, suggestionResult]) => {
      if (!active) return;
      if (accountsResult.status === 'rejected' || categoriesResult.status === 'rejected') {
        setLoadError('Não foi possível carregar suas contas e categorias.');
        return;
      }
      const accountList = accountsResult.value.data.items ?? [];
      const categoryList = categoriesResult.value.data.items ?? [];
      const suggested = suggestionResult.status === 'fulfilled' ? suggestionResult.value.data : null;

      setAccounts(accountList);
      setCategories(categoryList);
      setSuggestion(suggested);
      setAccountId(
        pickInitialAccount({
          hint: draft.accountHint,
          accounts: accountList,
          suggestedAccountId: suggested?.accountId ?? null,
        }),
      );
      const category = categoryList.find((item) => item.id === suggested?.categoryId);
      setCategoryId(category && category.isActive && category.type === draft.type ? category.id : null);
    });
    return () => {
      active = false;
    };
  }, [draft]);

  const account = accounts?.find((item) => item.id === accountId) ?? null;
  const category = categories?.find((item) => item.id === categoryId) ?? null;
  const categoryOptions = useMemo(
    () => (categories ? categoriesForType(categories, type).map((item) => ({ value: item.id, label: item.name })) : []),
    [categories, type],
  );
  const accountOptions = useMemo(
    () => (accounts ?? []).filter((item) => item.isActive).map((item) => ({ value: item.id, label: item.name })),
    [accounts],
  );
  const status = quickEntryStatus(draft.date, today);
  const currency = account?.currency ?? 'BRL';
  const hintMissed = draft.accountHint !== null && accounts !== null && !account;

  function changeType(next: QuickEntryType) {
    if (next === type) return;
    setType(next);
    setCategoryId(null);
    loadSuggestion(next, categories);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const built = buildQuickEntryPayload({
      amountCents: draft.amountCents,
      date: draft.date,
      today,
      description,
      accountId,
      category,
      merchantId: suggestion?.merchantId ?? null,
    });
    if (!built.ok) {
      setSubmitError(built.message);
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSubmitError('Sem conexão. Use "Nova transação" para guardar offline e sincronizar depois.');
      return;
    }

    const body = JSON.stringify(built.payload);
    const current = attempt.current?.body === body ? attempt.current : { key: crypto.randomUUID(), body };
    attempt.current = current;

    setSubmitting(true);
    setSubmitError('');
    try {
      const response = await transactionService.createIdempotent(built.payload, current.key);
      attempt.current = null;
      setCreated({ id: response.data.id });
      window.dispatchEvent(new Event(TRANSACTIONS_CHANGED_EVENT));
    } catch (error) {
      // Dados recusados pelo servidor são uma nova tentativa; falha de rede mantém a chave para o retry.
      if (error instanceof ApiClientError && (error.status === 400 || error.status === 422)) attempt.current = null;
      setSubmitError(errorMessage(error, 'Não foi possível criar o lançamento.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="space-y-4 p-1" role="status">
        <p className="flex items-center gap-2 text-base font-semibold text-[var(--income)]">
          <FaCheckCircle aria-hidden="true" /> Lançamento criado
        </p>
        <p className="text-sm text-[var(--text-muted)]">
          {description.trim()} · {formatCurrency(draft.amountCents, currency)} · {formatPtBrLogicalDate(draft.date)}
          {status === 'PENDING' ? ' · pendente' : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/transacoes/show/${created.id}`}
            onClick={onClose}
            className="inline-flex min-h-11 items-center rounded-full border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            Ver lançamento
          </Link>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4" aria-label="Confirmar lançamento rápido">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="money text-3xl font-semibold tabular-nums text-[var(--foreground)]">
            {formatCurrency(draft.amountCents, currency)}
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {formatPtBrLogicalDate(draft.date)}
            {status === 'PENDING' ? ' · fica pendente (data futura)' : ''}
          </p>
        </div>
        <Button variant="ghost" size="sm" icon={<FaArrowLeft aria-hidden="true" />} onClick={onBack}>
          {backLabel}
        </Button>
      </div>

      <div className="flex gap-2" role="group" aria-label="Tipo do lançamento">
        {(['EXPENSE', 'INCOME'] as const).map((option) => (
          <Chip key={option} selected={type === option} onClick={() => changeType(option)}>
            {TYPE_LABEL[option]}
          </Chip>
        ))}
      </div>

      {loadError ? (
        <Alert variant="error" message={loadError} />
      ) : accounts === null ? (
        <div className="h-24 animate-pulse rounded-[var(--radius-md)] bg-[var(--skeleton)]" role="status" aria-label="Carregando contas e categorias" />
      ) : accountOptions.length === 0 ? (
        <Alert variant="warning" message="Você ainda não tem uma conta ativa. Crie uma em Contas para lançar." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Descrição"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={100}
            autoComplete="off"
          />
          <Select
            label="Conta"
            value={accountId ?? ''}
            onChange={(value) => setAccountId(String(value))}
            options={accountOptions}
            placeholder="Escolha a conta"
          />
          <div className="sm:col-span-2">
            <Select
              label="Categoria"
              value={categoryId ?? ''}
              onChange={(value) => setCategoryId(String(value))}
              options={categoryOptions}
              placeholder={categoryOptions.length === 0 ? `Nenhuma categoria de ${TYPE_LABEL[type].toLowerCase()}` : 'Escolha a categoria'}
            />
          </div>
        </div>
      )}

      {hintMissed && (
        <p className="text-xs text-[var(--text-muted)]">
          Não encontrei uma conta única para “{draft.accountHint}”; escolha acima.
        </p>
      )}
      {suggestion && SUGGESTION_NOTE[suggestion.source](suggestion.merchantName) && (
        <p className="text-xs text-[var(--text-muted)]">{SUGGESTION_NOTE[suggestion.source](suggestion.merchantName)}</p>
      )}
      {submitError && <Alert variant="error" message={submitError} />}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={submitting || accounts === null || accountOptions.length === 0}>
          {submitting ? 'Lançando…' : 'Lançar'}
        </Button>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
      </div>
    </form>
  );
}
