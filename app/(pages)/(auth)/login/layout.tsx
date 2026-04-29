import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - Controle de Gastos",
  description: "Ferramenta para controlar seus gastos financeiros",
  openGraph: {
    url: "https://controle-gastos-pessoal.vercel.app/login",
  },
  alternates: {
    canonical: "https://controle-gastos-pessoal.vercel.app/login",
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
