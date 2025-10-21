// app/hooks/useGoals.ts (CORRIGIDO - igual ao Transaction)
"use client"

import { useState, useEffect, useCallback } from 'react';

import { FinancialGoal, CreateGoalData, UpdateGoalData } from '@/app/types/goals';

import { goalService, GetGoalsParams } from '@/app/services';

import { useAuth } from '@/app/context';

interface UseGoalsReturn {
  goals: FinancialGoal[];
  loading: boolean;
  error: string | null;
  success: string | null;
  createGoal: (data: CreateGoalData) => Promise<FinancialGoal | undefined>;
  updateGoal: (goalId: string, data: UpdateGoalData) => Promise<FinancialGoal | undefined>;
  deleteGoal: (goalId: string) => Promise<void>;
  addToGoal: (goalId: string, amount: number) => Promise<void>;
  refreshGoals: (params?: GetGoalsParams) => Promise<void>;
  stats: {
    totalGoals: number;
    completedGoals: number;
    totalTarget: number;
    totalCurrent: number;
    totalProgress: number;
  };
}


export function useGoals(): UseGoalsReturn {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalGoals: 0,
    completedGoals: 0,
    totalTarget: 0,
    totalCurrent: 0,
    totalProgress: 0
  });
  
  const { user } = useAuth();

  // Função para calcular dados derivados
  const calculateGoalData = (goal: FinancialGoal): FinancialGoal & { 
    progress: number; 
    daysRemaining: number; 
    monthlyContribution: number;
    status: 'completed' | 'expired' | 'active' | 'urgent';
  } => {
    const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
    const daysRemaining = Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    // Calcular contribuição mensal sugerida
    const monthsRemaining = Math.ceil(daysRemaining / 30);
    const monthlyContribution = monthsRemaining > 0 
      ? Math.ceil((goal.targetAmount - goal.currentAmount) / monthsRemaining)
      : goal.targetAmount - goal.currentAmount;

    // Determinar status
    let status: 'completed' | 'expired' | 'active' | 'urgent' = 'active';
    if (goal.isCompleted) status = 'completed';
    else if (daysRemaining < 0) status = 'expired';
    else if (daysRemaining < 30) status = 'urgent';

    return {
      ...goal,
      progress,
      daysRemaining,
      monthlyContribution,
      status
    };
  };

  // Carregar metas
  const loadGoals = useCallback(async (params: GetGoalsParams = {}) => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const result = await goalService.getGoals(user.id, params);
      
      if (result.success) {
        const goalsWithCalculations = result.data.items.map(calculateGoalData);
        setGoals(goalsWithCalculations);
        setStats(result.data.additionalData);
      } else {
        setError(result.message || 'Erro ao carregar metas');
      }
    } catch (err) {
      console.error('Erro ao carregar metas:', err);
      setError('Erro ao carregar metas');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Criar meta - CORRIGIDO igual ao Transaction
  const createGoal = useCallback(async (data: CreateGoalData) => {
    if (!user?.id) return;

    setError(null);
    setSuccess(null);

    try {
      const result = await goalService.createGoal({ ...data, userId: user.id });
      
      if (result.success) {
        await loadGoals();
        setSuccess(result.message || 'Meta criada com sucesso!');
        setError(null);
        return result
      } else {
        setError(result.message || 'Erro ao criar meta');
        setSuccess(null);
        return result
      }
    } catch (error: any) {
      console.error('Erro ao criar meta:', error);
      setError(error?.message || 'Erro ao criar meta');
      setSuccess(null);
    }
  }, [user?.id, loadGoals]);

  // Atualizar meta - CORRIGIDO igual ao Transaction
  const updateGoal = useCallback(async (goalId: string, data: UpdateGoalData) => {
    setError(null);
    setSuccess(null);

    try {
      const result = await goalService.updateGoal({ id: goalId, ...data });
      
      if (result.success) {
        await loadGoals();
        setSuccess(result.message || 'Meta atualizada com sucesso!');
        setError(null);
        return result
      } else {
        setError(result.message || 'Erro ao atualizar meta');
        setSuccess(null);
        return result
      }
    } catch (error: any) {
      console.error('Erro ao atualizar meta:', error);
      setError(error?.message || 'Erro ao atualizar meta');
      setSuccess(null);
    }
  }, [loadGoals]);

  // Excluir meta - CORRIGIDO igual ao Transaction
  const deleteGoal = useCallback(async (goalId: string) => {
    setError(null);
    setSuccess(null);

    try {
      const result = await goalService.deleteGoal(goalId);
      
      if (result.success) {
        await loadGoals();
        setSuccess(result.message || 'Meta excluída com sucesso!');
        setError(null);
      } else {
        setError(result.message || 'Erro ao excluir meta');
        setSuccess(null);
      }
    } catch (error: any) {
      console.error('Erro ao excluir meta:', error);
      setError(error?.message || 'Erro ao excluir meta');
      setSuccess(null);
    }
  }, [loadGoals]);

  // Adicionar valor à meta - CORRIGIDO igual ao Transaction
  const addToGoal = useCallback(async (goalId: string, amount: number) => {
    if (!user?.id) return;
    
    setError(null);
    setSuccess(null);

    try {
      const result = await goalService.addToGoal(goalId, amount, user.id);
      
      if (result.success) {
        await loadGoals();
        setSuccess(result.message || 'Valor adicionado com sucesso!');
        setError(null);
      } else {
        setError(result.message || 'Erro ao adicionar valor à meta');
        setSuccess(null);
      }
    } catch (error: any) {
      console.error('Erro ao adicionar valor à meta:', error);
      setError(error?.message || 'Erro ao adicionar valor à meta');
      setSuccess(null);
    }
  }, [user?.id, loadGoals]);

  // Efeito para carregar metas quando o usuário mudar
  useEffect(() => {
    if (user?.id) {
      loadGoals();
    }
  }, [user?.id, loadGoals]);

  return {
    goals,
    loading,
    error,
    success,
    createGoal,
    updateGoal,
    deleteGoal,
    addToGoal,
    refreshGoals: loadGoals,
    stats
  };
}
