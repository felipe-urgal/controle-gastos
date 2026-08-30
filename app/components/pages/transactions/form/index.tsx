'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FaCalendarAlt, FaCreditCard, FaRedoAlt } from 'react-icons/fa';

import { FormActions, FormContainer } from '@/app/components/forms';
import { Button, Input, RadioGroup, Select } from '@/app/components/ui';
import { statusOptions } from '@/app/lib/constants/transaction.constants';
import { useCurrencyFormatter } from '@/app/lib/currency/format-currency';
import { FormData } from '@/app/lib/interface/transaction.interface';
import { buildInstallmentOccurrences } from '@/app/lib/transactions/installments';
import {
  formatIsoLogicalDate,
  formatPtBrLogicalDate,
  generateMonthlyDates,
  MAX_MONTHLY_OCCURRENCES,
  parseIsoLogicalDate,
} from '@/app/lib/transactions/monthly-recurrence';
import { accountService } from '@/app/services/account-service';
import { categoryService } from '@/app/services/category-service';
import { transactionService } from '@/app/services/transaction-service';
import { AccountModel } from '@/app/types/account';
import { CategoryModel } from '@/app/types/category';
import { TransactionDTO, TransactionStatus } from '@/app/types/transaction';

interface TransactionFormProps {
  transaction?: any;
  isEditing: boolean;
  initialDate?: Date;
  initialValues?: FormData;
  onSuccess?: (savedTransaction?: any) => void;
  onCancelOverride?: () => void;
}

type CreationMode = 'single' | 'recurring' | 'installment';
type RecurrenceMode = 'count' | 'endDate';

export default function TransactionForm({
  transaction,
  isEditing,
  initialDate,
  initialValues,
  onSuccess,
  onCancelOverride,
}: TransactionFormProps) {
  const router = useRouter();
  const baseDate = initialDate ?? new Date();

  const [formData, setFormData] = useState<FormData>({
    amount: 0,
    month: baseDate.getMonth() + 1,
    year: baseDate.getFullYear(),
    day: baseDate.getDate(),
    description: '',
    status: 'COMPLETED',
    accountId: '',
    categoryId: '',
  });
  const [creationMode, setCreationMode] = useState<CreationMode>('single');
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>('count');
  const [occurrenceCount, setOccurrenceCount] = useState(12);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [installmentCount, setInstallmentCount] = useState(2);
  const [accounts, setAccounts] = useState<AccountModel[]>([]);
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const selectedAccount = accounts.find((account) => account.id === formData.accountId);
  const selectedCategory = categories.find((category) => category.id === formData.categoryId);
  const { displayValue, setDisplayValue, formatCentsToCurrency } = useCurrencyFormatter({
    initialValue: 'R$ 0,00',
    currency: selectedAccount?.currency || 'BRL',
  });

  useEffect(() => {
    if (initialValues) {
      setFormData(initialValues);
      return;
    }

    if (isEditing && transaction) {
      setFormData({
        amount: transaction.amount,
        month: transaction.month,
        year: transaction.year,
        day: transaction.day,
        description: transaction.description || '',
        status: transaction.status,
        accountId: transaction.account?.id || '',
        categoryId: transaction.category?.id || '',
      });
      return;
    }

    if (!isEditing && initialDate) {
      setFormData((previous) => ({
        ...previous,
        day: initialDate.getDate(),
        month: initialDate.getMonth() + 1,
        year: initialDate.getFullYear(),
      }));
    }
  }, [isEditing, transaction, initialDate, initialValues]);

  useEffect(() => {
    async function loadData() {
      try {
        const [accountsResponse, categoriesResponse] = await Promise.all([
          accountService.getAll(),
          categoryService.getAll(),
        ]);
        setAccounts(accountsResponse.data?.items || []);
        setCategories(categoriesResponse.data?.items || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    setDisplayValue(formatCentsToCurrency(formData.amount));
  }, [formData.amount, formatCentsToCurrency, setDisplayValue]);

  const recurrencePreview = useMemo(() => {
    if (creationMode !== 'recurring' || isEditing) {
      return { dates: [], error: null as string | null };
    }

    const start = {
      year: formData.year,
      month: formData.month,
      day: formData.day,
    };

    try {
      if (recurrenceMode === 'count') {
        return {
          dates: generateMonthlyDates(start, {
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
        dates: generateMonthlyDates(start, { mode: 'endDate', endDate }),
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
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

      let savedTransaction: TransactionDTO | null = null;

      if (!isEditing && creationMode === 'recurring') {
        if (recurrencePreview.error || recurrencePreview.dates.length < 2) {
          throw new Error(recurrencePreview.error || 'Recorrência inválida');
        }

        const recurrence =
          recurrenceMode === 'count'
            ? { mode: 'count' as const, occurrences: occurrenceCount }
            : { mode: 'endDate' as const, endDate: recurrenceEndDate };

        const response = await transactionService.createMonthlyRecurring({
          transaction: payload,
          recurrence,
        });
        savedTransaction = response.data.firstOccurrence;
      } else if (!isEditing && creationMode === 'installment') {
        if (category.type !== 'EXPENSE') {
          throw new Error('Parcelamento está disponível apenas para despesas');
        }

        if (installmentPreview.error || installmentPreview.occurrences.length < 2) {
          throw new Error(installmentPreview.error || 'Parcelamento inválido');
        }

        const response = await transactionService.createInstallments({
          transaction: {
            ...payload,
            type: 'EXPENSE' as const,
          },
          installmentCount,
        });
        savedTransaction = response.data.firstOccurrence;
      } else if (isEditing && transaction) {
        const response = await transactionService.update(transaction.id, payload);
        savedTransaction = response.data;
      } else {
        const response = await transactionService.create(payload);
        savedTransaction = response.data;
      }

      handleRedirect(savedTransaction);
    } catch (error: any) {
      const message =
        error?.response?.data?.error?.message ||
        error?.message ||
        'Erro ao salvar transação';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const loading = isSubmitting || loadingData;
  const accountOptions = accounts
    .filter((account) => account.isActive)
    .map((account) => ({ value: account.id, label: account.name }));
  const categoryOptions = [
    {
      label: 'Receitas',
      options: categories
        .filter((category) => category.type === 'INCOME')
        .map((category) => ({ value: category.id, label: category.name })),
    },
    {
      label: 'Despesas',
      options: categories
        .filter((category) => category.type === 'EXPENSE')
        .map((category) => ({ value: category.id, label: category.name })),
    },
  ];
  const isFixedDate = Boolean(initialDate);
  const firstRecurrenceDate = recurrencePreview.dates[0];
  const lastRecurrenceDate = recurrencePreview.dates.at(-1);
  const firstInstallment = installmentPreview.occurrences[0];
  const lastInstallment = installmentPreview.occurrences.at(-1);
  const installmentTotal = installmentPreview.occurrences.reduce(
    (total, installment) => total + installment.amount,
    0,
  );
  const installmentAmounts = [...new Set(installmentPreview.occurrences.map((item) => item.amount))];

  return (
    <FormContainer
      onSubmit={handleSubmit}
      error={submitError}
      onClearError={() => setSubmitError(null)}
      className="mt-2 gap-0"
    >
      <section className="space-y-4 pb-5" aria-labelledby="transaction-main-fields">
        <div>
          <h2 id="transaction-main-fields" className="text-xl font-semibold text-[var(--foreground)]">
            Dados da transação
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
            Defina onde o lançamento será registrado e como ele deve aparecer na sua movimentação.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Conta"
            value={formData.accountId}
            onChange={(value) => setFormData({ ...formData, accountId: String(value) })}
            options={accountOptions}
            disabled={loading}
            required
            placeholder="Selecione uma conta"
          />

          <Select
            label="Categoria"
            value={formData.categoryId}
            onChange={(value) => setFormData({ ...formData, categoryId: String(value) })}
            options={categoryOptions}
            disabled={loading}
            required
            grouped
            placeholder="Selecione uma categoria"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(180px,.8fr)_minmax(0,1.7fr)]">
          <Input
            ref={amountInputRef}
            label={creationMode === 'installment' ? 'Valor total' : 'Valor'}
            value={displayValue}
            onChange={handleAmountChange}
            onFocus={moveCursorToEnd}
            onClick={moveCursorToEnd}
            disabled={loading}
            required
            inputMode="numeric"
          />

          <Input
            label="Descrição"
            value={formData.description}
            onChange={(event) =>
              setFormData({ ...formData, description: event.target.value })
            }
            disabled={loading}
            required
            placeholder="Ex.: Supermercado, salário, aluguel..."
          />
        </div>
      </section>

      <section
        className="space-y-4 border-t border-[var(--border)] py-5"
        aria-labelledby="transaction-date-status"
      >
        <div>
          <h2 id="transaction-date-status" className="text-xl font-semibold text-[var(--foreground)]">
            Data e status
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
            O status determina quando a movimentação participa dos cálculos financeiros.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          <div className="space-y-3">
            {!isFixedDate && (
              <>
                <Input
                  label={creationMode === 'installment' ? 'Data da primeira parcela' : 'Data'}
                  type="date"
                  value={formatIsoLogicalDate({
                    year: formData.year,
                    month: formData.month,
                    day: formData.day,
                  })}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (!value) return;
                    const [year, month, day] = value.split('-').map(Number);
                    setFormData({ ...formData, day, month, year });
                  }}
                  disabled={loading}
                  required
                />

                <Button
                  type="button"
                  variant="link"
                  onClick={() => {
                    const now = new Date();
                    setFormData({
                      ...formData,
                      day: now.getDate(),
                      month: now.getMonth() + 1,
                      year: now.getFullYear(),
                    });
                  }}
                  disabled={loading}
                  icon={<FaCalendarAlt />}
                  className="w-auto self-start !border-0 !bg-transparent !p-0 !shadow-none hover:!bg-transparent"
                >
                  Usar data atual
                </Button>
              </>
            )}

            {isFixedDate && (
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
                <p className="text-sm font-medium text-[var(--text-muted)]">
                  {creationMode === 'installment' ? 'Primeira parcela' : 'Data selecionada'}
                </p>
                <p className="mt-1 text-base font-semibold text-[var(--foreground)]">
                  {formatPtBrLogicalDate({
                    year: formData.year,
                    month: formData.month,
                    day: formData.day,
                  })}
                </p>
              </div>
            )}
          </div>

          <RadioGroup
            required
            name="status"
            label={creationMode === 'installment' ? 'Status da primeira parcela' : 'Status'}
            value={formData.status}
            onChange={(value) =>
              setFormData({ ...formData, status: value as TransactionStatus })
            }
            options={statusOptions}
            disabled={loading}
          />
        </div>
      </section>

      {!isEditing && (
        <section
          className="space-y-4 border-t border-[var(--border)] py-5"
          aria-labelledby="transaction-creation-mode"
        >
          <div>
            <h2 id="transaction-creation-mode" className="text-xl font-semibold text-[var(--foreground)]">
              Forma de lançamento
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
              Escolha entre uma transação única, uma recorrência mensal ou uma despesa parcelada.
            </p>
          </div>

          <RadioGroup
            name="creation-mode"
            label="Criar como"
            value={creationMode}
            onChange={(value) => setCreationMode(value as CreationMode)}
            disabled={loading}
            options={[
              { value: 'single', label: 'Única' },
              { value: 'recurring', label: 'Recorrente' },
              { value: 'installment', label: 'Parcelada' },
            ]}
          />

          {creationMode === 'recurring' && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <FaRedoAlt className="mt-1 shrink-0 text-[var(--primary)]" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-[var(--foreground)]">Repetir mensalmente</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
                    Crie agora uma série finita de lançamentos. Nenhuma nova ocorrência é gerada ao abrir páginas.
                  </p>

                  <div className="mt-5 space-y-4 border-t border-[var(--border)] pt-5">
                    <RadioGroup
                      name="recurrence-mode"
                      label="Terminar recorrência por"
                      value={recurrenceMode}
                      onChange={(value) => setRecurrenceMode(value as RecurrenceMode)}
                      disabled={loading}
                      options={[
                        { value: 'count', label: 'Quantidade' },
                        { value: 'endDate', label: 'Data final' },
                      ]}
                    />

                    <div className="max-w-md">
                      {recurrenceMode === 'count' ? (
                        <Input
                          label="Quantidade de ocorrências"
                          type="number"
                          min={2}
                          max={MAX_MONTHLY_OCCURRENCES}
                          value={occurrenceCount}
                          onChange={(event) => setOccurrenceCount(Number(event.target.value))}
                          disabled={loading}
                          required
                        />
                      ) : (
                        <Input
                          label="Data final"
                          type="date"
                          value={recurrenceEndDate}
                          min={formatIsoLogicalDate({
                            year: formData.year,
                            month: formData.month,
                            day: formData.day,
                          })}
                          onChange={(event) => setRecurrenceEndDate(event.target.value)}
                          disabled={loading}
                          required
                        />
                      )}
                    </div>

                    <div
                      className={`rounded-[var(--radius-md)] border p-4 text-sm leading-relaxed ${
                        recurrencePreview.error
                          ? 'border-[var(--danger)]/35 bg-[var(--danger-subtle)] text-[var(--expense)]'
                          : 'border-[var(--primary)]/30 bg-[var(--primary-subtle)] text-[var(--foreground)]'
                      }`}
                      role={recurrencePreview.error ? 'alert' : 'status'}
                    >
                      {recurrencePreview.error ? (
                        recurrencePreview.error
                      ) : firstRecurrenceDate && lastRecurrenceDate ? (
                        <>
                          <strong>{recurrencePreview.dates.length} ocorrências</strong> de{' '}
                          {formatPtBrLogicalDate(firstRecurrenceDate)} até{' '}
                          {formatPtBrLogicalDate(lastRecurrenceDate)}. A primeira mantém o status escolhido; as{' '}
                          {recurrencePreview.dates.length - 1} seguintes serão criadas como pendentes.
                        </>
                      ) : (
                        'Configure a recorrência para visualizar o período antes de confirmar.'
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {creationMode === 'installment' && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <FaCreditCard className="mt-1 shrink-0 text-[var(--primary)]" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-[var(--foreground)]">Parcelar despesa</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
                    O valor informado é o total da compra. Os centavos são distribuídos exatamente entre as parcelas.
                  </p>

                  <div className="mt-5 space-y-4 border-t border-[var(--border)] pt-5">
                    <div className="max-w-md">
                      <Input
                        label="Quantidade de parcelas"
                        type="number"
                        min={2}
                        max={MAX_MONTHLY_OCCURRENCES}
                        value={installmentCount}
                        onChange={(event) => setInstallmentCount(Number(event.target.value))}
                        disabled={loading}
                        required
                      />
                    </div>

                    <div
                      className={`rounded-[var(--radius-md)] border p-4 text-sm leading-relaxed ${
                        installmentPreview.error
                          ? 'border-[var(--danger)]/35 bg-[var(--danger-subtle)] text-[var(--expense)]'
                          : 'border-[var(--primary)]/30 bg-[var(--primary-subtle)] text-[var(--foreground)]'
                      }`}
                      role={installmentPreview.error ? 'alert' : 'status'}
                    >
                      {installmentPreview.error ? (
                        installmentPreview.error
                      ) : firstInstallment && lastInstallment ? (
                        <div className="space-y-2">
                          <p>
                            <strong>{installmentPreview.occurrences.length} parcelas</strong> de{' '}
                            {formatPtBrLogicalDate(firstInstallment)} até{' '}
                            {formatPtBrLogicalDate(lastInstallment)}.
                          </p>
                          <p>
                            {installmentAmounts.length === 1 ? (
                              <>
                                Cada parcela: <strong>{formatCentsToCurrency(installmentAmounts[0])}</strong>.
                              </>
                            ) : (
                              <>
                                Valores entre <strong>{formatCentsToCurrency(Math.min(...installmentAmounts))}</strong> e{' '}
                                <strong>{formatCentsToCurrency(Math.max(...installmentAmounts))}</strong>; os centavos restantes ficam nas primeiras parcelas.
                              </>
                            )}
                          </p>
                          <p>
                            Total conferido: <strong>{formatCentsToCurrency(installmentTotal)}</strong>. A primeira mantém o status escolhido; as{' '}
                            {installmentPreview.occurrences.length - 1} seguintes serão criadas como pendentes.
                          </p>
                        </div>
                      ) : (
                        'Selecione uma categoria de despesa e informe valor e quantidade para visualizar o parcelamento.'
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      <FormActions
        isEditing={isEditing}
        loading={loading}
        onCancel={handleCancel}
        createLabel={
          creationMode === 'recurring'
            ? 'Criar recorrência'
            : creationMode === 'installment'
              ? 'Criar parcelamento'
              : 'Criar transação'
        }
        submitLabel="Salvar alterações"
      />
    </FormContainer>
  );
}
