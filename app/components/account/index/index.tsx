"use client";

// hooks
import { useAccounts } from "@/app/hooks/accounts/account-index";

// components
import PageHeader from "@/app/components/ui/PageHeader";
import ListFilters from "@/app/components/ui/ListFilters";
import EntityList from "@/app/components/ui/EntityList";
import AccountCard from "@/app/components/account/index/card";

export default function Index() {
  const { 
    loading,
    processedAccounts,
    search,
    setSearch,
    viewMode,
    setViewMode,
  } = useAccounts();

  return (
    <>
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
        items={processedAccounts}
        loading={loading}
        viewMode={viewMode}
        search={search}
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
      />
    </>
  );
};
