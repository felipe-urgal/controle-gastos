import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resetar Senha - Controle de Gastos",
  description: "Ferramenta para controlar seus gastos financeiros",
  openGraph: {
    url: "https://controle-gastos-pessoal.vercel.app/reset-password",
  },
  alternates: {
    canonical: "https://controle-gastos-pessoal.vercel.app/reset-password",
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
