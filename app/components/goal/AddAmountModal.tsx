// app/components/AddAmountModal.tsx
"use client";

import { useState } from 'react';

import { FinancialGoal } from '@/app/types/goals';

import { useThemeColors } from '@/app/hook';

import { formatCurrency } from '@/app/utils';

import { FaTimes, FaPlus } from 'react-icons/fa';

interface AddAmountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAmount: (amount: number) => Promise<void>;
  goal: FinancialGoal;
  loading?: boolean;
}

export default function AddAmountModal({ isOpen, onClose, onAddAmount, goal, loading = false }: AddAmountModalProps) {
  const colors = useThemeColors();
  const [customAmount, setCustomAmount] = useState('');

  const quickAmounts = [1000, 5000, 10000, 50000, 100000]; // Em centavos

  const handleAddAmount = async (selectedAmount: number) => {
    try {
      await onAddAmount(selectedAmount);
      onClose();
      setCustomAmount('');
    } catch (error) {
      console.error('Erro ao adicionar valor:', error);
    }
  };

  const handleCustomAmount = () => {
    const customValue = Math.round(parseFloat(customAmount) * 100);
    if (customValue > 0) {
      handleAddAmount(customValue);
    }
  };

  const remainingAmount = goal.targetAmount - goal.currentAmount;

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 ${colors.bg.overlay} flex items-center justify-center z-50 p-4 animate-fade-in`}>
      <div 
        className={`
          ${colors.bg.modal} rounded-2xl shadow-xl w-full max-w-sm
          animate-slide-up
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${colors.border.primary}`}>
          <div>
            <h2 className={`text-lg font-bold ${colors.text.primary}`}>
              Adicionar Valor
            </h2>
            <p className={`text-sm ${colors.text.secondary} mt-1`}>
              {goal.title}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className={`p-2 rounded-lg transition-colors ${colors.state.hover} ${colors.text.secondary}`}
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Progress */}
        <div className="p-6 border-b ${colors.border.primary}">
          <div className="flex justify-between items-center mb-2">
            <span className={`text-sm ${colors.text.primary}`}>Progresso atual</span>
            <span className={`text-sm font-medium ${colors.text.primary}`}>
              {formatCurrency(goal.currentAmount /100)} / {formatCurrency(goal.targetAmount/100)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${(goal.currentAmount / goal.targetAmount) * 100}%`,
                backgroundColor: goal.color
              }}
            />
          </div>
          <p className={`text-xs ${colors.text.tertiary} mt-2 text-center`}>
            Faltam {formatCurrency(remainingAmount/100)} para completar
          </p>
        </div>

        {/* Quick Amounts */}
        <div className="p-6">
          <h3 className={`text-sm font-medium mb-4 ${colors.text.primary}`}>
            Valores rápidos
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {quickAmounts.map((quickAmount) => (
              <button
                key={quickAmount}
                onClick={() => handleAddAmount(quickAmount)}
                disabled={loading || remainingAmount < quickAmount}
                className={`
                  py-3 px-4 rounded-lg border-2 transition-all text-sm font-medium
                  ${remainingAmount < quickAmount 
                    ? 'opacity-50 cursor-not-allowed border-gray-300 text-gray-400' 
                    : `border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 
                       active:scale-95`
                  }
                `}
              >
                {formatCurrency(quickAmount/100)}
              </button>
            ))}
          </div>

          {/* Custom Amount */}
          <div>
            <h3 className={`text-sm font-medium mb-3 ${colors.text.primary}`}>
              Valor personalizado
            </h3>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={remainingAmount / 100}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className={`
                    w-full pl-10 pr-3 py-2 rounded-lg border transition-colors
                    ${colors.border.primary} ${colors.text.primary}
                    placeholder:${colors.text.tertiary}
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  `}
                  placeholder="0,00"
                  disabled={loading}
                />
              </div>
              <button
                onClick={handleCustomAmount}
                disabled={loading || !customAmount || parseFloat(customAmount) <= 0 || parseFloat(customAmount) > (remainingAmount / 100)}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2
                  ${!customAmount || parseFloat(customAmount) <= 0 || parseFloat(customAmount) > (remainingAmount / 100)
                    ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-500'
                    : `${colors.button.primary.bg} ${colors.button.primary.text} hover:scale-105 active:scale-95`
                  }
                `}
              >
                <FaPlus size={14} />
                Add
              </button>
            </div>
            {customAmount && parseFloat(customAmount) > (remainingAmount / 100) && (
              <p className="text-red-500 text-xs mt-2">
                Valor excede o necessário para completar a meta
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}