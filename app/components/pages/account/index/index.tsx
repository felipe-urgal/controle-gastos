"use client";

// importing hooks
import { useAccounts } from "@/app/hooks/accounts/account-index";

// importing components
import { PageHeader, IndexPage } from "@/app/components/base-pages";
import { DynamicFilters } from "@/app/components/navigation";
import { AccountCard } from "@/app/components/pages/account";
import { ProtectedRoute } from "@/app/components/layout";

// importing constants
import { accountFilters } from "@/app/lib/constants/account.constants";

export default function Index() {
  const { 
    loading,
    accounts,
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
  } = useAccounts();

  return (
    <ProtectedRoute>
      <PageHeader
        title="Contas"
        description="Gerencie suas contas bancárias"
        createUrl="/contas/nova"
        loading={loading}
      />

      <DynamicFilters
        fields={accountFilters}
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

      <IndexPage
        items={accounts}
        loading={loading}
        viewMode={viewMode}
        emptyTitle="Nenhuma conta encontrada"
        renderItem={(account) => (
          <AccountCard
            key={account.id}
            account={account}
            viewMode={viewMode}
            searchTerm={filters.search ?? ""}
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
