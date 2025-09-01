"use client"

import React from "react";

// components
import { GenericList } from "@/app/components";

// types
import { InvestmentModel } from "@/app/types/investment";

// Icons
import { FaExchangeAlt, FaDollarSign, FaTrash, FaPencilAlt, FaCalendar, FaCreditCard, FaMoneyBillWave, FaFileAlt, FaHashtag } from "react-icons/fa";

// Toast
import { toast } from "react-toastify";

// Utils
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/app/utils/format";
import { useAuth } from '@/app/context/AuthContext';

type InvestmentListProps = {
  investments: InvestmentModel[];
  onDelete: (id: string) => void;
};

const InvestmentList = ({ investments, onDelete }: InvestmentListProps) => {
  const router = useRouter();
  const { user } = useAuth();

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
          {user?.showValues ? formatCurrency(investment.amount) : "******"}
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
          className="cursor-pointer p-1.5 sm:p-2 rounded-lg bg-white border border-gray-200 hover:bg-blue-50 text-blue-500 hover:text-blue-600 transition-all duration-200 shadow-sm"
          aria-label="Editar transação"
        >
          <FaPencilAlt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
        <button
          onClick={handleDelete}
          className="cursor-pointer p-1.5 sm:p-2 rounded-lg bg-white border border-gray-200 hover:bg-rose-50 text-rose-500 hover:text-rose-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          aria-label="Excluir transação"
        >
          <FaTrash className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      </>
    );
  };

  // Conteúdo expandido para mobile
  const renderExpandedContent = (investment: InvestmentModel) => {
    if (!investment) return null;
    
    const date = new Date(investment.investmentDate!);
    const formattedDate = date.toLocaleDateString('pt-BR');
    const dayOfWeek = date.toLocaleDateString('pt-BR', { weekday: 'short' });
    
    // Definir cores baseadas no tipo de operação
    const getTypeConfig = (type: string) => {
      switch (type) {
        case "BUY":
          return { 
            bgColor: "bg-emerald-100", 
            textColor: "text-emerald-800",
            label: "Compra" 
          };
        case "SELL":
          return { 
            bgColor: "bg-rose-100", 
            textColor: "text-rose-800",
            label: "Venda" 
          };
        case "DIVIDEND":
          return { 
            bgColor: "bg-blue-100", 
            textColor: "text-blue-800",
            label: "Dividendo" 
          };
        default:
          return { 
            bgColor: "bg-gray-100", 
            textColor: "text-gray-800",
            label: "Investimento" 
          };
      }
    };

    const typeConfig = getTypeConfig(investment.type);

    return (
      <div className="px-5 pb-5">
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
          {/* Data do Investimento */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center text-gray-600 mb-1">
              <FaCalendar className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
              <span className="text-xs font-medium">Data</span>
            </div>
            <div className="flex xs:items-center gap-1.5">
              <span className="text-sm font-medium text-gray-800">{formattedDate}</span>
              <span className="text-xs font-semibold text-gray-600 bg-gray-200 px-2 py-1 rounded-full">
                {dayOfWeek}
              </span>
            </div>
          </div>

          {/* Conta (se existir) */}
          {investment.account?.name && (
            <div className="flex flex-col min-w-0">
              <div className="flex items-center text-gray-600 mb-1">
                <FaCreditCard className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                <span className="text-xs font-medium">Conta</span>
              </div>
              <span className="inline-flex items-center bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-full text-sm font-medium max-w-full truncate">
                <FaMoneyBillWave className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                <span className="truncate">{investment.account.name}</span>
              </span>
            </div>
          )}

          {/* Descrição */}
          <div className="flex flex-col min-w-0 xs:col-span-2">
            <div className="flex items-center text-gray-600 mb-1">
              <FaFileAlt className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
              <span className="text-xs font-medium">Descrição</span>
            </div>
            <span className="text-sm text-gray-800 font-medium bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 break-words">
              {investment.description || "Sem descrição"}
            </span>
          </div>

          {/* Quantidade */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center text-gray-600 mb-1">
              <FaHashtag className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
              <span className="text-xs font-medium">Quantidade</span>
            </div>
            <span className="text-sm font-medium text-gray-800 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
              {user?.showValues ? investment.quantity : "******"}
            </span>
          </div>

          {/* Valor Unitário */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center text-gray-600 mb-1">
              <FaDollarSign className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
              <span className="text-xs font-medium">Unitário</span>
            </div>
            <span className={`text-sm font-medium px-3 py-1.5 rounded-lg border ${
              investment.type === "BUY" || investment.type === "DIVIDEND" 
                ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
                : "bg-rose-100 text-rose-800 border-rose-200"
            }`}>
              {user?.showValues ? formatCurrency(investment.unitPrice) : "******"}
            </span>
          </div>

          {/* Valor Total */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center text-gray-600 mb-1">
              <FaMoneyBillWave className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
              <span className="text-xs font-medium">Total</span>
            </div>
            <span className={`text-sm font-medium px-3 py-1.5 rounded-lg border ${
              investment.type === "BUY" || investment.type === "DIVIDEND" 
                ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
                : "bg-rose-100 text-rose-800 border-rose-200"
            }`}>
              {user?.showValues ? formatCurrency(investment.amount) : "******"}
            </span>
          </div>

          {/* Tipo de Operação */}
          <div className="flex flex-col min-w-0 xs:col-span-full md:col-span-1">
            <div className="flex items-center text-gray-600 mb-1">
              <FaExchangeAlt className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
              <span className="text-xs font-medium">Operação</span>
            </div>
            <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-sm font-medium ${typeConfig.bgColor} ${typeConfig.textColor}`}>
              {typeConfig.label}
            </span>
          </div>
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