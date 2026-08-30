"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCurrencyFormatter } from "@/app/lib/currency/format-currency";
import { FaCalendarAlt } from "react-icons/fa";
import { transactionService } from "@/app/services/transaction-service";
import { accountService } from "@/app/services/account-service";
import { categoryService } from "@/app/services/category-service";
import { TransactionStatus } from "@/app/types/transaction";
import { AccountModel } from "@/app/types/account";
import { CategoryModel } from "@/app/types/category";
import { Input, Select, Button, RadioGroup } from "@/app/components/ui";
import { FormContainer, FormActions } from "@/app/components/forms";
import { FormData } from "@/app/lib/interface/transaction.interface";
import { statusOptions } from "@/app/lib/constants/transaction.constants";
import {
  formatIsoLogicalDate,
  formatPtBrLogicalDate,
  generateMonthlyDates,
  MAX_MONTHLY_OCCURRENCES,
  parseIsoLogicalDate,
} from "@/app/lib/transactions/monthly-recurrence";

interface TransactionFormProps {
  transaction?: any;
  isEditing: boolean;
  initialDate?: Date;
  initialValues?: FormData;
  onSuccess?: (savedTransaction?: any) => void;
  onCancelOverride?: () => void;
}

type RecurrenceMode = "count" | "endDate";

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
    description: "",
    status: "COMPLETED",
    accountId: "",
    categoryId: "",
  });
  const [repeatMonthly, setRepeatMonthly] = useState(false);
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>("count");
  const [occurrenceCount, setOccurrenceCount] = useState(12);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [accounts, setAccounts] = useState<AccountModel[]>([]);
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const selectedAccount = accounts.find((a) => a.id === formData.accountId);
  const { displayValue, setDisplayValue, formatCentsToCurrency } =
    useCurrencyFormatter({
      initialValue: "R$ 0,00",
      currency: selectedAccount?.currency || "BRL",
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
        description: transaction.description || "",
        status: transaction.status,
        accountId: transaction.account?.id || "",
        categoryId: transaction.category?.id || "",
      });
      return;
    }

    if (!isEditing && initialDate) {
      setFormData((prev) => ({
        ...prev,
        day: initialDate.getDate(),
        month: initialDate.getMonth() + 1,
        year: initialDate.getFullYear(),
      }));
    }
  }, [isEditing, transaction, initialDate, initialValues]);

  useEffect(() => {
    async function loadData() {
      try {
        const [accountsRes, categoriesRes] = await Promise.all([
          accountService.getAll(),
          categoryService.getAll(),
        ]);
        setAccounts(accountsRes.data?.items || []);
        setCategories(categoriesRes.data?.items || []);
      } catch (err) {
        console.error(err);
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
    if (!repeatMonthly || isEditing) {
      return { dates: [], error: null as string | null };
    }

    const start = {
      year: formData.year,
      month: formData.month,
      day: formData.day,
    };

    try {
      if (recurrenceMode === "count") {
        return {
          dates: generateMonthlyDates(start, {
            mode: "count",
            occurrences: occurrenceCount,
          }),
          error: null,
        };
      }

      const endDate = parseIsoLogicalDate(recurrenceEndDate);
      if (!endDate) {
        return { dates: [], error: "Informe uma data final válida" };
      }

      return {
        dates: generateMonthlyDates(start, { mode: "endDate", endDate }),
        error: null,
      };
    } catch (error) {
      return {
        dates: [],
        error: error instanceof Error ? error.message : "Recorrência inválida",
      };
    }
  }, [
    repeatMonthly,
    isEditing,
    formData.year,
    formData.month,
    formData.day,
    recurrenceMode,
    occurrenceCount,
    recurrenceEndDate,
  ]);

  function handleRedirect(savedTransaction?: any) {
    if (onSuccess) {
      onSuccess(savedTransaction);
      return;
    }

    if (isEditing && transaction?.id) {
      router.replace(`/transacoes/show/${transaction.id}`);
    } else {
      router.replace("/transacoes");
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const raw = e.target.value.replace(/\D/g, "");
    const cents = Number(raw || 0);
    setFormData((prev) => ({ ...prev, amount: cents }));
    setDisplayValue(formatCentsToCurrency(cents));
    moveCursorToEnd();
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const selectedCategory = categories.find(
        (c) => c.id === formData.categoryId
      );

      if (!selectedCategory) {
        throw new Error("Categoria inválida");
      }

      const payload = {
        ...formData,
        type: selectedCategory.type,
        description: formData.description || "",
      };

      let savedTransaction = null;

      if (!isEditing && repeatMonthly) {
        if (recurrencePreview.error || recurrencePreview.dates.length < 2) {
          throw new Error(recurrencePreview.error || "Recorrência inválida");
        }

        const recurrence =
          recurrenceMode === "count"
            ? { mode: "count" as const, occurrences: occurrenceCount }
            : { mode: "endDate" as const, endDate: recurrenceEndDate };

        const response = await transactionService.createMonthlyRecurring({
          transaction: payload,
          recurrence,
        });
        savedTransaction = response.data.firstOccurrence;
      } else if (isEditing && transaction) {
        const response = await transactionService.update(transaction.id, payload);
        savedTransaction = response?.data?.item || response?.data || null;
      } else {
        const response = await transactionService.create(payload);
        savedTransaction = response?.data?.item || response?.data || null;
      }

      handleRedirect(savedTransaction);
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message ||
        err?.message ||
        "Erro ao salvar transação";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const loading = isSubmitting || loadingData;
  const accountOptions = accounts
    .filter((a) => a.isActive)
    .map((a) => ({ value: a.id, label: a.name }));
  const categoryOptions = [
    {
      label: "Receitas",
      options: categories
        .filter((c) => c.type === "INCOME")
        .map((c) => ({ value: c.id, label: c.name })),
    },
    {
      label: "Despesas",
      options: categories
        .filter((c) => c.type === "EXPENSE")
        .map((c) => ({ value: c.id, label: c.name })),
    },
  ];
  const isFixedDate = !!initialDate;
  const firstRecurrenceDate = recurrencePreview.dates[0];
  const lastRecurrenceDate = recurrencePreview.dates.at(-1);

  return (
    <FormContainer
      onSubmit={handleSubmit}
      error={submitError}
      onClearError={() => setSubmitError(null)}
      className="mt-4"
    >
      <Select
        label="Conta"
        value={formData.accountId}
        onChange={(v) => setFormData({ ...formData, accountId: String(v) })}
        options={accountOptions}
        disabled={loading}
        required
        placeholder="Selecione uma opção"
      />

      <Select
        label="Categoria"
        value={formData.categoryId}
        onChange={(v) => setFormData({ ...formData, categoryId: String(v) })}
        options={categoryOptions}
        disabled={loading}
        required
        grouped
        placeholder="Selecione uma opção"
      />

      <Input
        ref={amountInputRef}
        label="Valor (R$)"
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
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        disabled={loading}
        required
      />

      {!isFixedDate && (
        <>
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
            className="w-auto self-start !border-0 !bg-transparent !p-0 !shadow-none hover:!bg-transparent focus-visible:!ring-2"
          >
            Usar data atual
          </Button>

          <Input
            label="Data"
            type="date"
            value={formatIsoLogicalDate({
              year: formData.year,
              month: formData.month,
              day: formData.day,
            })}
            onChange={(e) => {
              const value = e.target.value;
              if (!value) return;
              const [year, month, day] = value.split("-").map(Number);
              setFormData({ ...formData, day, month, year });
            }}
            disabled={loading}
            required
          />
        </>
      )}

      <RadioGroup
        required
        name="status"
        label="Status"
        value={formData.status}
        onChange={(v) =>
          setFormData({ ...formData, status: v as TransactionStatus })
        }
        options={statusOptions}
        disabled={loading}
      />

      {!isEditing && (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={repeatMonthly}
              onChange={(event) => setRepeatMonthly(event.target.checked)}
              disabled={loading}
              className="mt-1 h-4 w-4 rounded border-slate-400 accent-purple-600"
            />
            <span>
              <span className="font-medium text-slate-900 dark:text-white">
                Repetir mensalmente
              </span>
              <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
                Cria uma série finita agora, sem gerar novos lançamentos ao abrir páginas.
              </span>
            </span>
          </label>

          {repeatMonthly && (
            <div className="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-700">
              <RadioGroup
                name="recurrence-mode"
                label="Terminar recorrência por"
                value={recurrenceMode}
                onChange={(value) => setRecurrenceMode(value as RecurrenceMode)}
                disabled={loading}
                options={[
                  { value: "count", label: "Quantidade" },
                  { value: "endDate", label: "Data final" },
                ]}
              />

              {recurrenceMode === "count" ? (
                <Input
                  label="Quantidade de ocorrências"
                  type="number"
                  min={2}
                  max={MAX_MONTHLY_OCCURRENCES}
                  value={occurrenceCount}
                  onChange={(event) =>
                    setOccurrenceCount(Number(event.target.value))
                  }
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

              <div
                className={`rounded-xl border p-3 text-sm ${
                  recurrencePreview.error
                    ? "border-red-300 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200"
                    : "border-purple-200 bg-purple-50 text-slate-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-slate-200"
                }`}
                role={recurrencePreview.error ? "alert" : "status"}
              >
                {recurrencePreview.error ? (
                  recurrencePreview.error
                ) : firstRecurrenceDate && lastRecurrenceDate ? (
                  <>
                    <strong>{recurrencePreview.dates.length} ocorrências</strong>{" "}
                    de {formatPtBrLogicalDate(firstRecurrenceDate)} até{" "}
                    {formatPtBrLogicalDate(lastRecurrenceDate)}. A primeira mantém o
                    status escolhido; as {recurrencePreview.dates.length - 1} seguintes
                    serão criadas como pendentes.
                  </>
                ) : (
                  "Configure a recorrência para ver o resumo."
                )}
              </div>
            </div>
          )}
        </section>
      )}

      <FormActions
        isEditing={isEditing}
        loading={loading}
        onCancel={handleCancel}
        createLabel={repeatMonthly ? "Criar recorrência" : "Criar Transação"}
        submitLabel="Salvar Alterações"
      />
    </FormContainer>
  );
}
