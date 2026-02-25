'use client';

// hooks
import { useCategories } from "@/app/hooks/categories/category-edit";

// components
import EditPage from '@/app/components/ui/EditPage';
import CategoryForm from '@/app/components/category/form';

export default function Edit({ id }: { id: string }) {
  const { category, loading, error, handleBack } = useCategories({ id });

  return (
    <EditPage
      title="Editar Categoria"
      description="Atualize as informações da sua categoria"
      loading={loading}
      error={error}
      onBack={handleBack}
      errorRedirectTo="/categorias"
    >
      <CategoryForm isEditing category={category} />
    </EditPage>
  );
};
