import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nova Categoria - Controle de Gastos",
  description: "Ferramenta para controlar seus gastos financeiros",
  openGraph: {
    siteName: 'Controle de Gastos',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'Logo do Controle de Gastos',
      },
      {
        url: '/logo.png',
        width: 800,
        height: 418,
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    images: {
      url: '/logo.png',
      width: 800,
      height: 418,
      alt: 'Controle de Gastos - Organize suas finanças',
    }
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  }
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
    </>
  );
}
