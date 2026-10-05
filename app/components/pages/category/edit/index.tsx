'use client';

import { EditPage } from '@/app/components/base-pages';
import { CategoryForm } from '@/app/components/pages/category';
import { useCategories } from '@/app/hooks/categories/category-edit';

export default function Edit({ id }: { id: string }) {
  const { category, loading, error, handleBack } = useCategories({ id });

  return (
    <EditPage
      title="Editar categoria"
      description="Atualize nome, status e identidade visual. O tipo financeiro é definido na criação para preservar o histórico."
      loading={loading}
      error={error}
      backUrl={handleBack}
      errorRedirectTo={handleBack}
      hideHeaderOnMobile
    >
      <CategoryForm isEditing category={category || undefined} />
    </EditPage>
  );
}
