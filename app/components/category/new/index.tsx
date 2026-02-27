"use client";

// importing components
import { NewPage } from "@/app/components/pages";
import { CategoryForm } from "@/app/components/category";

export default function NewCategoryPage() {
  return (
    <NewPage backUrl="/categorias">
      <CategoryForm isEditing={false} />
    </NewPage>
  );
};
