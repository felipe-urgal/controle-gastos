'use client';

import { ProtectedRoute } from '@/app/components/layout';
import { CategoryMonthlyLimits } from '@/app/components/pages/category';
import { useCategories } from '@/app/hooks/categories/category-index';

export default function Index() {
  const { loading, categories, filters, setFilters } = useCategories();

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
    </ProtectedRoute>
  );
}
