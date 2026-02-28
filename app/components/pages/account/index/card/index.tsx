"use client";

// importing components
import Link from "next/link"
import { ViewCard, ViewList } from "@/app/components/pages/account";

// importing interface
import { AccountCardProps } from "@/app/lib/interface/accounts.interface";

export default function AccountCard({ account, viewMode, searchTerm = "" }: AccountCardProps) {
  return (
    <Link
      href={`/contas/show/${account.id}`}
      className={`cursor-pointer relative rounded-xl overflow-hidden transition-all duration-300
        ${account.isActive  ? 'hover:shadow-xl hover:shadow-purple-500/5 hover:scale-[1.01]' 
          : 'opacity-75 hover:opacity-100'}
      `}
    >
      <div className={`relative p-4 backdrop-blur-xl border
        ${account.isActive ? `bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-white/5` 
          : 'bg-slate-900/50 border-slate-800'}
      `}>
        {viewMode === "list" ? (
          <ViewList account={account} searchTerm={searchTerm} />
        ) : (
          <ViewCard account={account} searchTerm={searchTerm} />
        )}
      </div>
    </Link>
  );
};
