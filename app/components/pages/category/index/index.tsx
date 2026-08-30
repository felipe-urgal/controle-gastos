'use client';

import { IndexPage, PageHeader } from '@/app/components/base-pages';
import { ProtectedRoute } from '@/app/components/layout';
import { DynamicFilters } from '@/app/components/navigation';
import { CategoryCard, CategoryMonthlyLimits } from '@/app/components/pages/category';
import { useCategories } from '@/app/hooks/categories/category-index';
import { categoryFilters } from '@/app/lib/constants/category.constants';

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
    <ProtectedRoute>
      <PageHeader
        title="Categorias"
        description="Organize receitas e despesas com nomes, tipos e identidades visuais fáceis de reconhecer."
        createUrl="/categorias/nova"
        createLabel="Nova categoria"
        loading={loading}
      />

      <CategoryMonthlyLimits />

      <DynamicFilters
        fields={categoryFilters}
        values={filters}
        onChange={(key, value) =>
          setFilters((previous) => ({
            ...previous,
            [key]: value,
          }))
        }
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        loading={loading}
        onClear={clearFilters}
        total={total}
      />

      <section aria-labelledby="categories-list-title" className="space-y-3">
        <div>
          <h2 id="categories-list-title" className="text-xl font-semibold text-[var(--foreground)]">
            Suas categorias
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
            O tipo da categoria define se uma transação é receita ou despesa. Cor e ícone são apenas apoios visuais.
          </p>
        </div>

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
              searchTerm={filters.search ?? ''}
            />
          )}
          pagination={
            hasPagination && totalPages && totalPages > 1
              ? {
                  page,
                  pageSize,
                  total,
                  totalPages,
                  onPageChange: setPage,
                  onPageSizeChange: setPageSize,
                }
              : undefined
          }
        />
      </section>
    </ProtectedRoute>
  );
}
