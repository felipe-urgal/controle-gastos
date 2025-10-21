// app/services/goalService.ts (CORRIGIDO)
import { apiClient } from "./apiClient";
import { FinancialGoal, CreateGoalData, UpdateGoalData, GoalResponse } from '@/app/types/goals'

export interface GetGoalsParams {
  search?: string;
  type?: string;
  isCompleted?: boolean;
  page?: number;
  limit?: number;
}

export const goalService = {
  async getGoals(
    userId: string,
    params: GetGoalsParams = {}
  ): Promise<GoalResponse> {
    const { search, type, isCompleted, page = 1, limit = 10 } = params;
    
    // CORREÇÃO: Criar objeto de query params filtrando valores undefined
    const queryParams: Record<string, string> = {
      userId, 
      page: page.toString(),
      limit: limit.toString()
    };

    // Adicionar apenas os parâmetros que existem
    if (search) queryParams.search = search;
    if (type) queryParams.type = type;
    if (isCompleted !== undefined) queryParams.isCompleted = isCompleted.toString();

    return apiClient<GoalResponse>(`/api/goals`, {
      method: "GET",
      queryParams,
    });
  },

  async createGoal(data: CreateGoalData & { userId: string }): Promise<FinancialGoal> {
    return apiClient<FinancialGoal, CreateGoalData & { userId: string }>(`/api/goals`, {
      method: "POST",
      body: data,
    });
  },

  async updateGoal(data: UpdateGoalData & { id: string }): Promise<FinancialGoal> {
    return apiClient<FinancialGoal, UpdateGoalData & { id: string }>(`/api/goals`, {
      method: "PUT",
      body: data,
    });
  },

  async deleteGoal(id: string): Promise<{ success: boolean, message: string }> {
    return apiClient<{ success: boolean, message: string }, { id: string }>(`/api/goals`, {
      method: "DELETE",
      body: { id },
    });
  },

  async addToGoal(goalId: string, amount: number, userId: string): Promise<FinancialGoal> {
    // CORREÇÃO: Passar o userId para buscar a meta específica
    const goalsResponse = await this.getGoals(userId);
    
    if (!goalsResponse.success) {
      throw new Error('Erro ao buscar meta');
    }

    const goal = goalsResponse.data.items.find(g => g.id === goalId);
    if (!goal) {
      throw new Error('Meta não encontrada');
    }

    const newAmount = goal.currentAmount + amount;
    const isCompleted = newAmount >= goal.targetAmount;

    return this.updateGoal({
      id: goalId,
      currentAmount: newAmount,
      isCompleted
    });
  }
};