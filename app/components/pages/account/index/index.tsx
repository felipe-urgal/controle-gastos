"use client";

// importing hooks
import { useAccounts } from "@/app/hooks/accounts/account-index";

// importing components
import { PageHeader, IndexPage } from "@/app/components/base-pages";
import { ListFilters } from "@/app/components/navigation";
import { AccountCard } from "@/app/components/pages/account";
import { ProtectedRoute } from "@/app/components/layout";

export default function Index() {
  const { 
    loading,
    accounts,
    search,
    setSearch,
    viewMode,
    setViewMode,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    hasPagination,
  } = useAccounts();

  return (
    <ProtectedRoute>
      <PageHeader
        title="Contas"
        description="Gerencie suas contas bancárias"
        createUrl="/contas/nova"
        loading={loading}
      />

      <ListFilters
        search={search}
        onSearchChange={setSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        loading={loading}
        searchPlaceholder="Buscar conta..."
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
            searchTerm={search}
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
