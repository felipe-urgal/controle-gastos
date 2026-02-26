"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  FaInfoCircle,
  FaCalendarAlt,
  FaWallet,
  FaTag,
} from "react-icons/fa";

import { transactionService } from "@/app/services/transactionService";
import { accountService } from "@/app/services/accountService";
import { categoryService } from "@/app/services/categoryService";

import {
  TransactionDTO,
  TransactionStatus,
} from "@/app/types/transaction";

import { AccountModel } from "@/app/types/account";
import { CategoryModel } from "@/app/types/category";

import IconRenderer from "@/app/components/ui/IconRenderer";

import {
  Input,
  Select,
  Button,
} from "@/app/components";

import FormContainer from "@/app/components/ui/FormContainer";
import FormActions from "@/app/components/ui/FormActions";

import { useCurrencyFormatter } from "@/app/hook";

interface TransactionFormProps {
  transaction?: TransactionDTO | null;
  isEditing: boolean;
}

interface FormData {
  amount: number;
  month: number;
  year: number;
  day: number;
  description: string;
  status: TransactionStatus;
  accountId: string;
  categoryId: string;
}

const statusOptions = [
  { value: "COMPLETED", label: "Concluída" },
  { value: "PENDING", label: "Pendente" },
  { value: "CANCELLED", label: "Cancelada" },
];

export default function TransactionForm({
  transaction,
  isEditing,
}: TransactionFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    amount: 0,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    day: new Date().getDate(),
    description: "",
    status: "COMPLETED",
    accountId: "",
    categoryId: "",
  });

  const [accounts, setAccounts] = useState<AccountModel[]>([]);
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const {
    displayValue,
    setDisplayValue,
    formatCentsToCurrency,
  } = useCurrencyFormatter({
    initialValue: "R$ 0,00",
  });

  useEffect(() => {
    if (isEditing && transaction) {
      setFormData({
        amount: transaction.amount,
        month: transaction.month,
        year: transaction.year,
        day: transaction.day,
        description: transaction.description || "",
        status: transaction.status,
        accountId: transaction.account.id,
        categoryId: transaction.category.id,
      });
    }
  }, [isEditing, transaction]);

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

  function handleRedirect() {
    if (isEditing && transaction?.id) {
      router.replace(`/transacoes/show/${transaction.id}`);
    } else {
      router.replace("/transacoes");
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    const cents = Number(raw || 0);

    setFormData({ ...formData, amount: cents });
    setDisplayValue(formatCentsToCurrency(cents));
  }

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
        type: selectedCategory.type, // 🔥 Derivado da categoria
        description: formData.description || "",
      };

      if (isEditing && transaction) {
        await transactionService.update(transaction.id, payload);
      } else {
        await transactionService.create(payload);
      }

      handleRedirect();
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
    .map((a) => ({
      value: a.id,
      label: a.name,
      icon: (
        <div style={{ color: a.color ?? undefined }}>
          <IconRenderer iconName={a.icon || "wallet"} size={16} />
        </div>
      ),
    }));

  const categoryOptions = [
    {
      label: 'Receitas',
      options: categories
        .filter(c => c.type === 'INCOME')
        .map(c => ({
          value: c.id,
          label: c.name,
          icon: (
            <div style={{ color: c.color ?? undefined }}>
              <IconRenderer iconName={c.icon || "tag"} size={16} />
            </div>
          ),
        }))
    },
    {
      label: 'Despesas', 
      options: categories
        .filter(c => c.type === 'EXPENSE')
        .map(c => ({
          value: c.id,
          label: c.name,
          icon: (
            <div style={{ color: c.color ?? undefined }}>
              <IconRenderer iconName={c.icon || "tag"} size={16} />
            </div>
          ),
        }))
    }
  ];

  return (
    <FormContainer
      onSubmit={handleSubmit}
      error={submitError}
      onClearError={() => setSubmitError(null)}
      className="mt-4"
    >
      <Select
        label="Categoria"
        value={formData.categoryId}
        onChange={(v) =>
          setFormData({ ...formData, categoryId: String(v) })
        }
        options={categoryOptions}
        disabled={loading}
        icon={<FaTag />}
        required
        grouped
      />
      
      <Input
        label="Valor (R$)"
        value={displayValue}
        onChange={handleAmountChange}
        disabled={loading}
        required
      />

      <Input
        label="Descrição"
        value={formData.description}
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        disabled={loading}
        required
        icon={<FaInfoCircle />}
      />

      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Dia"
          type="number"
          value={formData.day}
          onChange={(e) =>
            setFormData({
              ...formData,
              day: parseInt(e.target.value) || 1,
            })
          }
          disabled={loading}
        />

        <Input
          label="Mês"
          type="number"
          value={formData.month}
          onChange={(e) =>
            setFormData({
              ...formData,
              month: parseInt(e.target.value) || 1,
            })
          }
          disabled={loading}
        />

        <Input
          label="Ano"
          type="number"
          value={formData.year}
          onChange={(e) =>
            setFormData({
              ...formData,
              year: parseInt(e.target.value) || 2024,
            })
          }
          disabled={loading}
        />
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          setFormData({
            ...formData,
            day: new Date().getDate(),
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
          })
        }
        disabled={loading}
        icon={<FaCalendarAlt />}
      >
        Usar data atual
      </Button>

      <Select
        label="Conta"
        value={formData.accountId}
        onChange={(v) =>
          setFormData({ ...formData, accountId: String(v) })
        }
        options={accountOptions}
        disabled={loading}
        icon={<FaWallet />}
        required
      />

      <Select
        label="Status"
        value={formData.status}
        onChange={(v) =>
          setFormData({ ...formData, status: v as TransactionStatus })
        }
        options={statusOptions}
        disabled={loading}
      />

      <FormActions
        isEditing={isEditing}
        loading={loading}
        onCancel={handleRedirect}
        createLabel="Criar Transação"
        submitLabel="Salvar Alterações"
      />
    </FormContainer>
  );
};
