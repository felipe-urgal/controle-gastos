import { NewPage } from '@/app/components/base-pages';
import CategoryForm from '@/app/components/pages/category/form';

export default function NewCategoryPage() {
  return (
    <NewPage
      backUrl="/categorias"
      title="Nova categoria"
      sidebarAligned
      animated="focus"
      breadcrumb={[{ label: 'Categorias', href: '/categorias' }, { label: 'Nova categoria' }]}
    >
      <CategoryForm isEditing={false} />
    </NewPage>
  );
}
