import type { Metadata } from "next";

import InvestmentsCenter from "@/app/components/pages/investment/investments-center";

export const metadata: Metadata = {
  title: "Investimentos | Controle de Gastos",
  description: "Acompanhe ativos, posições e operações de investimento",
};

export default function InvestmentsPage() {
  return <InvestmentsCenter />;
}
