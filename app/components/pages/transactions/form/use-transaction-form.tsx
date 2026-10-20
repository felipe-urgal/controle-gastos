'use client';

import { useMediaQuery } from '@/app/hooks/use-media-query';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { FaTag } from 'react-icons/fa';
import { Button } from '@/app/components/ui';
import { statusOptions } from '@/app/lib/constants/transaction.constants';
import { useCurrencyFormatter } from '@/app/lib/currency/format-currency';
import { FormData } from '@/app/lib/interface/transaction.interface';
import { OfflineTransactionQueueStorageError, enqueueOfflineTransaction, readOfflineTransactionQueue, syncOfflineTransactionQueueItem } from '@/app/lib/pwa/offline-transaction-queue';
import { ReceiptOcrApplication } from '@/app/lib/receipts/receipt-ocr-parser';
import { buildInstallmentOccurrences } from '@/app/lib/transactions/installments';
import { buildCorrectionAutomationSuggestions } from '@/app/lib/transactions/transaction-learning';
import { generateLogicalRecurrenceDates } from '@/app/lib/transactions/logical-recurrence';
import { formatPtBrLogicalDate, parseIsoLogicalDate } from '@/app/lib/transactions/monthly-recurrence';
import { getRecurrencePresetLabel, getRecurrencePresetRule, RecurrencePreset } from '@/app/lib/transactions/recurrence-presets';
import { accountService } from '@/app/services/account-service';
import { categoryService } from '@/app/services/category-service';
import { ApiClientError } from '@/app/services/api-client';
import { importRuleService } from '@/app/services/import-rule-service';
import { merchantAliasService } from '@/app/services/merchant-alias-service';
import { merchantService } from '@/app/services/merchant-service';
import { transactionService } from '@/app/services/transaction-service';
import { tagService } from '@/app/services/tag-service';
import { normalizeTagDisplayName, normalizeTagNameKey } from '@/app/lib/tags/tag-name';
import { AccountModel } from '@/app/types/account';
import { CategoryModel } from '@/app/types/category';
import { MerchantAliasOperator } from '@/app/types/merchant-alias';
import { MerchantDTO } from '@/app/types/merchant';
import { TransactionDTO } from '@/app/types/transaction';
import { TagDTO } from '@/app/types/tag';
import { CategoryType, CreationMode, RecurrenceMode, TransactionFormProps, initialTransactionFormData } from '@/app/components/pages/transactions/form/transaction-form-shared';

export function useTransactionForm({
  transaction,
  isEditing,
  initialDate,
  initialValues,
  onSuccess,
  onCancelOverride,
  initialCategoryType = null,
  onSelectTransfer,
  offlineOwnerUserId,
  offlineDraftId,
  onOfflineQueueChanged,
  reviewingQueueItem,
  onReviewedQueueItem,
}: TransactionFormProps) {

  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(() =>
    initialTransactionFormData({
      transaction,
      isEditing,
      initialDate,
      initialValues,
    }),
  );
  const [creationMode, setCreationMode] = useState<CreationMode>('single');
  const [recurrencePreset, setRecurrencePreset] = useState<RecurrencePreset>('monthly');
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>('count');
  const [occurrenceCount, setOccurrenceCount] = useState(12);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [installmentCount, setInstallmentCount] = useState(2);
  const [accounts, setAccounts] = useState<AccountModel[]>([]);
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [merchants, setMerchants] = useState<MerchantDTO[]>([]);
  const [tags, setTags] = useState<Array<Pick<TagDTO, 'id' | 'name' | 'isActive'>>>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryType | null>(initialCategoryType);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [learnMerchantCorrection, setLearnMerchantCorrection] = useState(true);
  const [learnCategoryCorrection, setLearnCategoryCorrection] = useState(true);
  const [merchantLearningOperator, setMerchantLearningOperator] = useState<MerchantAliasOperator>('EQUALS');
  const [categoryLearningOperator, setCategoryLearningOperator] = useState<MerchantAliasOperator>('EQUALS');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [mobileStep, setMobileStep] = useState<1 | 2 | 3>(1);
  const [merchantRecognition, setMerchantRecognition] = useState<
    | { kind: 'auto'; merchantId: string; merchantName: string }
    | { kind: 'conflict' }
    | null
  >(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const desktopDateInputRef = useRef<HTMLInputElement>(null);
  const tagOptionsId = useId();
  const tagSearchSequenceRef = useRef(0);
  const submitInFlightRef = useRef(false);
  const createAttemptRef = useRef<{ id: string; key: string; payload: string } | null>(null);
  const autoMatchedMerchantIdRef = useRef<string | null>(null);
  const autoMatchedDescriptionRef = useRef<string | null>(null);
  const manualMerchantChoiceRef = useRef(false);

  const selectedAccount = accounts.find((account) => account.id === formData.accountId);
  const selectedCategory = categories.find((category) => category.id === formData.categoryId);
  const selectedMerchant = merchants.find((merchant) => merchant.id === formData.merchantId);
  const effectiveCategoryFilter =
    (selectedCategory?.type as CategoryType | undefined) ?? categoryFilter;
  const learningSuggestions = useMemo(() => {
    if (!isEditing || !transaction?.importSource || !selectedCategory) {
      return { merchant: null, category: null };
    }

    const suggestions = buildCorrectionAutomationSuggestions(
      {
        description: transaction.description ?? '',
        accountId: transaction.account?.id ?? '',
        categoryId: transaction.category?.id ?? '',
        merchantId: transaction.merchant?.id ?? null,
        type: transaction.type,
        importSource: transaction.importSource,
      },
      {
        description: formData.description,
        accountId: formData.accountId,
        categoryId: formData.categoryId,
        merchantId: formData.merchantId ?? null,
        type: selectedCategory.type as CategoryType,
        importSource: transaction.importSource,
      },
    );

    if (suggestions.merchant?.merchantId === autoMatchedMerchantIdRef.current) {
      return { ...suggestions, merchant: null };
    }

    return suggestions;
  }, [
    isEditing,
    transaction,
    selectedCategory,
    formData.description,
    formData.accountId,
    formData.categoryId,
    formData.merchantId,
  ]);
  const hasLearningSuggestions = Boolean(learningSuggestions.merchant || learningSuggestions.category);
  const { displayValue, setDisplayValue, formatCentsToCurrency } = useCurrencyFormatter({
    initialValue: 'R$ 0,00',
    currency: selectedAccount?.currency || 'BRL',
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [accountsResult, categoriesResult, merchantsResult, tagsResult] = await Promise.allSettled([
          accountService.getAll(),
          categoryService.getAll(),
          merchantService.getAllOptions(),
          tagService.getActiveOptions(),
        ]);

        if (accountsResult.status === 'rejected' || categoriesResult.status === 'rejected') {
          throw new Error('Não foi possível carregar contas e categorias. Tente novamente.');
        }

        setAccounts(accountsResult.value.data?.items || []);
        setCategories(categoriesResult.value.data?.items || []);
        setMerchants(merchantsResult.status === 'fulfilled' ? merchantsResult.value : []);
        const activeTags =
          tagsResult.status === 'fulfilled' ? (tagsResult.value.data?.items ?? []) : [];
        const currentTransactionTags = transaction?.tags ?? [];
        const mergedTags = new Map(
          [...activeTags, ...currentTransactionTags].map((tag) => [tag.id, tag]),
        );
        setTags(
          [...mergedTags.values()].sort((a, b) =>
            a.name.localeCompare(b.name, 'pt-BR'),
          ),
        );
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : 'Não foi possível carregar os dados do formulário');
      } finally {
        setLoadingData(false);
      }
    }

    void loadData();
  }, [transaction?.tags]);

  useEffect(() => {
    const query = normalizeTagDisplayName(tagDraft);
    const requestId = ++tagSearchSequenceRef.current;
    if (!query) return;

    const timeout = window.setTimeout(() => {
      tagService
        .getActiveOptions(query)
        .then((response) => {
          if (requestId !== tagSearchSequenceRef.current) return;

          setTags((current) => {
            const selectedIds = new Set(formData.tagIds ?? []);
            const retained = current.filter(
              (tag) => selectedIds.has(tag.id) || !tag.isActive,
            );
            const merged = new Map(
              [...retained, ...(response.data.items ?? [])].map((tag) => [
                tag.id,
                tag,
              ]),
            );
            return [...merged.values()].sort((left, right) =>
              left.name.localeCompare(right.name, 'pt-BR'),
            );
          });
        })
        .catch(() => {
          // Autocomplete is optional; submit still resolves the tag server-side.
        });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [tagDraft, formData.tagIds]);

  useEffect(() => {
    setDisplayValue(formatCentsToCurrency(formData.amount));
  }, [formData.amount, formatCentsToCurrency, setDisplayValue]);

  useEffect(() => {
    const description = formData.description.trim();
    if (
      description.length < 2 ||
      formData.merchantId ||
      manualMerchantChoiceRef.current
    ) {
      return;
    }

    let active = true;
    const timeout = window.setTimeout(() => {
      merchantAliasService
        .match(description)
        .then((response) => {
          if (!active) return;

          if (response.data.conflict) {
            setMerchantRecognition({ kind: 'conflict' });
            return;
          }

          if (!response.data.merchantId || !response.data.merchantName) {
            setMerchantRecognition(null);
            return;
          }

          autoMatchedMerchantIdRef.current = response.data.merchantId;
          autoMatchedDescriptionRef.current = description;
          setMerchantRecognition({
            kind: 'auto',
            merchantId: response.data.merchantId,
            merchantName: response.data.merchantName,
          });
          setFormData((previous) =>
            previous.merchantId || previous.description.trim() !== description
              ? previous
              : { ...previous, merchantId: response.data.merchantId },
          );
        })
        .catch(() => {
          // Recognition is optional. Technical failures do not block editing
          // and do not produce a false "no match" state.
        });
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [formData.description, formData.merchantId]);

  const recurrencePreview = useMemo(() => {
    if (creationMode !== 'recurring' || isEditing) {
      return { dates: [], error: null as string | null };
    }

    const start = {
      year: formData.year,
      month: formData.month,
      day: formData.day,
    };
    const recurrenceRule = getRecurrencePresetRule(recurrencePreset);

    try {
      if (recurrenceMode === 'count') {
        return {
          dates: generateLogicalRecurrenceDates(start, {
            ...recurrenceRule,
            mode: 'count',
            occurrences: occurrenceCount,
          }),
          error: null,
        };
      }

      const endDate = parseIsoLogicalDate(recurrenceEndDate);
      if (!endDate) {
        return { dates: [], error: 'Informe uma data final válida' };
      }

      return {
        dates: generateLogicalRecurrenceDates(start, {
          ...recurrenceRule,
          mode: 'endDate',
          endDate,
        }),
        error: null,
      };
    } catch (error) {
      return {
        dates: [],
        error: error instanceof Error ? error.message : 'Recorrência inválida',
      };
    }
  }, [
    creationMode,
    isEditing,
    formData.year,
    formData.month,
    formData.day,
    recurrencePreset,
    recurrenceMode,
    occurrenceCount,
    recurrenceEndDate,
  ]);

  const installmentPreview = useMemo(() => {
    if (creationMode !== 'installment' || isEditing) {
      return { occurrences: [], error: null as string | null };
    }

    if (!selectedCategory) {
      return { occurrences: [], error: 'Selecione uma categoria de despesa' };
    }

    if (selectedCategory.type !== 'EXPENSE') {
      return {
        occurrences: [],
        error: 'Parcelamento está disponível apenas para categorias de despesa',
      };
    }

    try {
      return {
        occurrences: buildInstallmentOccurrences({
          totalCents: formData.amount,
          count: installmentCount,
          start: {
            year: formData.year,
            month: formData.month,
            day: formData.day,
          },
          firstStatus: formData.status,
        }),
        error: null,
      };
    } catch (error) {
      return {
        occurrences: [],
        error: error instanceof Error ? error.message : 'Parcelamento inválido',
      };
    }
  }, [
    creationMode,
    isEditing,
    selectedCategory,
    formData.amount,
    formData.year,
    formData.month,
    formData.day,
    formData.status,
    installmentCount,
  ]);

  function handleRedirect(savedTransaction?: TransactionDTO | null) {
    if (onSuccess) {
      onSuccess(savedTransaction);
      return;
    }

    if (isEditing && transaction?.id) {
      router.replace(`/transacoes/show/${transaction.id}`);
    } else {
      router.replace('/transacoes');
    }
  }

  function handleCancel() {
    if (onCancelOverride) {
      onCancelOverride();
      return;
    }

    handleRedirect();
  }

  function moveCursorToEnd() {
    requestAnimationFrame(() => {
      const input = amountInputRef.current;
      if (!input) return;
      const length = input.value.length;
      input.setSelectionRange(length, length);
    });
  }

  const handleAmountChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const raw = event.target.value.replace(/\D/g, '');
    const cents = Number(raw || 0);
    setFormData((previous) => ({ ...previous, amount: cents }));
    setDisplayValue(formatCentsToCurrency(cents));
    moveCursorToEnd();
  };

  function handleMerchantChange(value: string | number) {
    manualMerchantChoiceRef.current = true;
    autoMatchedMerchantIdRef.current = null;
    autoMatchedDescriptionRef.current = null;
    setMerchantRecognition(null);
    setFormData((previous) => ({
      ...previous,
      merchantId: value ? String(value) : null,
    }));
  }

  function handleDescriptionChange(description: string) {
    setMerchantRecognition(null);
    setFormData((previous) => {
      const hasCurrentAutoMatch =
        autoMatchedMerchantIdRef.current !== null &&
        previous.merchantId === autoMatchedMerchantIdRef.current;

      if (hasCurrentAutoMatch) {
        autoMatchedMerchantIdRef.current = null;
        autoMatchedDescriptionRef.current = null;
      }

      return {
        ...previous,
        description,
        ...(hasCurrentAutoMatch ? { merchantId: null } : {}),
      };
    });
  }

  const receiptOcrFormState = {
    amountFilled: Number(formData.amount) > 0,
    descriptionFilled: formData.description.trim().length > 0,
    dateFixed: Boolean(initialDate),
    currency: selectedAccount?.currency,
  };

  function handleReceiptOcrApplication(applicable: ReceiptOcrApplication) {
    if (isEditing) return;

    if (applicable.description !== undefined) {
      handleDescriptionChange(applicable.description);
    }

    setFormData((previous) => ({
      ...previous,
      amount: applicable.amountCents ?? previous.amount,
      ...(applicable.description === undefined
        ? {}
        : { description: applicable.description }),
      ...(!initialDate && applicable.date
        ? {
            year: applicable.date.year,
            month: applicable.date.month,
            day: applicable.date.day,
          }
        : {}),
    }));
  }

  function handleCategoryType(type: CategoryType) {
    setCategoryFilter(type);
    setFormData((previous) => {
      const currentCategory = categories.find((item) => item.id === previous.categoryId);
      if (!currentCategory || currentCategory.type === type) return previous;
      return { ...previous, categoryId: '' };
    });
  }

  function handleCategoryChange(value: string | number) {
    const categoryId = String(value);
    const category = categories.find((item) => item.id === categoryId);
    if (category) {
      setCategoryFilter(category.type as CategoryType);
    }
    setFormData((previous) => ({
      ...previous,
      categoryId,
      allocations: previous.allocations?.length
        ? previous.allocations.map((allocation, index) => index === 0 ? { ...allocation, categoryId } : allocation)
        : previous.allocations,
    }));
  }

  useEffect(() => {
    if (isEditing) return;
    try {
      const key = 'controle-gastos:storage-probe';
      window.localStorage.setItem(key, '1');
      window.localStorage.removeItem(key);
    } catch {
      queueMicrotask(() => setStorageUnavailable(true));
    }
  }, [isEditing]);

  async function persistTransaction() {
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const category = categories.find((item) => item.id === formData.categoryId);

      if (!category) {
        throw new Error('Categoria inválida');
      }

      const payload = {
        ...formData,
        type: category.type,
        description: formData.description || '',
      };

      if (reviewingQueueItem) {
        if (!onReviewedQueueItem) throw new Error('Revisão indisponível');
        if (creationMode !== 'single') throw new Error('A revisão permite apenas lançamento simples.');
        if (!accounts.some((account) => account.id === payload.accountId)) {
          throw new Error('Conta não encontrada. Selecione uma conta válida.');
        }
        if (category.type !== reviewingQueueItem.payload.type) {
          throw new Error('A categoria deve corresponder ao tipo do lançamento.');
        }
        if (formData.tagIds?.some((id) => !tags.some((tag) => tag.id === id && tag.isActive))) {
          throw new Error('Existem tags inativas ou excluídas. Revise as tags.');
        }
        if (formData.merchantId && !merchants.some((merchant) => merchant.id === formData.merchantId)) {
          throw new Error('Estabelecimento indisponível. Selecione outro.');
        }
        onReviewedQueueItem(payload);
        return;
      }

      let savedTransaction: TransactionDTO | null = null;

      if (!isEditing && creationMode === 'recurring') {
        if (recurrencePreview.error || recurrencePreview.dates.length < 2) {
          throw new Error(recurrencePreview.error || 'Recorrência inválida');
        }

        const recurrenceRule = getRecurrencePresetRule(recurrencePreset);
        const ending =
          recurrenceMode === 'count'
            ? { mode: 'count' as const, occurrences: occurrenceCount }
            : { mode: 'endDate' as const, endDate: recurrenceEndDate };

        const requestBody = { transaction: payload, recurrence: { ...recurrenceRule, ...ending } };
        const serializedPayload = 'recurring:' + JSON.stringify(requestBody);
        const previous = createAttemptRef.current;
        if (previous && previous.payload !== serializedPayload) {
          throw new Error('Uma recorrência anterior tem resultado incerto. Reenvie os mesmos dados antes de alterar.');
        }
        const attempt = previous ?? { id: crypto.randomUUID(), key: crypto.randomUUID(), payload: serializedPayload };
        createAttemptRef.current = attempt;
        let response;
        try {
          response = await transactionService.createFlexibleRecurring(requestBody, attempt.key);
        } catch (error) {
          if (error instanceof ApiClientError && (error.status === 400 || error.status === 422)) createAttemptRef.current = null;
          throw error;
        }
        createAttemptRef.current = null;
        savedTransaction = response.data.firstOccurrence;
      } else if (!isEditing && creationMode === 'installment') {
        if (category.type !== 'EXPENSE') {
          throw new Error('Parcelamento está disponível apenas para despesas');
        }

        if (installmentPreview.error || installmentPreview.occurrences.length < 2) {
          throw new Error(installmentPreview.error || 'Parcelamento inválido');
        }

        const requestBody = { transaction: { ...payload, type: 'EXPENSE' as const }, installmentCount };
        const serializedPayload = 'installment:' + JSON.stringify(requestBody);
        const previous = createAttemptRef.current;
        if (previous && previous.payload !== serializedPayload) {
          throw new Error('Um parcelamento anterior tem resultado incerto. Reenvie os mesmos dados antes de alterar.');
        }
        const attempt = previous ?? { id: crypto.randomUUID(), key: crypto.randomUUID(), payload: serializedPayload };
        createAttemptRef.current = attempt;
        let response;
        try {
          response = await transactionService.createInstallments(requestBody, attempt.key);
        } catch (error) {
          if (error instanceof ApiClientError && (error.status === 400 || error.status === 422)) createAttemptRef.current = null;
          throw error;
        }
        createAttemptRef.current = null;
        savedTransaction = response.data.firstOccurrence;
      } else if (isEditing && transaction) {
        const response = await transactionService.update(transaction.id, payload);
        savedTransaction = response.data;

        if (learningSuggestions.merchant && learnMerchantCorrection) {
          try {
            await merchantAliasService.reassign({
              merchantId: learningSuggestions.merchant.merchantId,
              operator: merchantLearningOperator,
              pattern: learningSuggestions.merchant.pattern,
              priority: 100,
            });
          } catch (error) {
            throw new Error(
              `Transação salva, mas não foi possível atualizar o reconhecimento: ${error instanceof Error ? error.message : 'erro inesperado'}`,
            );
          }
        }

        if (learningSuggestions.category && learnCategoryCorrection) {
          try {
            await importRuleService.create({
              ...learningSuggestions.category.rule,
              descriptionOperator: categoryLearningOperator,
            });
          } catch (error) {
            if (error instanceof ApiClientError && error.code === 'IMPORT_RULE_EQUIVALENT') {
              // The correction is already automated; do not duplicate it.
            } else {
              throw new Error(
                `Transação salva, mas não foi possível criar a regra: ${error instanceof Error ? error.message : 'erro inesperado'}`,
              );
            }
          }
        }
      } else if (offlineOwnerUserId) {
        const queuePayload = {
          ...payload,
          type: category.type,
        };
        const serializedPayload = JSON.stringify(queuePayload);
        // A tentativa, e não os dados financeiros, identifica um retry.
        const previousAttempt = createAttemptRef.current;
        if (previousAttempt && previousAttempt.payload !== serializedPayload) {
          throw new Error(
            'Existe uma tentativa anterior com resultado incerto. Revise ou descarte o item na fila antes de alterar o lançamento.',
          );
        }
        const attempt = previousAttempt ?? {
          id: globalThis.crypto.randomUUID(),
          key: globalThis.crypto.randomUUID(),
          payload: serializedPayload,
        };
        createAttemptRef.current = attempt;
        let queued = readOfflineTransactionQueue(offlineOwnerUserId).find(
          (item) => item.id === attempt.id,
        );

        if (!queued) {
          try {
            queued = enqueueOfflineTransaction(
              offlineOwnerUserId,
              queuePayload,
              {
                id: attempt.id,
                idempotencyKey: attempt.key,
                sourceDraftId: offlineDraftId ?? undefined,
              },
            );
          } catch (error) {
            if (!(error instanceof OfflineTransactionQueueStorageError)) {
              throw error;
            }
            // Retry remains safe in this tab, but the attempt cannot survive reload.
            setStorageUnavailable(true);
            try {
              const response = await transactionService.createIdempotent(queuePayload, attempt.key);
              savedTransaction = response.data;
              createAttemptRef.current = null;
            } catch (requestError) {
              if (requestError instanceof ApiClientError && (requestError.status === 400 || requestError.status === 422)) {
                createAttemptRef.current = null;
              }
              throw requestError;
            }
          }
        }

        if (queued) {
          onOfflineQueueChanged?.();

          try {
            const { result } = await syncOfflineTransactionQueueItem(
              offlineOwnerUserId,
              queued.id,
              (queuedPayload, idempotencyKey) =>
                transactionService.createIdempotent(
                  queuedPayload,
                  idempotencyKey,
                ),
              { discardOnValidation: true },
            );
            savedTransaction = result.data;
            createAttemptRef.current = null;
            onOfflineQueueChanged?.();
          } catch (error) {
            // A rejected validation never created a transaction: corrections
            // are new attempts and must not retain the old payload or key.
            if (error instanceof ApiClientError && (error.status === 400 || error.status === 422)) {
              createAttemptRef.current = null;
            }
            onOfflineQueueChanged?.();
            throw error;
          }
        }
      } else {
        // A normal create must be idempotent even if a queue owner is unavailable.
        const serializedPayload = JSON.stringify(payload);
        const previousAttempt = createAttemptRef.current;
        if (previousAttempt && previousAttempt.payload !== serializedPayload) {
          throw new Error('Há uma tentativa anterior com resultado incerto. Reenvie os mesmos dados antes de alterá-los.');
        }
        const attempt = previousAttempt ?? {
          id: globalThis.crypto.randomUUID(),
          key: globalThis.crypto.randomUUID(),
          payload: serializedPayload,
        };
        createAttemptRef.current = attempt;
        try {
          const response = await transactionService.createIdempotent(payload, attempt.key);
          savedTransaction = response.data;
          createAttemptRef.current = null;
        } catch (requestError) {
          if (requestError instanceof ApiClientError && (requestError.status === 400 || requestError.status === 422)) {
            createAttemptRef.current = null;
          }
          throw requestError;
        }
      }

      handleRedirect(savedTransaction);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Erro ao salvar transação',
      );
    } finally {
      submitInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  function validatePrimaryFields() {
    if (!Number.isInteger(formData.amount) || formData.amount <= 0) {
      return 'Informe um valor maior que zero';
    }
    if (formData.amount > 1_000_000_000) {
      return 'O valor excede o limite permitido por transação';
    }
    if (reviewingQueueItem && !accounts.some((account) => account.id === formData.accountId)) {
      return 'Conta removida ou indisponível. Escolha uma conta válida.';
    }
    if (reviewingQueueItem && !categories.some((category) => category.id === formData.categoryId && category.type === reviewingQueueItem.payload.type)) {
      return 'Categoria removida ou incompatível. Escolha uma categoria válida.';
    }
    if (reviewingQueueItem && (formData.tagIds ?? []).some((id) => !tags.some((tag) => tag.id === id && tag.isActive))) {
      return 'Revise as tags inativas ou removidas.';
    }
    if (reviewingQueueItem && formData.merchantId && !merchants.some((merchant) => merchant.id === formData.merchantId)) {
      return 'Revise o estabelecimento indisponível.';
    }
    if (!formData.accountId) {
      return 'Selecione uma conta';
    }
    if (!formData.categoryId) {
      return 'Selecione uma categoria';
    }
    if (!formData.description.trim()) {
      return 'Informe uma descrição';
    }
    if (formData.description.trim().length > 100) {
      return 'A descrição deve ter no máximo 100 caracteres';
    }
    if (formData.allocations?.length) {
      if (formData.allocations.length < 2) return 'A divisão precisa ter pelo menos duas categorias';
      if (formData.allocations.some((item) => !item.categoryId || item.amount <= 0)) return 'Preencha categoria e valor de todas as divisões';
      if (new Set(formData.allocations.map((item) => item.categoryId)).size !== formData.allocations.length) return 'Cada categoria pode aparecer apenas uma vez na divisão';
      if (!formData.allocations.some((item) => item.categoryId === formData.categoryId)) return 'A categoria principal deve participar da divisão';
      if (formData.allocations.reduce((sum, item) => sum + item.amount, 0) !== formData.amount) return 'A soma das divisões deve ser igual ao valor da transação';
    }
    return null;
  }

  function validateAdvancedFields() {
    if (creationMode === 'recurring' && !isEditing) {
      if (recurrencePreview.error || recurrencePreview.dates.length < 2) {
        return recurrencePreview.error || 'Recorrência inválida';
      }
    }

    if (creationMode === 'installment' && !isEditing) {
      if (installmentPreview.error || installmentPreview.occurrences.length < 2) {
        return installmentPreview.error || 'Parcelamento inválido';
      }
    }

    return null;
  }

  function advanceMobilePrimaryStep() {
    setSubmitError(null);
    const validationError = validatePrimaryFields();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    setMobileStep(2);
  }

  function advanceMobileAdvancedStep() {
    setSubmitError(null);
    const validationError = validateAdvancedFields();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    setMobileStep(3);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const primaryError = validatePrimaryFields();
    if (primaryError) {
      setSubmitError(primaryError);
      return;
    }

    if ((!isEditing && !onSuccess) || (isEditing && hasLearningSuggestions)) {
      setReviewOpen(true);
      return;
    }

    void persistTransaction();
  }

  const loading = isSubmitting || loadingData;

  async function addTagFromDraft() {
    const name = normalizeTagDisplayName(tagDraft);
    if (!name) return;
    if ((formData.tagIds?.length ?? 0) >= 10) {
      setSubmitError('Uma transação pode ter no máximo 10 tags');
      return;
    }

    try {
      setSubmitError(null);
      const normalizedName = normalizeTagNameKey(name);
      let tag = tags.find(
        (item) => normalizeTagNameKey(item.name) === normalizedName,
      );

      if (!tag) {
        const options = await tagService.getActiveOptions(name);
        tag = (options.data.items ?? []).find(
          (item) => normalizeTagNameKey(item.name) === normalizedName,
        );
      }

      if (!tag) {
        try {
          const response = await tagService.create({ name });
          tag = response.data;
        } catch (error) {
          if (
            error instanceof ApiClientError &&
            error.code === 'TAG_NAME_CONFLICT'
          ) {
            const options = await tagService.getActiveOptions(name);
            tag = (options.data.items ?? []).find(
              (item) => normalizeTagNameKey(item.name) === normalizedName,
            );
            if (!tag) {
              throw new Error(
                'Essa tag já existe arquivada. Reative-a na página de Tags para usá-la novamente.',
              );
            }
          } else {
            throw error;
          }
        }
      }

      const resolvedTag = tag;
      setTags((current) => {
        const merged = new Map(
          [...current, resolvedTag].map((item) => [item.id, item]),
        );
        return [...merged.values()].sort((left, right) =>
          left.name.localeCompare(right.name, 'pt-BR'),
        );
      });
      setFormData((previous) => ({
        ...previous,
        tagIds: previous.tagIds?.includes(resolvedTag.id)
          ? previous.tagIds
          : [...(previous.tagIds ?? []), resolvedTag.id],
      }));
      setTagDraft('');
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Erro ao adicionar tag',
      );
    }
  }

  function renderTagEditor(idSuffix: 'mobile' | 'desktop') {
    const datalistId = `${tagOptionsId}-${idSuffix}`;
    const selected = tags.filter((tag) => formData.tagIds?.includes(tag.id));

    return (
      <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-subtle)] p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
          <FaTag aria-hidden="true" />
          Tags
          <span className="font-normal text-[var(--text-muted)]">opcional · até 10</span>
        </div>
        {selected.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {selected.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => setFormData((previous) => ({
                  ...previous,
                  tagIds: (previous.tagIds ?? []).filter((id) => id !== tag.id),
                }))}
                className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--foreground)]"
                aria-label={`Remover tag ${tag.name}`}
              >
                #{tag.name}{!tag.isActive ? ' · arquivada' : ''} ×
              </button>
            ))}
          </div>
        ) : null}
        <div className="mt-2 flex gap-2">
          <input
            list={datalistId}
            value={tagDraft}
            onChange={(event) => setTagDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void addTagFromDraft();
              }
            }}
            maxLength={41}
            disabled={loading || (formData.tagIds?.length ?? 0) >= 10}
            placeholder="Digite ou escolha uma tag"
            className="ds-control min-h-11 min-w-0 flex-1 bg-[var(--surface)] px-3 text-sm"
            aria-label="Adicionar tag"
          />
          <datalist id={datalistId}>
            {tags
              .filter((tag) => tag.isActive && !formData.tagIds?.includes(tag.id))
              .map((tag) => <option key={tag.id} value={tag.name} />)}
          </datalist>
          <Button type="button" variant="secondary" onClick={() => void addTagFromDraft()} disabled={loading || !tagDraft.trim()}>
            Adicionar
          </Button>
        </div>
      </div>
    );
  }

  function renderAllocationEditor() {
    if (creationMode !== 'single' || !formData.categoryId) return null;
    const allocations = formData.allocations ?? [];
    const splitEnabled = allocations.length > 0;
    const availableCategories = categories.filter(
      (category) =>
        category.type === effectiveCategoryFilter &&
        (category.isActive || category.id === formData.categoryId),
    );

    return (
      <div className="rounded-[12px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-subtle)] p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <strong className="text-sm text-[var(--foreground)]">Dividir em categorias</strong>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">O saldo continua sendo uma única transação.</p>
          </div>
          <Button type="button" variant="secondary" disabled={loading} onClick={() =>
            setFormData((previous) => ({
              ...previous,
              allocations: splitEnabled ? [] : [
                { categoryId: previous.categoryId, amount: previous.amount },
                { categoryId: '', amount: 0 },
              ],
            }))
          }>
            {splitEnabled ? 'Remover divisão' : 'Dividir'}
          </Button>
        </div>
        {splitEnabled && (
          <div className="mt-3 grid gap-2">
            {allocations.map((allocation, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_auto]">
                <select aria-label={`Categoria da divisão ${index + 1}`} value={allocation.categoryId} disabled={loading || index === 0}
                  onChange={(event) => setFormData((previous) => ({
                    ...previous,
                    allocations: (previous.allocations ?? []).map((item, itemIndex) => itemIndex === index ? { ...item, categoryId: event.target.value } : item),
                  }))}
                  className="ds-control min-h-11 w-full bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]">
                  <option value="">Selecione a categoria</option>
                  {availableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <input aria-label={`Valor da divisão ${index + 1}`} type="number" min="0.01" step="0.01"
                  value={allocation.amount > 0 ? (allocation.amount / 100).toFixed(2) : ''} disabled={loading}
                  onChange={(event) => {
                    const amount = Math.round(Number(event.target.value || 0) * 100);
                    setFormData((previous) => ({
                      ...previous,
                      allocations: (previous.allocations ?? []).map((item, itemIndex) => itemIndex === index ? { ...item, amount } : item),
                    }));
                  }}
                  className="ds-control min-h-11 w-full bg-[var(--surface)] px-3 text-right text-sm text-[var(--foreground)]" placeholder="0,00" />
                <button type="button" disabled={loading || allocations.length <= 2 || index === 0} onClick={() =>
                  setFormData((previous) => ({ ...previous, allocations: (previous.allocations ?? []).filter((_, itemIndex) => itemIndex !== index) }))
                } className="min-h-11 rounded-[10px] border border-[var(--border)] px-3 text-sm font-semibold text-[var(--text-muted)] disabled:opacity-40">
                  Remover
                </button>
              </div>
            ))}
            <button type="button" disabled={loading || allocations.length >= 20}
              onClick={() => setFormData((previous) => ({ ...previous, allocations: [...(previous.allocations ?? []), { categoryId: '', amount: 0 }] }))}
              className="min-h-11 rounded-[10px] border border-dashed border-[var(--border-strong)] px-3 text-sm font-semibold text-[var(--orbit-primary)] disabled:opacity-40">
              + Adicionar categoria
            </button>
            <p className="text-xs text-[var(--text-muted)]">Total dividido: {formatCentsToCurrency(allocations.reduce((sum, item) => sum + item.amount, 0))} de {formatCentsToCurrency(formData.amount)}</p>
          </div>
        )}
      </div>
    );
  }
  const accountOptions = accounts
    .filter((account) => account.isActive || account.id === formData.accountId)
    .map((account) => ({
      value: account.id,
      label: account.name,
      color: account.color,
      icon: account.icon,
    }));
  const categoryOptions = [
    {
      type: 'INCOME' as const,
      label: 'Receitas',
      options: categories
        .filter((category) => category.type === 'INCOME' && (category.isActive || category.id === formData.categoryId))
        .map((category) => ({
          value: category.id,
          label: category.name,
          color: category.color,
          icon: category.icon,
        })),
    },
    {
      type: 'EXPENSE' as const,
      label: 'Despesas',
      options: categories
        .filter((category) => category.type === 'EXPENSE' && (category.isActive || category.id === formData.categoryId))
        .map((category) => ({ value: category.id, label: category.name })),
    },
  ]
    .filter((group) => !effectiveCategoryFilter || group.type === effectiveCategoryFilter)
    .map(({ label, options }) => ({ label, options }));
  const isFixedDate = Boolean(initialDate);
  const firstRecurrenceDate = recurrencePreview.dates[0];
  const lastRecurrenceDate = recurrencePreview.dates.at(-1);
  const firstInstallment = installmentPreview.occurrences[0];
  const lastInstallment = installmentPreview.occurrences.at(-1);
  const installmentTotal = installmentPreview.occurrences.reduce(
    (total, installment) => total + installment.amount,
    0,
  );
  const installmentAmounts = [
    ...new Set(installmentPreview.occurrences.map((item) => item.amount)),
  ];
  const operationType = effectiveCategoryFilter;
  const operationLabel =
    operationType === 'INCOME'
      ? 'Receita'
      : operationType === 'EXPENSE'
        ? 'Despesa'
        : 'Selecione o tipo';
  const selectedStatusLabel =
    statusOptions.find((option) => option.value === formData.status)?.label ?? formData.status;
  const selectedDateLabel = formatPtBrLogicalDate({
    year: formData.year,
    month: formData.month,
    day: formData.day,
  });
  const recurrencePresetLabel = getRecurrencePresetLabel(recurrencePreset);
  const creationModeLabel =
    creationMode === 'single'
      ? 'Única'
      : creationMode === 'recurring'
        ? `Recorrente ${recurrencePresetLabel.toLowerCase()}`
        : 'Parcelada';
  const createLabel =
    creationMode === 'recurring'
      ? 'Criar recorrência'
      : creationMode === 'installment'
        ? 'Criar parcelamento'
        : 'Criar transação';
  return { transaction, isEditing, onSuccess, onSelectTransfer, reviewingQueueItem, formData, setFormData, creationMode, setCreationMode, recurrencePreset, setRecurrencePreset, recurrenceMode, setRecurrenceMode, occurrenceCount, setOccurrenceCount, recurrenceEndDate, setRecurrenceEndDate, installmentCount, setInstallmentCount, merchants, reviewOpen, setReviewOpen, learnMerchantCorrection, setLearnMerchantCorrection, learnCategoryCorrection, setLearnCategoryCorrection, merchantLearningOperator, setMerchantLearningOperator, categoryLearningOperator, setCategoryLearningOperator, submitError, setSubmitError, storageUnavailable, isSubmitting, isDesktop, mobileStep, setMobileStep, merchantRecognition, amountInputRef, desktopDateInputRef, selectedAccount, selectedCategory, selectedMerchant, learningSuggestions, hasLearningSuggestions, displayValue, formatCentsToCurrency, recurrencePreview, installmentPreview, handleCancel, moveCursorToEnd, handleAmountChange, handleMerchantChange, handleDescriptionChange, receiptOcrFormState, handleReceiptOcrApplication, handleCategoryType, handleCategoryChange, persistTransaction, advanceMobilePrimaryStep, advanceMobileAdvancedStep, handleSubmit, loading, renderTagEditor, renderAllocationEditor, accountOptions, categoryOptions, isFixedDate, firstRecurrenceDate, lastRecurrenceDate, firstInstallment, lastInstallment, installmentTotal, installmentAmounts, operationType, operationLabel, selectedStatusLabel, selectedDateLabel, recurrencePresetLabel, creationModeLabel, createLabel };
}

export type TransactionFormState = ReturnType<typeof useTransactionForm>;
