"use client"

import React, { useState } from "react";

// components
import { GenericList } from "@/app/components";

// types
import { InvestmentModel } from "@/app/types/investment";

// Icons
import { FaTrash, FaPencilAlt, FaChevronDown, FaChevronUp, FaChartLine } from "react-icons/fa";

// Toast
import { toast } from "react-toastify";

// Utils
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/app/utils/format";

type InvestmentListProps = {
  investments: InvestmentModel[];
  onDelete: (id: string) => void;
  buy: string;
  dividend: string;
};

const InvestmentList = ({ investments, onDelete, buy, dividend }: InvestmentListProps) => {
  const router = useRouter();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // Header/Footer summaries
  const headerSummary = [
    {
      content: (
        <div className="flex items-center gap-2">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <FaChartLine className="h-4 w-4 text-green-500" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Total Investido</p>
            <p className="font-semibold text-green-400 text-sm">{formatCurrency(buy)}</p>
          </div>
        </div>
      ),
      className: "",
      colSpan: 1,
    },
    { content: "", className: "", colSpan: 1 },
    { content: "", className: "hidden lg:table-cell", colSpan: 1 },
    { content: "", className: "hidden lg:table-cell", colSpan: 1 },
    {
      content: (
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-400">Total Dividendos</p>
            <p className="font-semibold text-blue-400 text-sm">{formatCurrency(dividend)}</p>
          </div>
        </div>
      ),
      className: "",
      colSpan: 1,
    },
    { content: "", className: "hidden lg:table-cell", colSpan: 1 },
    { content: "", className: "hidden lg:table-cell text-right text-blue-400 text-xs lg:text-sm", colSpan: 1 },
  ];
  const footerSummary = headerSummary;

  // Colunas
  const columns = [
    {
      key: "investmentDate",
      header: <span className="hidden lg:table-cell text-xs text-gray-500 font-medium">DATA</span>,
      content: (investment: InvestmentModel) => {
        if (!investment.investmentDate) return "";
        const date = new Date(investment.investmentDate);
        const dia = date.getDate().toString().padStart(2, "0");
        const mes = (date.getMonth() + 1).toString().padStart(2, "0");
        const ano = date.getFullYear();
        return (
          <div className="hidden lg:flex flex-col">
            <span className="text-gray-400 text-sm">{`${dia}/${mes}/${ano}`}</span>
            <span className="text-xs text-gray-500">{`${dia}/${mes}`}</span>
          </div>
        );
      },
      className: "hidden lg:table-cell",
    },
    {
      key: "description",
      header: <span className="hidden lg:table-cell text-xs text-gray-500 font-medium">DESCRIÇÃO</span>,
      content: (investment: InvestmentModel) => (
        <span className="text-sm font-medium text-white">{investment.description}</span>
      ),
      className: "hidden lg:table-cell",
    },
    {
      key: "ticker",
      header: <span className="text-xs text-gray-500 font-medium">TICKER</span>,
      content: (investment: InvestmentModel) => (
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${investment.type === "BUY" ? "bg-green-500/10" : investment.type === "DIVIDEND" ? "bg-blue-500/10" : "bg-red-500/10"}`}>
            <span className={`text-sm font-bold ${investment.type === "BUY" ? "text-green-500" : investment.type === "DIVIDEND" ? "text-blue-500" : "text-red-500"}`}>
              {investment.ticker}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "account",
      header: <span className="hidden lg:table-cell text-xs text-gray-500 font-medium">CONTA</span>,
      content: (investment: InvestmentModel) =>
        investment.account?.name ? (
          <span className="bg-gray-700/30 px-3 py-1.5 rounded-lg text-xs text-gray-300 hidden lg:inline-block border border-gray-700/50">
            {investment.account.name}
          </span>
        ) : null,
      className: "hidden lg:table-cell",
    },
    {
      key: "quantity",
      header: <span className="hidden lg:table-cell text-xs text-gray-500 font-medium">QTD</span>,
      content: (investment: InvestmentModel) => (
        <span className="text-sm font-medium text-gray-300">{investment.quantity}</span>
      ),
      className: "hidden lg:table-cell",
    },
    {
      key: "unitPrice",
      header: <span className="hidden lg:table-cell text-xs text-gray-500 font-medium">VALOR UNIT.</span>,
      content: (investment: InvestmentModel) => (
        <span
          className={`text-right font-medium text-sm ${
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
      header: <span className="text-xs text-gray-500 font-medium">VALOR TOTAL</span>,
      content: (investment: InvestmentModel) => (
        <span
          className={`text-right font-semibold text-sm ${
            investment.type === "BUY" || investment.type === "DIVIDEND" ? "text-green-400" : "text-red-400"
          }`}
        >
          {formatCurrency(investment.amount)}
        </span>
      ),
      className: "px-4 py-3 text-right",
    },
    {
      key: "actions",
      header: <span className="text-xs text-gray-500 font-medium">AÇÕES</span>,
      content: (investment: InvestmentModel) => (
        <div className="flex justify-end">
          <button
            onClick={() => toggleExpand(investment.id)}
            className="p-2 rounded-lg hover:bg-gray-700/30 transition-colors lg:hidden"
          >
            {expandedItems.has(investment.id) ? (
              <FaChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <FaChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
          <div className="hidden lg:flex items-center gap-1">
            {renderItemActions(investment)}
          </div>
        </div>
      ),
      className: "text-right",
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
          className="cursor-pointer p-2 rounded-lg hover:bg-blue-500/10 transition-colors group"
          aria-label="Editar investimento"
        >
          <FaPencilAlt className="h-3.5 w-3.5 text-blue-400 group-hover:text-blue-300" />
        </button>
        <button
          onClick={handleDelete}
          className="cursor-pointer p-2 rounded-lg hover:bg-red-500/10 transition-colors group"
          aria-label="Excluir investimento"
        >
          <FaTrash className="h-3.5 w-3.5 text-red-400 group-hover:text-red-300" />
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
      <div className="lg:hidden bg-gray-800/20 p-4 rounded-lg border border-gray-700/30 mt-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 mb-1">Data</span>
            <span className="text-sm text-gray-300">{`${dia}/${mes}/${ano}`}</span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 mb-1">Quantidade</span>
            <span className="text-sm text-gray-300">{investment.quantity}</span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 mb-1">Valor Unitário</span>
            <span className="text-sm text-gray-300">{formatCurrency(investment.unitPrice)}</span>
          </div>
          
          {investment.account?.name && (
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 mb-1">Conta</span>
              <span className="text-sm text-gray-300">{investment.account.name}</span>
            </div>
          )}
          
          <div className="flex flex-col col-span-2">
            <span className="text-xs text-gray-400 mb-1">Descrição</span>
            <span className="text-sm text-gray-300">{investment.description}</span>
          </div>
          
          <div className="flex items-center gap-2 col-span-2 pt-2 border-t border-gray-700/30 justify-end">
            {renderItemActions(investment)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-900/40 backdrop-blur-sm rounded-xl border border-gray-700/30 overflow-hidden">
      <GenericList<InvestmentModel>
        items={investments}
        columns={columns}
        renderItemActions={() => <></>}
        headerSummary={investments.length > 0 ? headerSummary : undefined}
        footerSummary={investments.length > 20 ? footerSummary : undefined}
        expandable
        renderExpandedContent={renderExpandedContent}
        itemClassName="border-b border-gray-700/20 hover:bg-gray-800/20 transition-colors"
      />
    </div>
  );
};

export default InvestmentList;