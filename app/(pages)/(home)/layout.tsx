import type { Metadata } from "next";
import type { ReactNode } from "react";

// Rotas autenticadas não devem ser indexadas nem herdar o canonical da raiz ("/"); páginas que
// declaram o próprio canonical continuam sobrescrevendo este valor.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function HomeLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
