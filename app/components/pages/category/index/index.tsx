"use client";

// hooks
import { useCategories } from "@/app/hooks/categories/category-index";

// components
import { PageHeader, IndexPage } from "@/app/components/base-pages";
import { ListFilters } from "@/app/components/navigation";
import { CategoryCard } from "@/app/components/pages/category";
import { ProtectedRoute } from "@/app/components/layout";

export default function Index() {
  const { 
    loading,
    categories,
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
  } = useCategories();

  return (
    <ProtectedRoute>
      <PageHeader
        title="Categorias"
        description="Organize suas receitas e despesas"
        createUrl="/categorias/nova"
        loading={loading}
      />

      <ListFilters
        search={search}
        onSearchChange={setSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        loading={loading}
        searchPlaceholder="Buscar categoria..."
      />

      <IndexPage
        items={categories}
        loading={loading}
        viewMode={viewMode}
        emptyTitle="Nenhuma categoria encontrada"
        renderItem={(category) => (
          <CategoryCard
            key={category.id}
            category={category}
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
