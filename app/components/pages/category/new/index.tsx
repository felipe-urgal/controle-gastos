"use client";

// importing components
import { NewPage } from "@/app/components/base-pages";
import { CategoryForm } from "@/app/components/pages/category";

export default function NewCategoryPage() {
  return (
    <NewPage backUrl="/categorias">
      <CategoryForm isEditing={false} />
    </NewPage>
  );
};
