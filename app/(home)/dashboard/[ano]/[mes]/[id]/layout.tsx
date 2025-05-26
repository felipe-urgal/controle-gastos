import type { Metadata } from "next";
import { MESES_NOME } from "@/app/utils/format";

export async function generateMetadata({
  params,
}: { params: Promise<{ mes: string; ano: string; }> }): Promise<Metadata> {
  const { mes, ano } = await params;

  const title = `${MESES_NOME[Number(mes) - 1]} (${ano})`

  return {
    title: `Alterar transação ${title}`,
    description: `Alterando transação ${title}.`,
    openGraph: {
      title: `Alterar transação ${title}`,
      description: `Alterando transação ${title}.`,
      siteName: 'Controle de Gastos',
      images: [
        {
          url: '/logo.jpg',
          width: 800,
          height: 600,
        },
        {
          url: '/logo.jpg',
          width: 1800,
          height: 1600,
          alt: 'My custom alt',
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Alterar transação ${title}`,
      description: `Alterando transação ${title}.`,
      images: ['/logo.jpg'],
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
