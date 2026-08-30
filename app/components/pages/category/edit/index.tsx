'use client';

import { EditPage } from '@/app/components/base-pages';
import { CategoryForm } from '@/app/components/pages/category';
import { useCategories } from '@/app/hooks/categories/category-edit';

export default function Edit({ id }: { id: string }) {
  const { category, loading, error, handleBack } = useCategories({ id });

  return (
    <EditPage
      title="Editar categoria"
      description="Atualize nome, tipo e identidade visual. O tipo escolhido será a referência financeira quando esta categoria for usada em uma transação."
      loading={loading}
      error={error}
      backUrl={handleBack}
      errorRedirectTo={handleBack}
    >
      <CategoryForm isEditing category={category || undefined} />
    </EditPage>
  );
}
