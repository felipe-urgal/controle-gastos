import type { Metadata } from 'next';
import TagsPage from '@/app/components/pages/tags/tags-page';

export const metadata: Metadata = {
  title: 'Tags | Controle de Gastos',
  description: 'Organize transações por contextos livres sem alterar categorias.',
};

export default function Page() {
  return <TagsPage />;
}
