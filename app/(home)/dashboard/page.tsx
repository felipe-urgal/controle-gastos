// app/dashboard/page.tsx
"use client";

// Hook
import { useState, useCallback, useEffect } from "react";

// Context
import { useAuth } from "@/app/context/AuthContext";

// Components
import { ProtectedRoute, Breadcrumb, DateSelector, SummaryCard, AccountCard, DashboardSkeleton } from "@/app/components";

// Service
import { dashboardService } from '@/app/services/dashboardService';

// Types
import { DashboardResponse } from '@/app/types/dashboard';

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

      <div className="pt-16 my-3">
        <DateSelector 
          currentDate={currentDate}
          onPrevious={handlePreviousMonth}
          onNext={handleNextMonth}
        />

        {!user || isLoading ? (
          <DashboardSkeleton />
        ) : dashboardData ? (
          <div className="p-3">
            <div className="py-3 grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <div className="col-span-3 lg:col-span-1">
                <SummaryCard 
                  title="Saldo Total" 
                  value={dashboardData.analytics.total} 
                  type="total" 
                />
              </div>
              <SummaryCard 
                title="Receitas" 
                value={dashboardData.analytics.byType.income} 
                type="income" 
              />
              <SummaryCard 
                title="Despesas" 
                value={dashboardData.analytics.byType.expense} 
                type="expense" 
              />
              <SummaryCard 
                title="Investimentos" 
                value={dashboardData.analytics.byType.investment.net} 
                type="investment" 
              />
            </div>

            <div className="">
              <div className="flex flex-col gap-2 lg:gap-3">
                {dashboardData.analytics.byAccount.map((account) => (
                  <AccountCard 
                    key={account.accountId} 
                    account={account} 
                    investments={dashboardData.investments.filter(i => i.accountId === account.accountId)}
                  />
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