// app/components/modals/GoalsModal.tsx
'use client';

import { useEffect, useCallback, useState } from 'react';

import { FaPlus } from 'react-icons/fa';

import { useAuth } from '@/app/context';

import { FinancialGoal, CreateGoalData, UpdateGoalData } from '@/app/types/goals';

import { Button, GoalsList, GoalFormModal, AddAmountModal, ModalBase, ModalMessage } from '@/app/components';

import { useThemeColors, useModalManager, useModal, useGoals } from '@/app/hook';

type GoalStatus = 'completed' | 'expired' | 'active' | 'urgent';

export default function GoalsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const colors = useThemeColors();
  const modal = useModal({ onClose });

  const {
    goals,
    loading,
    createGoal,
    updateGoal,
    deleteGoal,
    addToGoal,
    stats
  } = useGoals();

  // Estado para controlar o modal de adicionar valor
  const [addAmountModalOpen, setAddAmountModalOpen] = useState(false);
  const [selectedGoalForAmount, setSelectedGoalForAmount] = useState<FinancialGoal | null>(null);

  const modalManager = useModalManager<FinancialGoal>({
    fetchItems: useCallback(async () => {
      return goals;
    }, [goals]),
    userId: user?.id,
    initialFilter: 'ALL'
  });

  // Sync with parent isOpen
  useEffect(() => {
    if (isOpen && !modal.isOpen) {
      modal.open();
    } else if (!isOpen && modal.isOpen) {
      modal.close();
      modalManager.resetFormState();
      setAddAmountModalOpen(false);
      setSelectedGoalForAmount(null);
    }
  }, [isOpen, modal, modalManager]);

  const handleCreateGoal = async (data: CreateGoalData) => {
    try {
      const result = await createGoal(data);
      if (result?.success) {
        modalManager.handleSuccess('Meta criada com sucesso!');
        modalManager.handleBackToList();
      } else {
        modalManager.setError(result?.message || 'Erro ao criar meta');
      }
      return result;
    } catch (error) {
      console.log(error)
      modalManager.setError('Erro ao criar meta');
      return { success: false, message: 'Erro ao criar meta' };
    }
  };

  const handleUpdateGoal = async (data: UpdateGoalData) => {
    if (modalManager.currentItem) {
      try {
        const result = await updateGoal(modalManager.currentItem.id, data);
        if (result?.success) {
          modalManager.handleSuccess('Meta atualizada com sucesso!');
          modalManager.handleBackToList();
        } else {
          modalManager.setError(result?.message || 'Erro ao atualizar meta');
        }
        return result;
      } catch (error) {
        console.log(error)
        modalManager.setError('Erro ao atualizar meta');
        return { success: false, message: 'Erro ao atualizar meta' };
      }
    }
    return { success: false, message: 'Meta não encontrada' };
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (confirm('Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.')) {
      try {
        await deleteGoal(goalId);
        modalManager.handleSuccess('Meta excluída com sucesso!');
      } catch (error) {
        console.log(error)
        modalManager.setError('Erro ao excluir meta');
      }
    }
  };

  const handleAddAmount = async (amount: number) => {
    if (selectedGoalForAmount) {
      try {
        await addToGoal(selectedGoalForAmount.id, amount);
        modalManager.handleSuccess('Valor adicionado com sucesso!');
        setAddAmountModalOpen(false);
        setSelectedGoalForAmount(null);
      } catch (error) {
        console.log(error)
        modalManager.setError('Erro ao adicionar valor');
      }
    }
  };

  const handleSaveGoal = async (data: CreateGoalData | UpdateGoalData) => {
    if (modalManager.isEditing && modalManager.currentItem) {
      return await handleUpdateGoal(data as UpdateGoalData);
    } else {
      return await handleCreateGoal(data as CreateGoalData);
    }
  };

  const handleOpenAddAmount = (goal: FinancialGoal) => {
    setSelectedGoalForAmount(goal);
    setAddAmountModalOpen(true);
  };

  const handleCloseAddAmount = () => {
    setAddAmountModalOpen(false);
    setSelectedGoalForAmount(null);
  };

  const getSubtitle = () => {
    if (loading) return 'Carregando...';
    if (goals.length === 0) return 'Nenhuma meta encontrada';
    return `${goals.length} meta${goals.length !== 1 ? 's' : ''}`;
  };

  const getTitle = () => {
    if (modalManager.showForm) {
      return modalManager.isEditing ? 'Editar Meta' : 'Nova Meta';
    }
    return 'Gerenciar Metas';
  };

  const headerActions = !modalManager.showForm ? (
    <Button
      variant="primary"
      size="sm"
      onClick={modalManager.handleAddNew}
      icon={<FaPlus size={16} />}
      className="!p-2"
      title="Adicionar nova meta"
      aria-label="Adicionar nova meta"
    />
  ) : null;

  const footer = !modalManager.showForm && !loading ? (
    <div className={`sm:hidden p-4 border-t ${colors.border.primary} ${colors.bg.secondary} flex-shrink-0 pb-safe`}>
      <div className={`flex items-center justify-between text-xs ${colors.text.tertiary}`}>
        <span>Toque em uma meta para editar</span>
        <span>{stats.completedGoals} concluída{stats.completedGoals !== 1 ? 's' : ''}</span>
      </div>
    </div>
  ) : null;

  // Função para determinar o status da meta
  const getGoalStatus = (goal: FinancialGoal): GoalStatus => {
    if (goal.currentAmount >= goal.targetAmount) return 'completed';
    if (new Date(goal.deadline) < new Date()) return 'expired';
    if ((goal.currentAmount / goal.targetAmount) > 0.7) return 'urgent';
    return 'active';
  };

  // Preparar dados das metas com informações calculadas
  const goalsWithCalculations = goals.map(goal => ({
    ...goal,
    progress: goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0,
    daysRemaining: Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    status: getGoalStatus(goal)
  }));

  return (
    <ModalBase
      isOpen={modal.isOpen}
      onClose={modal.close}
      title={getTitle()}
      subtitle={!modalManager.showForm ? getSubtitle() : undefined}
      showForm={modalManager.showForm}
      onBackToList={modalManager.handleBackToList}
      headerActions={headerActions}
      footer={footer}
      size="xl"
    >
      {/* Mensagens de erro/sucesso */}
      {(modalManager.error || modalManager.success) && (
        <ModalMessage
          type={modalManager.error ? 'error' : 'success'}
          message={modalManager.error || modalManager.success!}
          onClose={modalManager.clearMessages}
        />
      )}

      {/* Conteúdo Principal */}
      {modalManager.showForm ? (
        <GoalFormModal
          isOpen={modalManager.showForm}
          onClose={modalManager.handleBackToList}
          onSave={handleSaveGoal}
          editingGoal={modalManager.currentItem}
          loading={loading}
        />
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Lista de Metas */}
          <div className="flex-1 overflow-y-auto">
            <GoalsList
              goals={goalsWithCalculations}
              loading={loading}
              onAddGoal={modalManager.handleAddNew}
              onEditGoal={modalManager.handleEdit}
              onDeleteGoal={handleDeleteGoal}
              onAddAmount={(goalId) => {
                const goal = goals.find(g => g.id === goalId);
                if (goal) {
                  handleOpenAddAmount(goal);
                }
              }}
              stats={stats}
            />
          </div>
        </div>
      )}

      {/* Modal para adicionar valor */}
      {selectedGoalForAmount && (
        <AddAmountModal
          isOpen={addAmountModalOpen}
          onClose={handleCloseAddAmount}
          onAddAmount={handleAddAmount}
          goal={selectedGoalForAmount}
          loading={loading}
        />
      )}
    </ModalBase>
  );
}
