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
import { FaArrowLeft, FaArrowRight, FaArrowDown, FaArrowUp, FaCreditCard } from 'react-icons/fa';
import { FaMoneyBillTrendUp } from 'react-icons/fa6';
import { HiChevronDown } from "react-icons/hi";

export default function DashboardPage() {
  const { user } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);

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
                          <FaArrowDown className="w-3 h-3 lg:w-4 lg:h-4 text-red-400" />
                        ) : (
                          <FaArrowUp className="w-3 h-3 lg:w-4 lg:h-4 text-green-400" />
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
                        const maxValue = Math.max(
                          Math.abs(dashboardData.analytics.byType.income),
                          Math.abs(dashboardData.analytics.byType.expense),
                          Math.abs(dashboardData.analytics.byType.investment),
                          1
                        );
                        
                        const percentage = (Math.abs(dashboardData.analytics.total) / maxValue) * 100;
                        
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
                      <FaArrowUp className="w-4 h-4 lg:w-4 lg:h-4 text-green-400" />
                    </div>
                    <h3 className="text-[10px] lg:text-xs uppercase tracking-wider text-gray-400 font-medium">Receitas</h3>
                  </div>
                  <p className="mt-3 text-[14px] lg:text-xl font-bold text-green-400">
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
                      <FaArrowDown className="w-4 h-4 lg:w-4 lg:h-4 text-red-400" />
                    </div>
                    <h3 className="text-[10px] lg:text-xs uppercase tracking-wider text-gray-400 font-medium">Despesas</h3>
                  </div>
                  <p className="mt-3 text-[14px] lg:text-xl font-bold text-red-400">
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
                      <FaMoneyBillTrendUp className="w-4 h-4 lg:w-4 lg:h-4 text-blue-400" />
                    </div>
                    <h3 className="text-[10px] lg:text-xs uppercase tracking-wider text-gray-400 font-medium">Investimentos</h3>
                  </div>
                  <p className="mt-3 text-[14px] lg:text-xl font-bold text-blue-400">
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
              <div className="flex flex-col gap-3 lg:gap-6">
                {dashboardData.analytics.byAccount.map((account) => (
                  <div
                    key={account.accountId}
                    className="bg-gray-800/80 rounded-xl p-5 shadow-sm border border-gray-700 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-base lg:text-lg font-medium text-gray-100 flex items-center gap-2">
                        <FaCreditCard className="w-5 h-5 text-blue-400" />
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

                    <div className="grid grid-cols-3">

                      <div className="flex flex-col lg:flex-row gap-1 lg:gap-2">
                        <span className="text-[14px] lg:text-xl text-gray-400 flex items-center gap-2">
                          <FaArrowUp className="w-2 h-2 lg:w-4 lg:h-4 text-green-400" />
                          Receitas:
                        </span>
                        <span className="text-[14px] lg:text-xl text-emerald-400 font-semibold">
                          R$ {account.byType.income.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex flex-col lg:flex-row gap-1 lg:gap-2">
                        <span className="text-[14px] lg:text-xl text-gray-400 flex items-center gap-2">
                          <FaArrowDown className="w-2 h-2 lg:w-4 lg:h-4 text-red-400" />
                          Despesas:
                        </span>
                        <span className="text-[14px] lg:text-xl text-rose-400 font-semibold">
                          R$ {account.byType.expense.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex flex-col lg:flex-row gap-1 lg:gap-2">
                        <span className="text-[14px] lg:text-xl text-gray-400 flex items-center gap-2">
                          <FaMoneyBillTrendUp className="w-2 h-2 lg:w-4 lg:h-4 text-blue-400" />
                          Investimentos:
                        </span>
                        <span className="text-[14px] lg:text-xl text-blue-400 font-semibold">
                          R$ {account.byType.investment.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                    </div>

                    <details className="mt-3 group border border-gray-700 hover:border-gray-600 transition-colors">
                      <summary className="flex justify-end items-center cursor-pointer text-gray-700 text-xs hover:text-gray-600 transition-colors">
                        <HiChevronDown className="w-8 h-8 group-open:rotate-180 transition-transform" />
                      </summary>
                        
                      <div className="px-6 pb-3">
                        {/* Categorias de Receitas */}
                        {account.byType.income.byCategory.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-xs font-semibold text-gray-400 mb-2">RECEITAS</h5>
                            {account.byType.income.byCategory.map((category) => (
                              <div 
                                key={`income-${category.categoryId}`} 
                                className="bg-gray-700/30 p-3 rounded-lg border border-gray-700 mb-2"
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span className="text-xs lg:text-sm text-gray-200">
                                      {category.categoryName}
                                    </span>
                                  </div>
                                  <span className="text-xs lg:text-sm font-medium text-green-400">
                                    +{category.total.toLocaleString('pt-BR', { 
                                      style: 'currency', 
                                      currency: 'BRL',
                                      minimumFractionDigits: 2 
                                    })}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Categorias de Despesas */}
                        {account.byType.expense.byCategory.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-xs font-semibold text-gray-400 mb-2">DESPESAS</h5>
                            {account.byType.expense.byCategory.map((category) => (
                              <div 
                                key={`expense-${category.categoryId}`} 
                                className="bg-gray-700/30 p-3 rounded-lg border border-gray-700 mb-2"
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                    <span className="text-xs lg:text-sm text-gray-200">
                                      {category.categoryName}
                                    </span>
                                  </div>
                                  <span className="text-xs lg:text-sm font-medium text-red-400">
                                    -{Math.abs(category.total).toLocaleString('pt-BR', { 
                                      style: 'currency', 
                                      currency: 'BRL',
                                      minimumFractionDigits: 2 
                                    })}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Categorias de Investimentos */}
                        {account.byType.investment.byCategory.length > 0 && (
                          <div>
                            <h5 className="text-xs font-semibold text-gray-400 mb-2">INVESTIMENTOS</h5>
                            {account.byType.investment.byCategory.map((category) => (
                              <div 
                                key={`investment-${category.categoryId}`} 
                                className="bg-gray-700/30 p-3 rounded-lg border border-gray-700 mb-2"
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    <span className="text-xs lg:text-sm text-gray-200">
                                      {category.categoryName}
                                    </span>
                                  </div>
                                  <span className="text-xs lg:text-sm font-medium text-blue-400">
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
                        )}
                      </div>
                    </details>
                  </div>
                ))}
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
