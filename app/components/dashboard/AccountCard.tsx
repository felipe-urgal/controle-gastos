// components/dashboard/AccountCard.tsx
"use client";

// icons
import { FaChevronDown } from "react-icons/fa";

// type
import { InvestmentModel } from "@/app/types/investment";

interface AccountCardProps {
  account: {
    accountId: string;
    accountName: string;
    accountType: string;
    total: number;
    byType: {
      income: {
        total: number;
        byCategory: Array<{
          categoryId: string | null;
          categoryName: string;
          total: number;
        }>;
      };
      expense: {
        total: number;
        byCategory: Array<{
          categoryId: string | null;
          categoryName: string;
          total: number;
        }>;
      };
      investment: {
        buy: { 
          total: number;
          byTicker: Array<{
            ticker: string | null;
            total: number;
          }>; 
        };
        sell: { 
          total: number;
          byTicker: Array<{
            ticker: string | null;
            total: number;
          }>; 
        };
        net: number;
      };
    };
  };
  investments: InvestmentModel[];
}

const AccountCard = ({ account, investments }: AccountCardProps) => {

  console.log(account)
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
        {account.accountType === 'INVESTMENT' 
          ? (
              <div className="flex flex-col lg:flex-row gap-1 lg:gap-2">
                <span className="text-xs lg:text-lg text-gray-400 flex items-center gap-2">
                  Investimentos:
                </span>
                <span className={`text-xs lg:text-lg font-semibold ${account.byType.investment.net >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  R$ {account.byType.investment.net.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )
          : (
              <>
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
              </>
            )
        }
      </div>

      <details className="mt-3 group border border-gray-700/30 hover:border-gray-600 transition-colors">
        <summary className="flex justify-end items-center cursor-pointer text-gray-700 text-xs hover:text-gray-600 transition-colors">
          <FaChevronDown className="w-5 h-5 group-open:rotate-180 transition-transform" />
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
          
          {/* Investimentos - compras */}
          {account.byType.investment.buy.byTicker.length > 0 && (
            <TickerSection 
              type="buy" 
              tickers={account.byType.investment.buy.byTicker} 
              total={account.byType.investment.buy.total}
              investments={investments.filter(i => i.type === 'BUY')}
            />
          )}
          
          {/* Investimentos - vendas */}
          {account.byType.investment.sell.byTicker.length > 0 && (
            <TickerSection 
              type="sell" 
              tickers={account.byType.investment.sell.byTicker} 
              total={account.byType.investment.sell.total}
              investments={investments.filter(i => i.type === 'SELL')}
            />
          )}
        </div>
      </details>
    </div>
  );
}

// Helper component for ticker sections (substitui CategorySection para investimentos)
function TickerSection({ 
  type, 
  tickers, 
  total,
  investments
}: { 
  type: 'buy' | 'sell';
  tickers: Array<{ ticker: string | null; total: number }>;
  total: number;
  investments: InvestmentModel[];
}) {
  const typeConfig = {
    buy: { title: 'COMPRAS', color: 'emerald', sign: '+' },
    sell: { title: 'VENDAS', color: 'rose', sign: '-' },
  };

  return (
    <div className="mb-4">
      <span className="text-[10px] lg:text-lg font-semibold text-gray-400 mb-2 block">
        INVESTIMENTOS - {typeConfig[type].title}
        <span className={`ml-2 text-${typeConfig[type].color}-400 font-normal`}>
          {typeConfig[type].sign}
          {Math.abs(total).toLocaleString('pt-BR', { 
            style: 'currency', 
            currency: 'BRL',
            minimumFractionDigits: 2 
          })}
        </span>
      </span>
      
      {tickers.map((ticker) => {
        const tickerInvestments = investments.filter(i => i.ticker === ticker.ticker);
        return (
          <TickerItem 
            key={`${type}-${ticker.ticker}`}
            ticker={ticker}
            investments={tickerInvestments}
            color={typeConfig[type].color}
            sign={typeConfig[type].sign}
          />
        );
      })}
    </div>
  );
}

// Helper component for individual ticker items
function TickerItem({ ticker, investments, color, sign }: { 
  ticker: { ticker: string | null; total: number };
  investments: InvestmentModel[];
  color: string;
  sign: string;
}) {
  return (
    <div className={`bg-gray-700/30 p-3 rounded-lg border border-gray-700 mb-2`}>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full bg-${color}-500`}></div>
          <span className="text-xs lg:text-sm text-gray-200 font-medium">
            {ticker.ticker || 'Outros'}
          </span>
        </div>
        <span className={`text-xs lg:text-sm font-bold text-${color}-400`}>
          {sign}
          {Math.abs(ticker.total).toLocaleString('pt-BR', { 
            style: 'currency', 
            currency: 'BRL',
            minimumFractionDigits: 2 
          })}
        </span>
      </div>
      
      {/* Mostra detalhes das operações */}
      <div className="pl-4 space-y-2">
        {investments.map(investment => (
          <div key={investment.id} className="flex justify-between text-xs text-gray-400">
            <span>
              {new Date(investment.investmentDate).toLocaleDateString('pt-BR')}
              {investment.description && ` - ${investment.description}`}
            </span>
            <span className={`text-${color}-400`}>
              {sign}
              {Math.abs(Number(investment.amount)).toLocaleString('pt-BR', { 
                minimumFractionDigits: 2 
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Mantenha o CategorySection existente para receitas/despesas
function CategorySection({ 
  type, 
  categories, 
  total 
}: { 
  type: 'income' | 'expense';
  categories: Array<{ categoryId: string | null; categoryName: string; total: number }>;
  total?: number;
}) {
  const typeConfig = {
    income: { title: 'RECEITAS', color: 'emerald', sign: '+' },
    expense: { title: 'DESPESAS', color: 'rose', sign: '-' },
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

// Mantenha o CategoryItem existente
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

export default AccountCard;