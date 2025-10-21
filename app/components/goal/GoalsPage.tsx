// app/components/GoalsPage.tsx (CORRIGIDO)
"use client";

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { FinancialGoal, CreateGoalData, UpdateGoalData } from '@/app/types/goals';

import { AddAmountModal, GoalModal, GoalsList } from '@/app/components';

import { useThemeColors, useGoals } from '@/app/hook';

import { FaCalendar, FaChartLine } from 'react-icons/fa';

import { useUI } from "@/app/context";

export default function GoalsPage() {
  const colors = useThemeColors();
  const router = useRouter();
  const { setModalOpen } = useUI();
  const { goals, loading, createGoal, updateGoal, deleteGoal, addToGoal, stats } = useGoals();
  
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isAddAmountModalOpen, setIsAddAmountModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null);

  const handleBackToCalendar = () => {
    setModalOpen(false);
    router.push('/calendario');
  };

  const handleCreateGoal = async (data: CreateGoalData) => {
    const result = await createGoal(data);
    return result
  };

  const handleUpdateGoal = async (data: UpdateGoalData) => {
    if (editingGoal) {
      const result = await updateGoal(editingGoal.id, data);
      return result
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (confirm('Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.')) {
      await deleteGoal(goalId);
    }
  };

  const handleEditGoal = (goal: FinancialGoal) => {
    setEditingGoal(goal);
    setIsGoalModalOpen(true);
  };

  const handleAddAmount = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      setSelectedGoal(goal);
      setIsAddAmountModalOpen(true);
    }
  };

  const handleSaveGoal = async (data: CreateGoalData | UpdateGoalData) => {
    if (editingGoal) {
      const result = await handleUpdateGoal(data as UpdateGoalData);
      console.log(result)
      return result
    } else {
      const result = await handleCreateGoal(data as CreateGoalData);
      return result
    }
  };

  const handleCloseGoalModal = () => {
    setIsGoalModalOpen(false);
    setEditingGoal(null);
  };

  const handleCloseAddAmountModal = () => {
    setIsAddAmountModalOpen(false);
    setSelectedGoal(null);
  };

  return (
    <div 
      className={`fixed inset-0 ${colors.bg.primary} flex flex-col items-center animate-fade-in safe-area-container`}
    >
      <div 
        className={`
          ${colors.bg.modal} rounded-2xl sm:rounded-3xl shadow-xl w-full h-full sm:mx-4 overflow-hidden flex flex-col 
          animate-slide-up-mobile sm:animate-slide-up
          modal-fullscreen-mobile
        `}
      >
        {/* Header Fixo */}
        <header className={`flex-shrink-0 ${colors.bg.primary} border-b ${colors.border.primary} backdrop-blur-sm bg-opacity-95`}>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Lado Esquerdo - Navegação */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${colors.bg.secondary}`}>
                    <FaChartLine className={`${colors.text.primary}`} size={20} />
                  </div>
                  <div>
                    <h1 className={`text-xl font-bold ${colors.text.primary}`}>
                      Metas Financeiras
                    </h1>
                    <p className={`text-sm ${colors.text.secondary}`}>
                      Planeje e acompanhe seus objetivos
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleBackToCalendar}
                className={`
                  flex items-center gap-2 py-3 px-4 rounded-full shadow-lg transition-all
                  ${colors.button.primary.bg} ${colors.button.primary.text} 
                `}
                title="Voltar para o Calendário"
              >
                <FaCalendar size={16} />
                <span className="sm:inline hidden">Calendário</span>
              </button>
            </div>
          </div>
        </header>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Lista de Metas com Scroll */}
          <div className="flex-1 overflow-y-auto">
            <GoalsList
              goals={goals}
              loading={loading}
              onAddGoal={() => setIsGoalModalOpen(true)}
              onEditGoal={handleEditGoal}
              onDeleteGoal={handleDeleteGoal}
              onAddAmount={handleAddAmount}
              stats={stats}
            />
          </div>
        </div>

        {/* Modals */}
        <GoalModal
          isOpen={isGoalModalOpen}
          onClose={handleCloseGoalModal}
          onSave={handleSaveGoal}
          editingGoal={editingGoal}
          loading={loading}
        />

        {selectedGoal && (
          <AddAmountModal
            isOpen={isAddAmountModalOpen}
            onClose={handleCloseAddAmountModal}
            onAddAmount={(amount) => addToGoal(selectedGoal.id, amount)}
            goal={selectedGoal}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
