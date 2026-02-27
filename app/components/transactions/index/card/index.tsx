"use client";

// importing components
import Link from "next/link"
import { ViewCard, ViewList } from "@/app/components/transactions";

// importing interface
import { TransactionCardProps } from "@/app/lib/interface/transaction.interface";

export default function TransactionCard({ transaction, viewMode, searchTerm = "" }: TransactionCardProps) {
  return (
    <Link
      href={`/transacoes/show/${transaction.id}`}
      className="cursor-pointer relative rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/5 hover:scale-[1.01]"
    >
      <div className="relative p-4 backdrop-blur-xl border bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-white/5">
        {viewMode === "list" ? (
          <ViewList transaction={transaction} searchTerm={searchTerm} />
        ) : (
          <ViewCard transaction={transaction} searchTerm={searchTerm} />
        )}
      </div>
    </Link>
  );
};
