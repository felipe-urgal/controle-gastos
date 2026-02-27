import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Signup- Controle de Gastos",
  description: "Ferramenta para controlar seus gastos financeiros",
  openGraph: {
    url: "https://controle-gastos-pessoal.vercel.app/signup",
  },
  alternates: {
    canonical: "https://controle-gastos-pessoal.vercel.app/signup",
  },
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
    </>
  );
}
