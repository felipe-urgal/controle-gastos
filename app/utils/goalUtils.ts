// app/utils/goalUtils.ts
import { GoalType } from '@/app/types/goals';

export const goalTypeConfig = {
  [GoalType.TRAVEL]: {
    label: 'Viagem',
    icon: '✈️',
    defaultColor: '#F59E0B',
    description: 'Economize para suas próximas férias'
  },
  [GoalType.EMERGENCY_FUND]: {
    label: 'Reserva Emergencial',
    icon: '🛡️',
    defaultColor: '#10B981',
    description: 'Crie sua reserva para imprevistos'
  },
  [GoalType.INVESTMENT]: {
    label: 'Investimento',
    icon: '📈',
    defaultColor: '#8B5CF6',
    description: 'Invista para seu futuro'
  },
  [GoalType.EDUCATION]: {
    label: 'Educação',
    icon: '🎓',
    defaultColor: '#3B82F6',
    description: 'Invista em seu conhecimento'
  },
  [GoalType.HOME]: {
    label: 'Casa',
    icon: '🏠',
    defaultColor: '#EF4444',
    description: 'Economize para comprar ou reformar'
  },
  [GoalType.VEHICLE]: {
    label: 'Veículo',
    icon: '🚗',
    defaultColor: '#6B7280',
    description: 'Adquira seu próximo veículo'
  },
  [GoalType.OTHER]: {
    label: 'Outro',
    icon: '🎯',
    defaultColor: '#3B82F6',
    description: 'Meta personalizada'
  }
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount / 100); // Converte de centavos para reais
};

export const formatProgress = (progress: number): string => {
  return `${Math.round(progress)}%`;
};

export const getDaysRemainingText = (days: number): string => {
  if (days < 0) return 'Expirado';
  if (days === 0) return 'Vence hoje';
  if (days === 1) return '1 dia restante';
  if (days < 30) return `${days} dias restantes`;
  
  const months = Math.ceil(days / 30);
  return months === 1 ? '1 mês restante' : `${months} meses restantes`;
};

export const getGoalStatus = (goal: { isCompleted: boolean; daysRemaining?: number }): 'completed' | 'expired' | 'active' | 'urgent' => {
  if (goal.isCompleted) return 'completed';
  if ((goal.daysRemaining || 0) < 0) return 'expired';
  if ((goal.daysRemaining || 0) < 30) return 'urgent';
  return 'active';
};