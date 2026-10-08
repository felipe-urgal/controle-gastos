import type { Metadata } from "next";

import { GoalsCenter } from "@/app/components/pages/goal";

export const metadata: Metadata = {
  title: "Metas | Controle de Gastos",
  description: "Acompanhe seus objetivos financeiros",
};

export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ goalId?: string | string[] }> }) {
  const { goalId } = await searchParams;
  return <GoalsCenter focusGoalId={Array.isArray(goalId) ? goalId[0] : goalId} />;
}
