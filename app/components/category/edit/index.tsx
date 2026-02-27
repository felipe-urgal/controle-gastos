'use client';

// importing hooks
import { useCategories } from "@/app/hooks/categories/category-edit";

// importing components
import { EditPage } from '@/app/components/pages';
import { CategoryForm } from '@/app/components/category';

export default function Edit({ id }: { id: string }) {
  const { category, loading, error, handleBack } = useCategories({ id });

  return (
    <EditPage
      loading={loading}
      error={error}
      backUrl={handleBack}
      errorRedirectTo={handleBack}
    >
      <CategoryForm isEditing category={category} />
    </EditPage>
  );
};
