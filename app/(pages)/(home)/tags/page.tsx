import type { Metadata } from 'next';
import TagsPage from '@/app/components/pages/tags/tags-page';

export const metadata: Metadata = {
  title: 'Tags | Controle de Gastos',
  description: 'Organize transações por contextos livres sem alterar categorias.',
};

export default async function Page({ searchParams }: { searchParams: Promise<{ tagId?: string | string[] }> }) {
  const { tagId } = await searchParams;
  return <TagsPage focusTagId={Array.isArray(tagId) ? tagId[0] : tagId} />;
}
