'use client';

import { EditPage } from '@/app/components/base-pages';
import { CategoryForm } from '@/app/components/pages/category';
import { useCategories } from '@/app/hooks/categories/category-edit';

export default function Edit({ id }: { id: string }) {
  const { category, loading, error, handleBack } = useCategories({ id });

  return (
    <EditPage
      title="Editar categoria"
      description="Atualize nome, tipo e identidade visual. Alterar o tipo muda a classificação financeira das movimentações que usam esta categoria conforme as regras atuais do produto."
      loading={loading}
      error={error}
      backUrl={handleBack}
      errorRedirectTo={handleBack}
    >
      <CategoryForm isEditing category={category || undefined} />
    </EditPage>
  );
}
