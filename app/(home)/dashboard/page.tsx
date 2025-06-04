"use client";

// Context
import { useAuth } from "@/app/context/AuthContext";

// Hooks
import { useState, useCallback, useEffect } from "react";

// Components
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Breadcrumb from "@/app/components/Breadcrumb";
import { Button } from "@/app/components/ui/Button"

// Utils
import { months } from '@/app/utils/format'

// Types
import { DashboardResponse } from '@/app/types/dashboard'

// Services
import { dashboardService } from '@/app/services/dashboardService'

// Icons
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';

export default function DashboardPage() {
  const { user } = useAuth();

  const [currentDate, setCurrentDate]             = useState(new Date());
  const [isLoading, setIsLoading]                 = useState(false);
  const [dashboardData, setDashboardData]         = useState<DashboardResponse | null>(null);

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

  return (
    <ProtectedRoute>
      <Breadcrumb />

      <div className="my-3">
        {/* Seletor de Mês/Ano */}
        <div className="flex justify-between items-center">
          <Button 
            variant='link'
            onClick={handlePreviousMonth}
            icon={<FaArrowLeft size={18} />}
            className="text-gray-400 cursor-pointer"
          />
          
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-400">
              {months[currentDate.getMonth()]} de {currentDate.getFullYear()}
            </h2>
          </div>
          
          <Button
            variant='link'
            onClick={handleNextMonth}
            icon={<FaArrowRight size={18} />}
            className="text-gray-400 cursor-pointer"
          />
        </div>

        {!user || isLoading ? (
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : dashboardData ? (
          <div className="p-3">
            <div className="py-3 grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="col-span-3 lg:col-span-1 bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg hover:border-gray-600 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <div className={`p-2 rounded-lg ${dashboardData.analytics.total < 0 ? 'bg-red-900/30' : 'bg-green-900/30'}`}>
                        {dashboardData.analytics.total < 0 ? (
                          <svg className="w-4 h-4 lg:w-5 lg:h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 lg:w-5 lg:h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        )}
                      </div>
                      <h3 className="text-xs uppercase tracking-wider text-gray-400 font-medium">Saldo Total</h3>
                    </div>
                    <p className={`mt-3 text-xl font-bold ${
                      dashboardData.analytics.total < 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {dashboardData.analytics.total.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 2
                      })}
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      dashboardData.analytics.total < 0 ? 'bg-red-500' : 'bg-green-500'
                    }`} 
                    style={{ 
                      width: `${(() => {
                        // Evita divisão por zero e valores absurdos
                        const maxValue = Math.max(
                          Math.abs(dashboardData.analytics.byType.income),
                          Math.abs(dashboardData.analytics.byType.expense),
                          Math.abs(dashboardData.analytics.byType.investment),
                          1 // Valor mínimo para evitar divisão por zero
                        );
                        
                        const percentage = (Math.abs(dashboardData.analytics.total) / maxValue) * 100;
                        
                        // Limita entre 0% e 100%
                        return Math.min(100, Math.max(0, percentage));
                      })()}%` 
                    }}
                  ></div>
                </div>
              </div>

              <div className="col-span-1 bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg hover:border-green-500/30 transition-colors">
                <div>
                  <div className="flex items-center space-x-2">
                    <div className="hidden lg:flex p-2 bg-green-900/30 rounded-lg">
                      <svg className="w-2 h-2 lg:w-5 lg:h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-[10px] lg:text-xs uppercase tracking-wider text-gray-400 font-medium">Receitas</h3>
                  </div>
                  <p className="mt-3 text-[12px] lg:text-xl font-bold text-green-400">
                    {dashboardData.analytics.byType.income.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      minimumFractionDigits: 2
                    })}
                  </p>
                </div>
                <div className="mt-4 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500" 
                    style={{ 
                      width: `${dashboardData.analytics.byType.income > 0 ? '100%' : '0%'}` 
                    }}
                  ></div>
                </div>
              </div>

              <div className="col-span-1 bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg hover:border-red-500/30 transition-colors">
                <div>
                  <div className="flex items-center space-x-2">
                    <div className="hidden lg:flex p-2 bg-red-900/30 rounded-lg">
                      <svg className="w-2 h-2 lg:w-5 lg:h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-[10px] lg:text-xs uppercase tracking-wider text-gray-400 font-medium">Despesas</h3>
                  </div>
                  <p className="mt-3 text-[12px] lg:text-xl font-bold text-red-400">
                    {dashboardData.analytics.byType.expense.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      minimumFractionDigits: 2
                    })}
                  </p>
                </div>
                <div className="mt-4 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500" 
                    style={{ 
                      width: `${dashboardData.analytics.byType.expense > 0 ? '100%' : '0%'}` 
                    }}
                  ></div>
                </div>
              </div>

              <div className="col-span-1 bg-gray-800 p-3 lg:p-4 rounded-xl border border-gray-700 shadow-lg hover:border-blue-500/30 transition-colors">
                <div>
                  <div className="flex items-center space-x-2">
                    <div className="hidden lg:flex p-2 bg-blue-900/30 rounded-lg">
                      <svg className="w-2 h-2 lg:w-5 lg:h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <h3 className="text-[10px] lg:text-xs uppercase tracking-wider text-gray-400 font-medium">Investimentos</h3>
                  </div>
                  <p className="mt-3 text-[12px] lg:text-xl font-bold text-blue-400">
                    {dashboardData.analytics.byType.investment.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      minimumFractionDigits: 2
                    })}
                  </p>
                </div>
                <div className="mt-4 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500" 
                    style={{ 
                      width: `${dashboardData.analytics.byType.investment > 0 ? '100%' : '0%'}` 
                    }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="lg:py-3">
              <div className="bg-gray-900/90 p-4 lg:p-8 rounded-2xl shadow-md border border-gray-700">
                <h3 className="text-gray-500 text-base lg:text-xl font-semibold mb-8 tracking-wide border-b border-gray-700 pb-3">
                  Detalhamento por Conta
                </h3>
                <div className="flex flex-col gap-8">
                  {dashboardData.analytics.byAccount.map((account) => (
                    <div
                      key={account.accountId}
                      className="bg-gray-800/80 rounded-xl p-5 shadow-sm border border-gray-700 hover:shadow-lg transition-all duration-200"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-base lg:text-lg font-medium text-gray-100 flex items-center gap-2">
                          <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                            <path d="M8 12l2 2 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {account.accountName}
                        </h4>
                        <span
                          className={`text-lg font-bold ${
                            account.total >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          R$ {account.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="flex flex-col lg:flex-row items-center gap-2">
                          <span className="text-[10px] lg:text-xl text-gray-400 flex items-center gap-1">
                            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24"><path d="M4 12l6 6L20 6" stroke="currentColor" strokeWidth="2"/></svg>
                            Receitas:
                          </span>
                          <span className="text-[12px] lg:text-xl text-emerald-400 font-semibold">
                            R$ {account.byType.income.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex flex-col lg:flex-row items-center gap-2">
                          <span className="text-[10px] lg:text-xl text-gray-400 flex items-center gap-1">
                            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2"/></svg>
                            Despesas:
                          </span>
                          <span className="text-[12px] lg:text-xl text-rose-400 font-semibold">
                            R$ {account.byType.expense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex flex-col lg:flex-row items-center gap-2">
                          <span className="text-[10px] lg:text-xl text-gray-400 flex items-center gap-1">
                            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2"/></svg>
                            Investimentos:
                          </span>
                          <span className="text-[12px] lg:text-xl text-blue-400 font-semibold">
                            R$ {account.byType.investment.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <details className="group border-t pt-3 border-gray-700">
                        <summary className="flex justify-between items-center cursor-pointer text-gray-400 text-xs hover:text-gray-300">
                          <span>Ver categorias</span>
                          <svg 
                            className="w-4 h-4 group-open:rotate-180 transition-transform" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </summary>
                        
                        <div className="mt-3 space-y-3">
                          {account.byCategory.map((category) => (
                            <div 
                              key={category.categoryId} 
                              className="bg-gray-700/30 p-3 rounded-lg border border-gray-700"
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                  <span className="text-xs lg:text-sm text-gray-200">
                                    {category.categoryName}
                                  </span>
                                </div>
                                <span 
                                  className={`text-xs lg:text-sm font-medium ${
                                    category.total >= 0 ? 'text-green-400' : 'text-red-400'
                                  }`}
                                >
                                  {category.total >= 0 ? '+' : ''}
                                  {category.total.toLocaleString('pt-BR', { 
                                    style: 'currency', 
                                    currency: 'BRL',
                                    minimumFractionDigits: 2 
                                  })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">
            Nenhum dado encontrado para o período selecionado
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
