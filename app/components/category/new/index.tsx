"use client";

import NewPage from "@/app/components/ui/NewPage";
import CategoryForm from "@/app/components/category/form";

export default function NewCategoryPage() {
  return (
    <NewPage
      title="Nova Categoria"
      description="Crie uma categoria para organizar suas transações"
      backTo="/categorias"
    >
      <CategoryForm isEditing={false} />
    </NewPage>
  );
};
