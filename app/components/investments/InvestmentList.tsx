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
      header: <span className="hidden lg:table-cell">Data</span>,
      content: (investment: InvestmentModel) => {
        if (!investment.investmentDate) return "";
        const date = new Date(investment.investmentDate);
        const dia = date.getDate().toString().padStart(2, "0");
        const mes = (date.getMonth() + 1).toString().padStart(2, "0");
        const ano = date.getFullYear();
        return <span className="hidden lg:table-cell text-gray-400 text-xs lg:text-sm">{`${dia}/${mes}/${ano}`}</span>;
      },
      className: "hidden lg:table-cell",
    },
    {
      key: "description",
      header: "Descrição",
      content: (investment: InvestmentModel) => (
        <span className="text-xs lg:text-sm font-medium text-gray-400">{investment.description}</span>
      ),
      className: "hidden lg:table-cell",
    },
    {
      key: "ticker",
      header: "Código do Ativo",
      content: (investment: InvestmentModel) => (
        <span className="text-xs lg:text-sm font-medium text-gray-400">{investment.ticker}</span>
      ),
    },
    {
      key: "account",
      header: <span className="hidden lg:table-cell">Conta</span>,
      content: (investment: InvestmentModel) =>
        investment.account?.name ? (
          <span className="bg-gray-700/50 px-2 py-2 rounded-md text-xs text-gray-400 hidden lg:inline-block">
            {investment.account.name}
          </span>
        ) : null,
      className: "hidden lg:table-cell",
    },
    {
      key: "quantity",
      header: <span className="hidden lg:table-cell">Quantidade</span>,
      content: (investment: InvestmentModel) => (
        <span className="text-xs lg:text-sm font-medium text-gray-400">{investment.quantity}</span>
      ),
      className: "hidden lg:table-cell",
    },
    {
      key: "unitPrice",
      header: <span className="hidden lg:table-cell">Valor Unitário</span>,
      content: (investment: InvestmentModel) => (
        <span
          className={`text-right font-semibold text-xs lg:text-sm ${
            investment.type === "BUY" || investment.type === "DIVIDEND" ? "text-green-400" : "text-red-400"
          }`}
        >
          {formatCurrency(investment.unitPrice)}
        </span>
      ),
      className: "hidden lg:table-cell",
    },
    {
      key: "amount",
      header: "Valor",
      content: (investment: InvestmentModel) => (
        <span
          className={`text-right font-semibold text-xs lg:text-sm ${
            investment.type === "BUY" || investment.type === "DIVIDEND" ? "text-green-400" : "text-red-400"
          }`}
        >
          {formatCurrency(investment.amount)}
        </span>
      ),
      className: "px-4 py-3 text-right",
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
          className="cursor-pointer text-blue-500 hover:text-blue-700 p-3 rounded-full hover:bg-gray-700/50 transition-colors"
          aria-label="Editar investimento"
        >
          <FaPencilAlt className="h-3 w-3" />
        </button>
        <button
          onClick={handleDelete}
          className="cursor-pointer text-red-500 hover:text-red-700 p-3 rounded-full hover:bg-gray-700/50 transition-colors"
          aria-label="Excluir investimento"
        >
          <FaTrash className="h-3 w-3" />
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
      <div className="flex flex-wrap items-center gap-3">
        {/* Date */}
        <div className="flex items-center flex-col text-gray-400 text-xs">
          Data investimento: 
          <span className="bg-gray-700/50 p-1 text-xs rounded-md text-gray-400">{`${dia}/${mes}/${ano}`}</span>
        </div>

        <div className="flex items-center flex-col text-gray-400 text-xs">
          Quantidade: 
          <span className="bg-gray-700/50 p-1 text-xs rounded-md text-gray-400">{investment.quantity}</span>
        </div>

        <div className="flex items-center flex-col text-gray-400 text-xs">
          Valor Unitário: 
          <span className="bg-gray-700/50 p-1 text-xs rounded-md text-gray-400">{formatCurrency(investment.unitPrice)}</span>
        </div>

        {investment.account?.name && (
          <div className="flex items-center flex-col text-gray-400 text-xs">
            Conta: 
            <span className="bg-gray-700/50 p-1 text-xs rounded-md text-gray-400">{investment.account.name}</span>
          </div>
        )}
          
      </div>
    );
  };

  return (
    <GenericList<InvestmentModel>
      items={investments}
      columns={columns}
      renderItemActions={renderItemActions}
      emptyMessage="Nenhum investimento encontrado"
      expandable
      renderExpandedContent={renderExpandedContent}
    />
  );
};

export default InvestmentList;

