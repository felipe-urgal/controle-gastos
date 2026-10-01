import type { Metadata } from "next";

import MerchantsPage from "@/app/components/pages/merchant/merchants-page";

export const metadata: Metadata = {
  title: "Estabelecimentos | Controle de Gastos",
  description: "Organize os estabelecimentos associados às suas transações",
};

export default function MerchantsRoute() {
  return <MerchantsPage />;
}
