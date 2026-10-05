'use client';

import { ProtectedRoute } from '@/app/components/layout';
import { CategoryMonthlyLimits } from '@/app/components/pages/category';
import { useCategories } from '@/app/hooks/categories/category-index';

export default function Index() {
  const { loading, error, refetch, categories, filters, setFilters } = useCategories();

  return (
    <ProtectedRoute>
      {error && (
        <div
          role="alert"
          className="mb-4 flex flex-col gap-3 rounded-[14px] border border-[var(--danger)] bg-[var(--danger-subtle)] p-4 text-sm text-[var(--expense)] sm:flex-row sm:items-center sm:justify-between"
        >
          <span>Não foi possível carregar o catálogo de categorias: {error}</span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="min-h-10 rounded-[10px] border border-[var(--danger)] px-3 font-semibold transition-colors hover:bg-[var(--surface-hover)]"
          >
            Tentar novamente
          </button>
        </div>
      )}
      <CategoryMonthlyLimits
        categories={categories}
        categoriesLoading={loading}
        search={filters.search ?? ''}
        onSearchChange={(search) =>
          setFilters((previous) => ({ ...previous, search }))
        }
      />
    </ProtectedRoute>
  );
}
