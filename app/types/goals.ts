// app/types/goals.ts
export interface FinancialGoal {
  id: string;
  title: string;
  targetAmount: number; // Em centavos
  currentAmount: number; // Em centavos
  deadline: Date;
  type: GoalType;
  color: string;
  icon: string;
  isCompleted: boolean;
  description?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  success: boolean;
  message: string;
}

export enum GoalType {
  TRAVEL = 'TRAVEL',
  EMERGENCY_FUND = 'EMERGENCY_FUND',
  INVESTMENT = 'INVESTMENT',
  EDUCATION = 'EDUCATION',
  HOME = 'HOME',
  VEHICLE = 'VEHICLE',
  OTHER = 'OTHER'
}

export interface CreateGoalData {
  title: string;
  targetAmount: number;
  deadline: Date;
  type: GoalType;
  color?: string;
  icon?: string;
  description?: string;
}

export interface UpdateGoalData {
  title?: string;
  targetAmount?: number;
  currentAmount?: number;
  deadline?: Date;
  type?: GoalType;
  color?: string;
  icon?: string;
  description?: string;
  isCompleted?: boolean;
}

export interface GoalResponse {
  success: boolean;
  data: {
    items: FinancialGoal[];
    total: number;
    additionalData: {
      totalGoals: number;
      completedGoals: number;
      totalTarget: number;
      totalCurrent: number;
      totalProgress: number;
    };
  };
  message: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}
