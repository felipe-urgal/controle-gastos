import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recuperar Senha - Controle de Gastos",
  description: "Ferramenta para controlar seus gastos financeiros",
  openGraph: {
    url: "https://controle-gastos-pessoal.vercel.app/forgot-password",
  },
  alternates: {
    canonical: "https://controle-gastos-pessoal.vercel.app/forgot-password",
  },
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
};
