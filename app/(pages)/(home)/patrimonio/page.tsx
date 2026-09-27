import type { Metadata } from "next";

import NetWorthPage from "@/app/components/pages/net-worth";

export const metadata: Metadata = {
  title: "Patrimônio | Controle de Gastos",
  description: "Acompanhe seu patrimônio por moeda e a evolução ao longo do tempo",
};

export default function Page() {
  return <NetWorthPage />;
}
