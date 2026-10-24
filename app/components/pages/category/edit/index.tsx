'use client';

import { EditPage } from '@/app/components/base-pages';
import CategoryForm from '@/app/components/pages/category/form';
import { useCategories } from '@/app/hooks/categories/category-edit';

export default function Edit({ id }: { id: string }) {
  const { category, loading, error, handleBack } = useCategories({ id });

  return (
    <EditPage
      title="Editar categoria"
      sidebarAligned
      breadcrumb={[
        { label: 'Categorias', href: '/categorias' },
        { label: category?.name ?? 'Categoria', href: `/categorias/show/${id}` },
        { label: 'Editar' },
      ]}
      loading={loading}
      error={error}
      backUrl={handleBack}
      errorRedirectTo={handleBack}
    >
      <CategoryForm isEditing category={category || undefined} />
    </EditPage>
  );
}
