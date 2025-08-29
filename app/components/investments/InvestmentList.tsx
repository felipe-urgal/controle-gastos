"use client"

import React from "react";

// components
import { GenericList } from "@/app/components";

// types
import { InvestmentModel } from "@/app/types/investment";

// Icons
import { FaTrash, FaPencilAlt } from "react-icons/fa";

// Toast
import { toast } from "react-toastify";

// Utils
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/app/utils/format";

type InvestmentListProps = {
  investments: InvestmentModel[];
  onDelete: (id: string) => void;
};

const InvestmentList = ({ investments, onDelete }: InvestmentListProps) => {
  const router = useRouter();

  // Colunas
  const columns = [
    {
      key: "investmentDate",
      header: "Data",
      content: (investment: InvestmentModel) => {
        if (!investment.investmentDate) return "";
        const date = new Date(investment.investmentDate);
        const dia = date.getDate().toString().padStart(2, "0");
        const mes = (date.getMonth() + 1).toString().padStart(2, "0");
        return (
          <div className="hidden lg:flex flex-col">
            <span className="text-gray-800 text-sm font-medium">{`${dia}/${mes}`}</span>
            <span className="text-gray-600 text-xs">{date.getFullYear()}</span>
          </div>
        );
      },
      className: "hidden lg:table-cell",
    },
    {
      key: "ticker",
      header: "Ticker",
      content: (investment: InvestmentModel) => (
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${investment.type === "BUY" ? "bg-green-600/10" : investment.type === "DIVIDEND" ? "bg-blue-600/10" : "bg-red-600/10"}`}>
            <span className={`text-sm font-bold ${investment.type === "BUY" ? "text-green-600" : investment.type === "DIVIDEND" ? "text-blue-600" : "text-red-600"}`}>
              {investment.ticker}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Valor Total",
      content: (investment: InvestmentModel) => (
        <span
          className={`font-semibold text-sm ${
            investment.type === "BUY" ? "text-green-600" : investment.type === "DIVIDEND" ? "text-blue-600" : "text-red-600"
          }`}
        >
          {formatCurrency(investment.amount)}
        </span>
      ),
    },
  ];

  // Actions
  const renderItemActions = (investment: InvestmentModel) => {
    const handleEditar = (e: React.MouseEvent) => {
      e.stopPropagation();
      router.push(`/investimentos/${investment.id}`);
    };
    const handleDelete = async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await onDelete(investment.id);
      } catch (error) {
        toast.error("Erro ao excluir investimento");
        console.error("Erro ao excluir investimento:", error);
      }
    };
    return (
      <>
        <button
          onClick={handleEditar}
          className="cursor-pointer p-2 rounded-lg bg-white border border-gray-200 hover:bg-blue-50 text-blue-500 hover:text-blue-600 transition-all duration-200 shadow-sm"
          aria-label="Editar transação"
        >
          <FaPencilAlt className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleDelete}
          className="cursor-pointer p-2 rounded-lg bg-white border border-gray-200 hover:bg-rose-50 text-rose-500 hover:text-rose-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          aria-label="Excluir transação"
        >
          <FaTrash className="h-3.5 w-3.5" />
        </button>
      </>
    );
  };

  // Conteúdo expandido para mobile
  const renderExpandedContent = (investment: InvestmentModel) => {
    if (!investment) return null;
    const date = new Date(investment.investmentDate!);
    const dia = date.getDate().toString().padStart(2, "0");
    const mes = (date.getMonth() + 1).toString().padStart(2, "0");
    const ano = date.getFullYear();
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-1 px-6 pb-3">
        <div className="flex flex-col mb-1">
          <span className="text-xs text-gray-600 mb-1">Data</span>
          <span className="text-sm text-gray-600">{`${dia}/${mes}/${ano}`}</span>
        </div>
        
        {investment.account?.name && (
          <div className="flex flex-col mb-1">
            <span className="text-xs text-gray-600 mb-1">Conta</span>
            <span className="text-sm text-gray-600">{investment.account.name}</span>
          </div>
        )}
        
        <div className="flex flex-col mb-1">
          <span className="text-xs text-gray-600 mb-1">Descrição</span>
          <span className="text-sm text-gray-600">{investment.description}</span>
        </div>

        <div className="flex flex-col mb-1">
          <span className="text-xs text-gray-600 mb-1">Quantidade</span>
          <span className="text-sm text-gray-600">{investment.quantity}</span>
        </div>
        
        <div className="flex flex-col mb-1">
          <span className="text-xs text-gray-600 mb-1">Valor Unitário</span>
          <span className={`text-sm ${investment.type === "BUY" || investment.type === "DIVIDEND" ? "text-green-600" : "text-red-600"}`}>{formatCurrency(investment.unitPrice)}</span>
        </div>

        <div className="flex flex-col mb-1">
          <span className="text-xs text-gray-600 mb-1">Valor Total</span>
          <span className={`text-sm ${investment.type === "BUY" || investment.type === "DIVIDEND" ? "text-green-600" : "text-red-600"}`}>{formatCurrency(investment.amount)}</span>
        </div>
      
      </div>
    );
  };

  return (
    <GenericList<InvestmentModel>
      items={investments}
      columns={columns}
      expandable
      renderItemActions={renderItemActions}
      renderExpandedContent={renderExpandedContent}
    />
  );
};

export default InvestmentList;