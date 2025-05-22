import type { Metadata } from "next";
import { MESES_NOME } from "@/app/utils/format";

export async function generateMetadata({
  params,
}: { params: Promise<{ mes: string; ano: string; }> }): Promise<Metadata> {
  const { mes, ano } = await params;

  const title = `${MESES_NOME[Number(mes) - 1]} (${ano})`

  return {
    title: `Detalhes de ${title}`,
    description: `Veja os detalhes das transações de ${title}.`,
    openGraph: {
      title: `Detalhes de ${title}`,
      description: `Veja os detalhes das transações de ${title}.`,
      siteName: 'Controle de Gastos',
      images: [
        {
          url: '/controle.jpg',
          width: 800,
          height: 600,
        },
        {
          url: '/controle.jpg',
          width: 1800,
          height: 1600,
          alt: 'My custom alt',
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Detalhes de ${title}`,
      description: `Veja os detalhes das transações de ${title}.`,
      images: ['/controle.jpg'],
    },
  }
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
    </>
  );
}
