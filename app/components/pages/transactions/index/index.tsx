"use client";

// hooks
import { useTransactions } from "@/app/hooks/transactions/transaction-index";
import { useEffect, useMemo, useState } from "react";

// components
import { PageHeader, IndexPage } from "@/app/components/base-pages";
import { DynamicFilters } from "@/app/components/navigation";
import { TransactionCard, TransactionSummary } from "@/app/components/pages/transactions";
import { ProtectedRoute } from "@/app/components/layout";

// importing constants
import { transactionFilters } from "@/app/lib/constants/transaction.constants";

// importing services
import { accountService } from "@/app/services/account-service";
import { categoryService } from "@/app/services/category-service";

// importing types
import { FilterField } from "@/app/components/navigation/dynamic-filters";

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
}

export default function Index() {
  const {
    loading,
    transactions,
    viewMode,
    setViewMode,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    hasPagination,
    filters,
    setFilters,
    clearFilters,
    summary,
    refetch,
  } = useTransactions();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function fetchRelations() {
      try {
        const [accountsResponse, categoriesResponse] = await Promise.all([
          accountService.getAll(),
          categoryService.getAll(),
        ]);

        setAccounts(accountsResponse.data?.items || []);
        setCategories(categoriesResponse.data?.items || []);
      } catch (error) {
        console.error("Erro ao carregar relações:", error);
      }
    }

    fetchRelations();
  }, []);

  const accountOptions = useMemo(
    () =>
      accounts.map((account) => ({
        value: account.id,
        label: account.name,
      })),
    [accounts]
  );

  const categoryOptions = useMemo(() => {
    const income = categories
      .filter((c) => c.type === "INCOME")
      .map((c) => ({
        value: c.id,
        label: c.name,
      }));

    const expense = categories
      .filter((c) => c.type === "EXPENSE")
      .map((c) => ({
        value: c.id,
        label: c.name,
      }));

    return [
      ...(income.length
        ? [{ label: "Receitas", options: income }]
        : []),
      ...(expense.length
        ? [{ label: "Despesas", options: expense }]
        : []),
    ];
  }, [categories]);

  const filtersWithRelations = useMemo<FilterField[]>(
    () => [
      ...transactionFilters,
      {
        type: "select",
        key: "accountId",
        label: "Conta",
        options: accountOptions,
      },
      {
        type: "select",
        key: "categoryId",
        label: "Categoria",
        options: categoryOptions,
      },
    ],
    [accountOptions, categoryOptions]
  );

  return (
    <ProtectedRoute>
      <PageHeader
        title="Transações"
        description="Gerencie suas receitas e despesas"
        createUrl="/transacoes/nova"
        loading={loading}
      />

      <DynamicFilters
        fields={filtersWithRelations}
        values={filters}
        onChange={(key, value) =>
          setFilters((prev) => ({
            ...prev,
            [key]: value,
          }))
        }
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        loading={loading}
        onClear={clearFilters}
        total={total}
      />

      <TransactionSummary summary={summary} loading={loading} />

      <IndexPage
        items={transactions}
        loading={loading}
        viewMode={viewMode}
        emptyTitle="Nenhuma transação encontrada"
        renderItem={(transaction) => (
          <TransactionCard
            key={transaction.id}
            transaction={transaction}
            viewMode={viewMode}
            searchTerm={filters.search ?? ""}
            onChanged={() => refetch({ silent: true })}
          />
        )}
        pagination={(hasPagination && (totalPages && totalPages > 1))? {
          page,
          pageSize,
          total,
          totalPages,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        } : undefined}
      />
    </ProtectedRoute>
  );
};
