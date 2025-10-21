// app/components/GoalsList.tsx
"use client";

import { FinancialGoal } from '@/app/types/goals';

import { useThemeColors } from '@/app/hook';

import GoalCard from './GoalCard';

import { FaPlus, FaChartLine } from 'react-icons/fa';

interface GoalsListProps {
  goals: (FinancialGoal & {
    progress?: number;
    daysRemaining?: number;
    monthlyContribution?: number;
    status?: 'completed' | 'expired' | 'active' | 'urgent';
  })[];
  loading?: boolean;
  onAddGoal: () => void;
  onEditGoal: (goal: FinancialGoal) => void;
  onDeleteGoal: (goalId: string) => void;
  onAddAmount: (goalId: string) => void;
  stats: {
    totalGoals: number;
    completedGoals: number;
    totalTarget: number;
    totalCurrent: number;
    totalProgress: number;
  };
}

export default function GoalsList({ 
  goals, 
  loading = false, 
  onAddGoal, 
  onEditGoal, 
  onDeleteGoal, 
  onAddAmount,
  stats 
}: GoalsListProps) {
  const colors = useThemeColors();

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className={`rounded-xl p-4 border ${colors.border.primary}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-gray-300 rounded"></div>
                  <div className="h-2 bg-gray-300 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header Stats */}
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 rounded-xl ${colors.bg.secondary}`}>
        <div className="text-center">
          <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.totalGoals}</p>
          <p className={`text-xs ${colors.text.tertiary}`}>Metas</p>
        </div>
        <div className="text-center">
          <p className={`text-2xl font-bold text-green-500`}>{stats.completedGoals}</p>
          <p className={`text-xs ${colors.text.tertiary}`}>Concluídas</p>
        </div>
        <div className="text-center">
          <p className={`text-2xl font-bold ${colors.text.primary}`}>
            {Math.round(stats.totalProgress)}%
          </p>
          <p className={`text-xs ${colors.text.tertiary}`}>Progresso Total</p>
        </div>
        <div className="text-center">
          <p className={`text-lg font-bold ${colors.text.primary}`}>
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format(stats.totalCurrent / 100)}
          </p>
          <p className={`text-xs ${colors.text.tertiary}`}>Economizado</p>
        </div>
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className={`text-center py-12 rounded-xl border-2 border-dashed ${colors.border.primary}`}>
          <FaChartLine className={`mx-auto text-4xl mb-4 ${colors.text.tertiary}`} />
          <h3 className={`text-lg font-medium mb-2 ${colors.text.primary}`}>
            Nenhuma meta encontrada
          </h3>
          <p className={`mb-6 ${colors.text.secondary}`}>
            Crie sua primeira meta financeira e comece a planejar seu futuro
          </p>
          <button
            onClick={onAddGoal}
            className={`
              inline-flex items-center gap-2 py-3 px-6 rounded-lg font-medium transition-all
              hover:scale-105 active:scale-95 shadow-sm
              ${colors.button.primary.bg} ${colors.button.primary.text} 
            `}
          >
            <FaPlus size={16} />
            Criar Primeira Meta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={onEditGoal}
              onDelete={onDeleteGoal}
              onAddAmount={onAddAmount}
            />
          ))}
        </div>
      )}
    </div>
  );
}