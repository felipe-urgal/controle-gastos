"use client";

// hooks
import { useAccounts } from "@/app/hooks/accounts/account-index";

// components
import PageHeader from "@/app/components/ui/PageHeader";
import ListFilters from "@/app/components/ui/ListFilters";
import EntityList from "@/app/components/ui/EntityList";
import AccountCard from "@/app/components/account/index/card";
import ProtectedRoute from "../../ui/ProtectedRoute";

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
        description="Gerencie suas contas bancárias e investimentos"
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

      <EntityList
        items={accounts}
        loading={loading}
        viewMode={viewMode}
        emptyTitle="Nenhuma conta encontrada"
        renderItem={(account, index) => (
          <AccountCard
            key={account.id}
            account={account}
            viewMode={viewMode}
            searchTerm={search}
            index={index}
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
