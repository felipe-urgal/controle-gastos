"use client";

// Context
import { useAuth } from "@/app/context/AuthContext";

// Hooks
import { useState, useCallback, useEffect } from "react";

// Components
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Breadcrumb from "@/app/components/Breadcrumb";
import { Button } from "@/app/components/ui/Button"
import { DonutChart } from "@/app/components/dashboard/DonutChart"
import { BarChart } from "@/app/components/dashboard/BarChart"

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
            <div className="py-3 grid grid-cols-3 lg:grid-cols-4 gap-3">
              {/* Saldo Total - ocupa 2 colunas no mobile, 1 no desktop */}
              <div className="col-span-3 lg:col-span-1 bg-gray-800 p-2 lg:p-4 rounded-lg shadow-sm border border-gray-600">
                <h3 className="text-gray-500 text-xs font-medium">Saldo Total</h3>
                <p className={`${dashboardData.analytics.total < 0 ? 'text-red-600' : 'text-green-600' } text-xs lg:text-[16px] font-bold mt-2`}>
                  R$ {dashboardData.analytics.total.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>

              {/* Os outros três cards - cada um ocupa 1 coluna no mobile e desktop */}
              <div className="bg-gray-800 p-2 lg:p-4 rounded-lg shadow-sm border border-gray-600">
                <h3 className="text-gray-500 text-xs font-medium">Receitas</h3>
                <p className="text-xs lg:text-[16px] font-bold mt-2 text-green-600">
                  R$ {dashboardData.analytics.byType.income.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>

              <div className="bg-gray-800 p-2 lg:p-4 rounded-lg shadow-sm border border-gray-600">
                <h3 className="text-gray-500 text-xs font-medium">Despesas</h3>
                <p className="text-xs lg:text-[16px] font-bold mt-2 text-red-600">
                  R$ {dashboardData.analytics.byType.expense.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>

              <div className="bg-gray-800 p-2 lg:p-4 rounded-lg shadow-sm border border-gray-600">
                <h3 className="text-gray-500 text-xs font-medium">Investimentos</h3>
                <p className="text-xs lg:text-[16px] font-bold mt-2 text-blue-600">
                  R$ {dashboardData.analytics.byType.investment.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
            </div>

            <div className="lg:py-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="bg-gray-800 p-2 lg:p-4 rounded-lg shadow-sm border border-gray-700">
                <h3 className="text-gray-500 text-xs lg:text-[16px] font-medium mb-4">Detalhamento por Conta</h3>
                <div className="space-y-4">
                  {dashboardData.analytics.byAccount.map(account => (
                    <div key={account.accountId} className="border-b border-gray-700 pb-4 last:border-b-0">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs lg:text-[16px] font-medium text-gray-200">{account.accountName}</h4>
                        <span className={`text-xs lg:text-[16px] font-semibold ${
                          account.total >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          R$ {account.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-xs lg:text-[16px]">
                        <div className="flex flex-col lg:flex-row">
                          <span className="text-gray-500">Receitas:</span>
                          <span className="text-green-600 ml-2">
                            R$ {account.byType.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex flex-col lg:flex-row">
                          <span className="text-gray-500">Despesas:</span>
                          <span className="text-red-600 ml-2">
                            R$ {account.byType.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex flex-col lg:flex-row">
                          <span className="text-gray-500">Investimentos:</span>
                          <span className="text-blue-600 ml-2">
                            R$ {account.byType.investment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 p-2 lg:p-4 rounded-lg shadow-sm border border-gray-700">
                <h3 className="text-gray-500 text-xs lg:text-[16px] font-medium mb-4">Detalhamento por Categoria</h3>
                <div className="space-y-4">
                  {dashboardData.analytics.byCategory.map((category, index) => (
                    <div key={category.categoryId || index} className="border-b border-gray-700 pb-4 last:border-b-0">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs lg:text-[16px] font-medium text-gray-200">{category.categoryName || 'Sem categoria'}</h4>
                        <span className={`text-xs lg:text-[16px] font-semibold ${
                          category.total >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          R$ {category.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {Array.isArray(category.byAccount)
                          ? category.byAccount.map(account => (
                              <div key={account.accountId} className="flex justify-between text-sm">
                                <span className="text-xs lg:text-[16px] text-gray-500">{account.accountName}:</span>
                                <span className={`text-xs lg:text-[16px] ${
                                  account.total >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  R$ {account.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            ))
                          : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="py-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="bg-gray-800 p-2 lg:p-4 rounded-lg shadow-sm border border-gray-600 lg:col-span-2">
                <h3 className="text-gray-500 font-medium mb-4 text-xs lg:text-[16px]">Distribuição por Categoria</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                  <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
                    <h3 className="text-xs lg:text-[16px] text-gray-500 font-medium mb-4">Fluxo por Conta</h3>
                    <BarChart 
                      accounts={dashboardData.analytics.byAccount}
                      title="Meu Resumo Financeiro"
                      height={400}
                      width={800}
                      stacked={false}
                      showLegend={true}
                    />
                  </div>
                  
                  <div className="bg-gray-800 p-2 lg:p-4 rounded-lg shadow-sm border border-gray-700">
                    <h3 className="text-xs lg:text-[16px] text-gray-500 font-medium mb-0 lg:mb-4">Distribuição por Categoria</h3>
                    <div className="h-70">
                      <DonutChart data={dashboardData.analytics.byCategory} />
                    </div>
                  </div>
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
