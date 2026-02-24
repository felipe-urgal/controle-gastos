"use client";

// hooks
import { useAccounts } from "@/app/hooks/accounts/account-index";

// components
import { ProtectedRoute} from "@/app/components";
import Header from "@/app/components/account/index/header";
import AccountsListFilters from "@/app/components/account/index/filters";
import AccountsList from "@/app/components/account/index/list";

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
    <ProtectedRoute>
      <Header />

      <AccountsListFilters
        search={search}
        onSearchChange={setSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        loading={loading}
      />

      <AccountsList
        accounts={processedAccounts}
        loading={loading}
        viewMode={viewMode}
        search={search}
      />
    </ProtectedRoute>
  );
};
