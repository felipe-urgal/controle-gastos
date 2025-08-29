// app/dashboard/page.tsx
"use client";

import { useRouter } from 'next/navigation';
import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { ProtectedRoute, DateSelector, DashboardSkeleton, SummaryCard, AccountCard, FinancialChart, CategoryDistribution, InvestmentPerformance } from "@/app/components";
import { dashboardService } from '@/app/services/dashboardService';
import { DashboardResponse } from '@/app/types/dashboard';

import { FiPieChart, FiArrowRight, FiTrendingUp } from "react-icons/fi";

export default function DashboardPage() {
  const router = useRouter();

  const handleAddTransaction = () => {
    router.push('/transacoes');
  };
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

        <div className="flex space-x-2 mb-4 border-b border-gray-100">
          <button
            className={`py-3 px-6 font-medium text-sm rounded-t-lg transition-all duration-200 ${activeTab === "overview" ? "text-blue-600 bg-white border-t border-l border-r border-gray-200 shadow-sm" : "text-gray-200 hover:text-gray-400"}`}
            onClick={() => setActiveTab("overview")}
          >
            Visão Geral
          </button>
          <button
            className={`py-3 px-6 font-medium text-sm rounded-t-lg transition-all duration-200 ${activeTab === "accounts" ? "text-blue-600 bg-white border-t border-l border-r border-gray-200 shadow-sm" : "text-gray-200 hover:text-gray-400"}`}
            onClick={() => setActiveTab("accounts")}
          >
            Contas
          </button>
          <button
            className={`py-3 px-6 font-medium text-sm rounded-t-lg transition-all duration-200 ${activeTab === "investments" ? "text-blue-600 bg-white border-t border-l border-r border-gray-200 shadow-sm" : "text-gray-200 hover:text-gray-400"}`}
            onClick={() => setActiveTab("investments")}
          >
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
                  />
                  <SummaryCard 
                    title="Receitas" 
                    value={dashboardData.analytics.byType.income} 
                    type="income"
                    icon='trending_up'
                  />
                  <SummaryCard 
                    title="Despesas" 
                    value={dashboardData.analytics.byType.expense} 
                    type="expense"
                    icon='trending_down'
                  />
                  <SummaryCard 
                    title="Investimentos" 
                    value={dashboardData.analytics.byType.investment.net} 
                    type="investment"
                    icon='trending_up'
                  />
                </div>

                {/* Gráficos e visualizações */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <FinancialChart 
                      income={dashboardData.analytics.byType.income}
                      expenses={dashboardData.analytics.byType.expense}
                      investments={dashboardData.analytics.byType.investment.net}
                    />
                  </div>
                  
                  <CategoryDistribution 
                    expensesByCategory={dashboardData.analytics.byAccount.flatMap(
                      acc => acc.byType.expense.byCategory
                    )}
                    incomeByCategory={dashboardData.analytics.byAccount.flatMap(
                      acc => acc.byType.income.byCategory
                    )}
                  />
                </div>

                {/* Contas com saldo positivo */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-800">Suas Contas</h3>
                    <button 
                      className="text-sm text-blue-600 flex items-center hover:text-blue-800 transition-colors"
                      onClick={() => setActiveTab("accounts")}
                    >
                      Ver todas <FiArrowRight className="ml-1" />
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
                      expanded={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeTab === "investments" && (
              <div className="space-y-4">
                {dashboardData.analytics.byType.investment.byTicker.length > 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <InvestmentPerformance 
                      investments={dashboardData.analytics.byType.investment.byTicker.map((item) => ({
                        ticker: item.ticker ?? "N/A",
                        buy: typeof item.buy === "number" ? item.buy : 0,
                        sell: typeof item.sell === "number" ? item.sell : 0,
                        net: typeof item.net === "number" ? item.net : 0,
                      }))}
                    />
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm p-8 text-center border border-gray-100">
                    <div className="mx-auto h-16 w-16 text-gray-300 mb-4 flex items-center justify-center">
                      <FiTrendingUp size={64} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum investimento encontrado</h3>
                    <p className="text-gray-500">Não há registros de investimentos para o período selecionado.</p>
                  </div>
                )}
                
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-800 mb-6">Contas de Investimento</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {dashboardData.analytics.byAccount
                      .filter(account => account.accountType === "INVESTMENT")
                      .map((account) => (
                        <AccountCard 
                          key={account.accountId} 
                          account={account} 
                          expanded={true}
                        />
                      ))
                    }
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
            <div className="mx-auto h-20 w-20 text-gray-200 mb-6 flex items-center justify-center">
              <FiPieChart size={80} />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Nenhum dado encontrado</h3>
            <p className="text-gray-500 mb-6">Não há registros financeiros para o período selecionado.</p>
            <button 
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={handleAddTransaction}
            >
              Adicionar primeira transação
            </button>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}