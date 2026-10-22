import type { Metadata } from 'next';

import Show from '@/app/components/pages/merchant/show';

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;

  return {
    title: 'Estabelecimento | Controle de Gastos',
    description: 'Gasto, histórico e reconhecimento automático do estabelecimento',
    openGraph: {
      url: `https://controle-gastos-pessoal.vercel.app/estabelecimentos/show/${id}`,
    },
    alternates: {
      canonical: `https://controle-gastos-pessoal.vercel.app/estabelecimentos/show/${id}`,
    },
  };
}

export default async function MerchantShowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <Show id={id} />;
}
