import type { Metadata } from "next";

import DebtsCenter from "@/app/components/pages/debt/debts-center";

export const metadata: Metadata = {
  title: "Dívidas | Controle de Gastos",
  description: "Acompanhe dívidas, financiamentos e saldo devedor manualmente",
};

export default async function DebtsPage({ searchParams }: { searchParams: Promise<{ debtId?: string | string[] }> }) {
  const { debtId } = await searchParams;
  return <DebtsCenter focusDebtId={Array.isArray(debtId) ? debtId[0] : debtId} />;
}
