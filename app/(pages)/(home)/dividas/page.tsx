import type { Metadata } from "next";

import DebtsCenter from "@/app/components/pages/debt/debts-center";

export const metadata: Metadata = {
  title: "Dívidas | Controle de Gastos",
  description: "Acompanhe dívidas, financiamentos e saldo devedor manualmente",
};

export default function DebtsPage() {
  return <DebtsCenter />;
}
