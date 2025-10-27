// app/components/GoalCard.tsx
"use client";

import { FinancialGoal } from '@/app/types/goals';

import { useThemeColors } from '@/app/hook';

import { formatCurrency, formatProgress, getDaysRemainingText, getGoalStatus, goalTypeConfig } from '@/app/utils';

import { FaEdit, FaTrash, FaPlus, FaCheck, FaClock, FaExclamationTriangle } from 'react-icons/fa';

import { IconRenderer } from '@/app/components';

interface GoalCardProps {
  goal: FinancialGoal & {
    progress?: number;
    daysRemaining?: number;
    monthlyContribution?: number;
    status?: 'completed' | 'expired' | 'active' | 'urgent';
  };
  onEdit: (goal: FinancialGoal) => void;
  onDelete: (goalId: string) => void;
  onAddAmount: (goalId: string) => void;
  loading?: boolean;
}

export default function GoalCard({ goal, onEdit, onDelete, onAddAmount, loading = false }: GoalCardProps) {
  const colors = useThemeColors();
  const goalConfig = goalTypeConfig[goal.type];
  const status = goal.status || getGoalStatus(goal);

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <FaCheck className="text-green-500" size={14} />;
      case 'expired':
        return <FaExclamationTriangle className="text-red-500" size={14} />;
      case 'urgent':
        return <FaClock className="text-orange-500" size={14} />;
      default:
        return <FaClock className="text-blue-500" size={14} />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800';
      case 'expired':
        return 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800';
      case 'urgent':
        return 'border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800';
      default:
        return `border-${colors.border.primary.split('-')[2]}-200 bg-${colors.bg.secondary.split('-')[2]} dark:bg-${colors.bg.secondary.split('-')[2]}`;
    }
  };

  return (
    <div className={`
      rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md
      ${getStatusColor()}
      ${loading ? 'opacity-60' : ''}
    `}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg flex-shrink-0"
            style={{ backgroundColor: goal.color }}
          >
            <IconRenderer iconName={goal.icon} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={`font-semibold text-sm truncate ${colors.text.primary}`}>
              {goal.title}
            </h3>
            <p className={`text-xs ${colors.text.tertiary} truncate`}>
              {goalConfig.label}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {getStatusIcon()}
          <button
            onClick={() => onEdit(goal)}
            disabled={loading}
            className={`p-1.5 rounded-lg transition-colors ${colors.state.hover} ${colors.text.secondary} hover:${colors.text.primary}`}
            title="Editar meta"
          >
            <FaEdit size={12} />
          </button>
          <button
            onClick={() => onDelete(goal.id)}
            disabled={loading}
            className={`p-1.5 rounded-lg transition-colors ${colors.state.hover} ${colors.text.secondary} hover:text-red-500`}
            title="Excluir meta"
          >
            <FaTrash size={12} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-2">
          <span className={`text-xs font-medium ${colors.text.primary}`}>
            Progresso
          </span>
          <span className={`text-xs ${colors.text.secondary}`}>
            {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${goal.progress || 0}%`,
              backgroundColor: goal.color
            }}
          />
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className={`text-xs ${colors.text.tertiary}`}>
            {formatProgress(goal.progress || 0)}
          </span>
          {goal.monthlyContribution && goal.monthlyContribution > 0 && (
            <span className={`text-xs ${colors.text.tertiary}`}>
              {formatCurrency(goal.monthlyContribution)}/mês
            </span>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <p className={`text-xs ${colors.text.tertiary} mb-1`}>Data Limite</p>
          <p className={`text-sm font-medium ${colors.text.primary}`}>
            {new Date(goal.deadline).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <div>
          <p className={`text-xs ${colors.text.tertiary} mb-1`}>Tempo Restante</p>
          <p className={`text-sm font-medium ${
            status === 'expired' ? 'text-red-500' : 
            status === 'urgent' ? 'text-orange-500' : colors.text.primary
          }`}>
            {getDaysRemainingText(goal.daysRemaining || 0)}
          </p>
        </div>
      </div>

      {/* Actions */}
      {!goal.isCompleted && status !== 'expired' && (
        <div className="flex gap-2">
          <button
            onClick={() => onAddAmount(goal.id)}
            disabled={loading}
            className={`
              flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium
              transition-all duration-200 transform hover:scale-105 active:scale-95
              ${colors.button.primary.bg} ${colors.button.primary.text} 
              shadow-sm
            `}
          >
            <FaPlus size={12} />
            Adicionar Valor
          </button>
        </div>
      )}

      {goal.description && (
        <div className={`mt-3 pt-3 border-t ${colors.border.primary}`}>
          <p className={`text-xs ${colors.text.secondary} line-clamp-2`}>
            {goal.description}
          </p>
        </div>
      )}
    </div>
  );
}