import type { Metadata } from "next";

import { GoalsCenter } from "@/app/components/pages/goal";

export const metadata: Metadata = {
  title: "Metas | Controle de Gastos",
  description: "Acompanhe seus objetivos financeiros",
};

export default function GoalsPage() {
  return <GoalsCenter />;
}
