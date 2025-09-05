// app/dashboard/page.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { ProtectedRoute, DateSelector, DashboardSkeleton, SummaryCard, AccountCard, FinancialChart, CategoryDistribution, InvestmentPerformance } from "@/app/components";
import { dashboardService } from '@/app/services/dashboardService';
import { DashboardResponse } from '@/app/types/dashboard';
import { FaChartPie, FaArrowRight, FaChartLine } from "react-icons/fa";

export default function DashboardPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchDashboard = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const data = await dashboardService.getDashboards(user.id, { 
        month: String(currentDate.getMonth() + 1),
        year: String(currentDate.getFullYear())
      });
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentDate]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handlePreviousMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const hasData = dashboardData && (dashboardData.transactions.length || dashboardData.investments.length)

  return (
    <ProtectedRoute>
      <div>
        <DateSelector 
          currentDate={currentDate}
          onPrevious={handlePreviousMonth}
          onNext={handleNextMonth}
        />

        <div className="flex space-x-2 mb-3 border-b border-gray-500">
          <button
            className={`relative py-2 px-4 font-medium text-sm rounded-t-lg transition-all duration-200 
              ${activeTab === "overview"
                ? "text-white bg-gradient-to-r from-purple-600/30 to-pink-600/30 shadow-lg shadow-purple-500/10"
                : "text-gray-200 hover:text-gray-400"}
            `}
            onClick={() => setActiveTab("overview")}
          >
            <span
              className={`absolute bottom-0 left-0 w-full h-[2px] rounded-full transition-all duration-200 
                ${activeTab === "overview" ? "bg-gradient-to-r from-purple-400 to-pink-400" : "bg-transparent"}
              `}
            />
            Geral
          </button>
          <button
            className={`relative py-2 px-3 font-medium text-sm rounded-t-lg transition-all duration-200 
              ${activeTab === "accounts"
                ? "text-white bg-gradient-to-r from-purple-600/30 to-pink-600/30 shadow-lg shadow-purple-500/10"
                : "text-gray-200 hover:text-gray-400"}
            `}
            onClick={() => setActiveTab("accounts")}
          >
            <span
              className={`absolute bottom-0 left-0 w-full h-[2px] rounded-full transition-all duration-200 
                ${activeTab === "accounts" ? "bg-gradient-to-r from-purple-400 to-pink-400" : "bg-transparent"}
              `}
            />
            Contas
          </button>
          <button
            className={`relative py-2 px-3 font-medium text-sm rounded-t-lg transition-all duration-200 
              ${activeTab === "investments"
                ? "text-white bg-gradient-to-r from-purple-600/30 to-pink-600/30 shadow-lg shadow-purple-500/10"
                : "text-gray-200 hover:text-gray-400"}
            `}
            onClick={() => setActiveTab("investments")}
          >
            <span
              className={`absolute bottom-0 left-0 w-full h-[2px] rounded-full transition-all duration-200 
                ${activeTab === "investments" ? "bg-gradient-to-r from-purple-400 to-pink-400" : "bg-transparent"}
              `}
            />
            Investimentos
          </button>
        </div>

        {!user || isLoading ? (
          <DashboardSkeleton />
        ) : hasData ? (
          <>
            {/* Conteúdo baseado na tab ativa */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                {/* Cards de resumo */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  <SummaryCard 
                    title="Saldo Total" 
                    value={dashboardData.analytics.total} 
                    type="total"
                    icon='account_balance'
                    showValues={user?.showValues}
                  />
                  <SummaryCard 
                    title="Receitas" 
                    value={dashboardData.analytics.byType.income} 
                    type="income"
                    icon='trending_up'
                    showValues={user?.showValues}
                  />
                  <SummaryCard 
                    title="Despesas" 
                    value={dashboardData.analytics.byType.expense} 
                    type="expense"
                    icon='trending_down'
                    showValues={user?.showValues}
                  />
                  <SummaryCard 
                    title="Investimentos" 
                    value={dashboardData.analytics.byType.investment.net} 
                    type="investment"
                    icon='trending_up'
                    showValues={user?.showValues}
                  />
                </div>

                {/* Gráficos e visualizações */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white/80 backdrop-blur-md rounded-2xl p-6">
                    <FinancialChart 
                      income={dashboardData.analytics.byType.income}
                      expenses={dashboardData.analytics.byType.expense}
                      investments={dashboardData.analytics.byType.investment.net}
                      showValues={user?.showValues}
                    />
                  </div>
                  
                  <CategoryDistribution 
                    expensesByCategory={dashboardData.analytics.byAccount.flatMap(
                      acc => acc.byType.expense.byCategory
                    )}
                    incomeByCategory={dashboardData.analytics.byAccount.flatMap(
                      acc => acc.byType.income.byCategory
                    )}
                    showValues={user?.showValues}
                  />
                </div>

                {/* Contas com saldo positivo */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-800">Suas Contas</h3>
                    <button 
                      className="text-sm text-blue-600 flex items-center hover:text-blue-800 transition-colors"
                      onClick={() => setActiveTab("accounts")}
                    >
                      Ver todas <FaArrowRight className="ml-1" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dashboardData.analytics.byAccount
                      .slice(0, 4)
                      .map((account) => (
                        <AccountCard 
                          key={account.accountId} 
                          account={account} 
                          compact={true}
                          showValues={user?.showValues}
                        />
                      ))
                    }
                  </div>
                </div>
              </div>  
            )}

            {activeTab === "accounts" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  {dashboardData.analytics.byAccount
                    .filter(account => account.accountType !== "INVESTMENT")
                    .map((account) => (
                    <AccountCard 
                      key={account.accountId} 
                      account={account} 
                      showValues={user?.showValues}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeTab === "investments" && (
              <div className="space-y-4">
                {dashboardData.analytics.byType.investment.byTicker.length > 0 ? (
                  <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6">
                    <InvestmentPerformance 
                      investments={dashboardData.analytics.byType.investment.byTicker.map((item) => ({
                        ticker: item.ticker ?? "N/A",
                        buy: typeof item.buy === "number" ? item.buy : 0,
                        sell: typeof item.sell === "number" ? item.sell : 0,
                        net: typeof item.net === "number" ? item.net : 0,
                      }))}
                      showValues={user?.showValues}
                    />
                  </div>
                ) : (
                  <div className="bg-white/80 backdrop-blur-md rounded-2xl p-8 text-center">
                    <div className="mx-auto h-16 w-16 text-gray-300 mb-4 flex items-center justify-center">
                      <FaChartLine size={64} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum investimento encontrado</h3>
                    <p className="text-gray-500">Não há registros de investimentos para o período selecionado.</p>
                  </div>
                )}
                
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-6">Contas de Investimento</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {dashboardData.analytics.byAccount
                      .filter(account => account.accountType === "INVESTMENT")
                      .map((account) => (
                        <AccountCard 
                          key={account.accountId} 
                          account={account} 
                          showValues={user?.showValues}
                        />
                      ))
                    }
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 text-center">
            <div className="mx-auto h-12 w-12 text-gray-600 mb-2 flex items-center justify-center">
              <FaChartPie size={50} />
            </div>
            <h3 className="text-xl font-medium text-gray-900">Nenhum dado encontrado</h3>
            <p className="text-gray-600">Não há registros financeiros para o período selecionado.</p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}