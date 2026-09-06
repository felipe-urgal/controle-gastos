'use client';

import { ProtectedRoute } from '@/app/components/layout';
import { Pagination } from '@/app/components/navigation';
import { CategoryMonthlyLimits } from '@/app/components/pages/category';
import { useCategories } from '@/app/hooks/categories/category-index';

export default function Index() {
  const {
    loading,
    categories,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    hasPagination,
    filters,
    setFilters,
  } = useCategories();

  return (
    <ProtectedRoute>
      <CategoryMonthlyLimits
        categories={categories}
        categoriesLoading={loading}
        search={filters.search ?? ''}
        onSearchChange={(search) =>
          setFilters((previous) => ({ ...previous, search }))
        }
      />

      {hasPagination && totalPages && totalPages > 1 && (
        <div className="mt-4 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            loading={loading}
          />
        </div>
      )}
    </ProtectedRoute>
  );
}
