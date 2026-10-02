import type { Metadata } from "next";

import PayrollCenter from "@/app/components/pages/payroll/payroll-center";

export const metadata: Metadata = {
  title: "Rendimentos do trabalho | Controle de Gastos",
  description: "Importe e confira holerites e adiantamentos salariais",
};

export default function PayrollPage() {
  return <PayrollCenter />;
}
