"use client";

// hooks
import { useCategories } from "@/app/hooks/categories/category-index";

// components
import { PageHeader, IndexPage } from "@/app/components/base-pages";
import { DynamicFilters } from "@/app/components/navigation";
import { CategoryCard } from "@/app/components/pages/category";

// importing constants
import { categoryFilters } from "@/app/lib/constants/category.constants";

export default function Index() {
  const { 
    loading,
    categories,
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
  } = useCategories();

  return (
    <>
      <PageHeader
        title="Categorias"
        description="Organize suas receitas e despesas"
        createUrl="/categorias/nova"
        loading={loading}
      />

      <DynamicFilters
        fields={categoryFilters}
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
        items={categories}
        loading={loading}
        viewMode={viewMode}
        emptyTitle="Nenhuma categoria encontrada"
        renderItem={(category) => (
          <CategoryCard
            key={category.id}
            category={category}
            viewMode={viewMode}
            searchTerm={filters.search ?? ""}
          />
        )}
        pagination={hasPagination? {
          page,
          pageSize,
          total,
          totalPages,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        } : undefined}
      />
    </>
  );
};
