"use client";

// Context
import { useAuth } from "@/app/context/AuthContext";

// Hooks
import { useRouter } from "next/navigation";
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

export default function DashboardPage() {
  const { user } = useAuth();
  const router   = useRouter();

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

  const handleTransactions = () => {
    router.push(`/transacoes`);
  };

  return (
    <ProtectedRoute>
      <Breadcrumb />

      <div className="my-3">
        {/* Seletor de Mês/Ano */}
        <div className="flex justify-between items-center">
          <Button 
            variant='secondary'
            onClick={handlePreviousMonth}
            className="w-10 h-3"
          >
            &lt;
          </Button>
          
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-400">
              {months[currentDate.getMonth()]} de {currentDate.getFullYear()}
            </h2>
          </div>
          
          <Button
            variant='secondary'
            onClick={handleNextMonth}
            className="w-10 h-3"
          >
            &gt;
          </Button>
        </div>

        {!user || isLoading ? (
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : dashboardData ? (
          <div className="p-3">
            <div className="py-3 grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Saldo Total */}
              <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-600">
                <h3 className="text-gray-500 text-sm font-medium">Saldo Total</h3>
                <p className={`${dashboardData.analytics.total < 0 ? 'text-red-600' : 'text-green-600' } text-2xl font-bold mt-2`}>
                  R$ {dashboardData.analytics.total.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>

              {/* Receitas */}
              <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-600">
                <h3 className="text-gray-500 text-sm font-medium">Receitas</h3>
                <p className="text-2xl font-bold mt-2 text-green-600">
                  R$ {dashboardData.analytics.byType.income.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>

              {/* Despesas */}
              <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-600">
                <h3 className="text-gray-500 text-sm font-medium">Despesas</h3>
                <p className="text-2xl font-bold mt-2 text-red-600">
                  R$ {dashboardData.analytics.byType.expense.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>

              {/* Economias */}
              <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-600">
                <h3 className="text-gray-500 text-sm font-medium">Investimentos</h3>
                <p className="text-2xl font-bold mt-2 text-blue-600">
                  R$ {dashboardData.analytics.byType.investment.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
            </div>

            <div className="py-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Detalhamento por Conta */}
              <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
                <h3 className="text-gray-500 font-medium mb-4">Detalhamento por Conta</h3>
                <div className="space-y-4">
                  {dashboardData.analytics.byAccount.map(account => (
                    <div key={account.accountId} className="border-b pb-4 last:border-b-0">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-gray-200">{account.accountName}</h4>
                        <span className={`font-semibold ${
                          account.total >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          R$ {account.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Receitas:</span>
                          <span className="text-green-600 ml-2">
                            R$ {account.byType.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Despesas:</span>
                          <span className="text-red-600 ml-2">
                            R$ {account.byType.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detalhamento por Categoria */}
              <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
                <h3 className="text-gray-500 font-medium mb-4">Detalhamento por Categoria</h3>
                <div className="space-y-4">
                  {dashboardData.analytics.byCategory.map((category, index) => (
                    <div key={category.categoryId || index} className="border-b pb-4 last:border-b-0">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-gray-200">{category.categoryName || 'Sem categoria'}</h4>
                        <span className={`font-semibold ${
                          category.total >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          R$ {category.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {Array.isArray(category.byAccount)
                          ? category.byAccount.map(account => (
                              <div key={account.accountId} className="flex justify-between text-sm">
                                <span className="text-gray-500">{account.accountName}:</span>
                                <span className={`${
                                  account.total >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  R$ {account.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            ))
                          : null}
                        {/*{category.byAccount.map(account => (
                          <div key={account.accountId} className="flex justify-between text-sm">
                            <span className="text-gray-500">{account.accountName}:</span>
                            <span className={`${
                              account.total >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              R$ {account.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}*/}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Gráfico e Categorias */}
            <div className="py-3 grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-600 lg:col-span-2">
                <h3 className="text-gray-500 font-medium mb-4">Distribuição por Categoria</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                  <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
                    <h3 className="text-gray-500 font-medium mb-4">Fluxo por Conta</h3>
                    <div className="h-64">
                      <BarChart accounts={dashboardData.analytics.byAccount} />
                    </div>
                  </div>
                  
                  <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
                    <h3 className="text-gray-500 font-medium mb-4">Distribuição por Categoria</h3>
                    <div className="h-64">
                      <DonutChart data={dashboardData.analytics.byCategory} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de Categorias */}
              <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-600">
                <h3 className="text-gray-500 font-medium mb-4">Top Categorias</h3>
                <div className="space-y-3">
                  {dashboardData.analytics.byCategory
                    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
                    .slice(0, 5)
                    .map((category, index) => {

                      return (
                        <div key={index}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-500">{category.categoryName || 'Sem categoria'}</span>
                            <span className={`${category.total > 0 ? 'text-green-600' : 'text-red-600'} font-medium`}>
                              R$ {category.total.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Últimas Transações */}
            <div className="py-3 px-3 bg-gray-800 rounded-lg shadow-sm border border-gray-600">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-gray-500 font-medium">Últimas Transações</h3>
                <Button variant="secondary" title="Ver todas" onClick={handleTransactions}/>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Conta</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Descrição</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Categoria</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Data</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dashboardData.transactions.slice(0, 5).map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-4 py-3 text-sm text-gray-500">{transaction.account.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{transaction.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {transaction.category?.name || 'Sem categoria'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(transaction.transactionDate).toLocaleDateString('pt-BR')}
                        </td>
                        <td className={`px-4 py-3 text-sm font-medium ${
                          transaction.type === 'INCOME' ? 'text-green-600' :
                          transaction.type === 'INVESTMENT' ? 'text-blue-600' :
                          'text-red-600'
                        }`}>
                          {transaction.type === 'INCOME' ? '+' : '-'} R$ {Number(transaction.amount).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
