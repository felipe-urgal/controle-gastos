"use client";

// importing hooks
import { useRouter } from "next/navigation";

// importing types
import { AccountModel } from "@/app/types/account";

// importing components
import ViewCard from "@/app/components/account/index/view-card";
import ViewList from "@/app/components/account/index/view-list";

// importing icons
import { FaRegCreditCard, FaChartLine } from "react-icons/fa";

interface Props {
  account: AccountModel;
  viewMode: "grid" | "list";
  searchTerm?: string;
  index: number;
}

export default function AccountCard({
  account,
  viewMode,
  searchTerm = "",
}: Props) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/contas/show/${account.id}`);
  };

  console.log(account)

  return (
    <div
      onClick={handleClick}
      className={`
        cursor-pointer relative
        rounded-xl overflow-hidden
        transition-all duration-300
        ${account.isActive 
          ? 'hover:shadow-xl hover:shadow-purple-500/5 hover:scale-[1.01]' 
          : 'opacity-75 hover:opacity-100'
        }
      `}
    >
      <div className={`
        relative p-4
        backdrop-blur-xl border
        ${account.isActive 
          ? `bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-white/5` 
          : 'bg-slate-900/50 border-slate-800'
        }
      `}>
        {viewMode === "list" ? (
          <ViewList account={account} searchTerm={searchTerm} />
        ) : (
          <ViewCard account={account} searchTerm={searchTerm} />
        )}
      </div>
    </div>
  );
};
