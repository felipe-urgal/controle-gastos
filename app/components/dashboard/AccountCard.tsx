"use client";

import { HiChevronDown } from "react-icons/hi";

interface AccountCardProps {
  account: {
    accountId: string;
    accountName: string;
    total: number;
    byType: {
      income: {
        total: number;
        byCategory: Array<{
          categoryId: string;
          categoryName: string;
          total: number;
        }>;
      };
      expense: {
        total: number;
        byCategory: Array<{
          categoryId: string;
          categoryName: string;
          total: number;
        }>;
      };
      investment: {
        buy: { 
          total: number;
          byCategory: Array<{
            categoryId: string;
            categoryName: string;
            total: number;
          }>; 
        };
        sell: { 
          total: number;
          byCategory: Array<{
            categoryId: string;
            categoryName: string;
            total: number;
          }>; 
        };
        net: number;
      };
    };
  };
}

export function AccountCard({ account }: AccountCardProps) {
  return (
    <div className="bg-gray-800/80 rounded-xl p-5 shadow-sm border border-gray-700 hover:shadow-lg transition-all duration-200">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-xs lg:text-lg font-medium text-gray-100 flex items-center gap-2">
          {account.accountName}
        </h4>
        <span className={`text-xs lg:text-lg font-bold ${account.total >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          R$ {account.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </span>
      </div>

      <div className="grid grid-cols-3">
        <div className="flex flex-col lg:flex-row gap-1 lg:gap-2">
          <span className="text-xs lg:text-lg text-gray-400 flex items-center gap-2">
            Receitas:
          </span>
          <span className="text-xs lg:text-lg text-emerald-400 font-semibold">
            R$ {account.byType.income.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex flex-col lg:flex-row gap-1 lg:gap-2">
          <span className="text-xs lg:text-lg text-gray-400 flex items-center gap-2">
            Despesas:
          </span>
          <span className="text-xs lg:text-lg text-rose-400 font-semibold">
            R$ {account.byType.expense.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex flex-col lg:flex-row gap-1 lg:gap-2">
          <span className="text-xs lg:text-lg text-gray-400 flex items-center gap-2">
            Investimentos:
          </span>
          <span className="text-xs lg:text-lg text-blue-400 font-semibold">
            R$ {account.byType.investment.net.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <details className="mt-3 group border border-gray-700/30 hover:border-gray-600 transition-colors">
        <summary className="flex justify-end items-center cursor-pointer text-gray-700 text-xs hover:text-gray-600 transition-colors">
          <HiChevronDown className="w-5 h-5 group-open:rotate-180 transition-transform" />
        </summary>
          
        <div className="px-6 pb-3">
          {/* Categorias de receitas */}
          {account.byType.income.byCategory.length > 0 && (
            <CategorySection 
              type="income" 
              categories={account.byType.income.byCategory} 
            />
          )}
          {/* Categorias de despesas */}
          {account.byType.expense.byCategory.length > 0 && (
            <CategorySection 
              type="expense" 
              categories={account.byType.expense.byCategory} 
            />
          )}
          {/* Categorias de investimentos - compras */}
          {account.byType.investment.buy.byCategory.length > 0 && (
            <CategorySection 
              type="investmentBuy" 
              categories={account.byType.investment.buy.byCategory} 
              total={account.byType.investment.buy.total}
            />
          )}
          {/* Categorias de investimentos - vendas */}
          {account.byType.investment.sell.byCategory.length > 0 && (
            <CategorySection 
              type="investmentSell" 
              categories={account.byType.investment.sell.byCategory} 
              total={account.byType.investment.sell.total}
            />
          )}
        </div>
      </details>
    </div>
  );
}

// Helper component for category sections
function CategorySection({ 
  type, 
  categories, 
  total 
}: { 
  type: 'income' | 'expense' | 'investmentBuy' | 'investmentSell';
  categories: Array<{ categoryId: string; categoryName: string; total: number }>;
  total?: number;
}) {
  const typeConfig = {
    income: { title: 'RECEITAS', color: 'green', sign: '+' },
    expense: { title: 'DESPESAS', color: 'red', sign: '-' },
    investmentBuy: { title: 'INVESTIMENTOS - Compras', color: 'green', sign: '+' },
    investmentSell: { title: 'INVESTIMENTOS - Vendas', color: 'red', sign: '-' },
  };

  return (
    <div className="mb-4">
      <span className="text-[10px] lg:text-lg font-semibold text-gray-400 mb-2 block">
        {typeConfig[type].title}
        {typeof total === 'number' && (
          <span className={`ml-2 text-${typeConfig[type].color}-400 font-normal`}>
            {typeConfig[type].sign}
            {Math.abs(total).toLocaleString('pt-BR', { 
              style: 'currency', 
              currency: 'BRL',
              minimumFractionDigits: 2 
            })}
          </span>
        )}
      </span>
      {categories.map((category) => (
        <CategoryItem 
          key={`${type}-${category.categoryId}`}
          category={category}
          color={typeConfig[type].color}
          sign={typeConfig[type].sign}
        />
      ))}
    </div>
  );
}

// Helper component for individual category items
function CategoryItem({ category, color, sign }: { 
  category: { categoryName: string; total: number };
  color: string;
  sign: string;
}) {
  return (
    <div className={`bg-gray-700/30 p-3 rounded-lg border border-gray-700 mb-2`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full bg-${color}-500`}></div>
          <span className="text-xs lg:text-sm text-gray-200">
            {category.categoryName}
          </span>
        </div>
        <span className={`text-xs lg:text-sm font-medium text-${color}-400`}>
          {sign}
          {Math.abs(category.total).toLocaleString('pt-BR', { 
            style: 'currency', 
            currency: 'BRL',
            minimumFractionDigits: 2 
          })}
        </span>
      </div>
    </div>
  );
}