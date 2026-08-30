'use client';

import { NewPage } from '@/app/components/base-pages';
import { CategoryForm } from '@/app/components/pages/category';

export default function NewCategoryPage() {
  return (
    <NewPage
      backUrl="/categorias"
      title="Nova categoria"
      description="Crie uma categoria para classificar movimentações. O tipo escolhido define se ela representa receita ou despesa."
    >
      <CategoryForm isEditing={false} />
    </NewPage>
  );
}
