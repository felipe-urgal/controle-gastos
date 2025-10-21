"use client";

import { useState, useEffect } from 'react';
import { FinancialGoal, CreateGoalData, UpdateGoalData, GoalType } from '@/app/types/goals';
import { useThemeColors } from '@/app/hook';
import { goalTypeConfig } from '@/app/utils';
import { Input, Select, Button } from '@/app/components';
import { FaCalendar, FaPalette } from 'react-icons/fa';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateGoalData | UpdateGoalData) => Promise<any>;
  editingGoal?: FinancialGoal | null;
  loading?: boolean;
}


const defaultColors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

const defaultIcons = ['🎯', '💰', '🏠', '🚗', '✈️', '🎓', '🛡️', '📈', '🏖️', '🎁'];

export default function GoalFormModal({ isOpen, onClose, onSave, editingGoal, loading = false }: GoalModalProps) {
  const colors = useThemeColors();
  const [formData, setFormData] = useState({
    title: '',
    targetAmount: 'R$ 0,00',
    deadline: '',
    type: GoalType.OTHER,
    color: '#3B82F6',
    icon: '🎯',
    description: ''
  });

  const [error, setError] = useState<string | null>(null);

  // Converter valor para centavos
  const formatCurrencyToCents = (value: string): number => {
    if (!value || value === 'R$ 0,00') return 0;
    
    try {
      const cleaned = value
        .replace('R$', '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim();
      
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : Math.round(parsed * 100);
    } catch {
      return 0;
    }
  };

  // Formatar valor para exibição
  const formatCentsToCurrency = (cents: number): string => {
    const amountInReais = cents / 100;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amountInReais);
  };

  // Handler para campo de valor monetário
  const handleAmountChange = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    
    if (!numericValue) {
      setFormData(prev => ({ ...prev, targetAmount: 'R$ 0,00' }));
      return;
    }

    const cents = parseInt(numericValue);
    const amountInReais = cents / 100;
    
    const formattedValue = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amountInReais);

    setFormData(prev => ({ ...prev, targetAmount: formattedValue }));
  };

  useEffect(() => {
    if (editingGoal && isOpen) {
      const amountFormatted = formatCentsToCurrency(editingGoal.targetAmount);
      setFormData({
        title: editingGoal.title,
        targetAmount: amountFormatted,
        deadline: new Date(editingGoal.deadline).toISOString().split('T')[0],
        type: editingGoal.type,
        color: editingGoal.color,
        icon: editingGoal.icon,
        description: editingGoal.description || ''
      });
    } else if (isOpen) {
      // Reset form for new goal
      setFormData({
        title: '',
        targetAmount: 'R$ 0,00',
        deadline: '',
        type: GoalType.OTHER,
        color: '#3B82F6',
        icon: '🎯',
        description: ''
      });
    }
  }, [editingGoal, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const amountInCents = formatCurrencyToCents(formData.targetAmount);
      
      const saveData = {
        title: formData.title.trim(),
        targetAmount: amountInCents,
        deadline: new Date(formData.deadline),
        type: formData.type,
        color: formData.color,
        icon: formData.icon,
        description: formData.description.trim() || undefined
      };

      const result = await onSave(saveData);

      if (result.success) {
        onClose();
      } else {
        setError(result.message ?? null);
      }
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      setError('Erro ao salvar meta');
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const inputErrors = (error && error.split(';')) || [];

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 ${colors.bg.overlay} flex items-center justify-center z-50 p-4 animate-fade-in`}>
      <div 
        className={`
          ${colors.bg.modal} rounded-2xl shadow-xl w-full max-w-md 
          max-h-[90vh] overflow-hidden flex flex-col animate-slide-up
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex-shrink-0 flex items-center justify-between p-6 border-b ${colors.border.primary}`}>
          <h2 className={`text-xl font-bold ${colors.text.primary}`}>
            {editingGoal ? 'Editar Meta' : 'Nova Meta'}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={loading}
            className="p-2"
          >
            ×
          </Button>
        </div>

        {/* Form com Scroll */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Título */}
            <div data-field="title">
              <Input
                type="text"
                label="Título da Meta"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Viagem para Europa"
                variant="outlined"
                size="sm"
                required
                disabled={loading}
                loading={loading}
                error={inputErrors.filter(a => a.toLowerCase().includes('título')).join('; ') || ''}
              />
            </div>

            {/* Valor da Meta */}
            <div data-field="targetAmount">
              <Input
                type="text"
                label="Valor da Meta"
                value={formData.targetAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="R$ 0,00"
                variant="outlined"
                size="sm"
                required
                disabled={loading}
                loading={loading}
                error={inputErrors.filter(a => a.toLowerCase().includes('valor')).join('; ') || ''}
              />
            </div>

            {/* Data Limite */}
            <div data-field="deadline">
              <Input
                type="date"
                label="Data Limite"
                value={formData.deadline}
                onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                variant="outlined"
                size="sm"
                required
                disabled={loading}
                loading={loading}
                icon={<FaCalendar />}
                error={inputErrors.filter(a => a.toLowerCase().includes('data')).join('; ') || ''}
              />
            </div>

            {/* Tipo de Meta */}
            <div data-field="type">
              <Select
                value={formData.type}
                onChange={(value) => setFormData(prev => ({ ...prev, type: value as GoalType }))}
                label="Tipo de Meta"
                options={Object.values(GoalType).map((type) => ({
                  value: type,
                  label: goalTypeConfig[type].label
                }))}
                placeholder="Selecione o tipo"
                variant="outlined"
                size="sm"
                required
                disabled={loading}
                loading={loading}
                error={inputErrors.filter(a => a.toLowerCase().includes('tipo')).join('; ') || ''}
              />
            </div>

            {/* Seletor de Cor */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${colors.text.primary}`}>
                <FaPalette className="inline mr-2" />
                Cor
              </label>
              <div className="grid grid-cols-5 gap-2">
                {defaultColors.map((color) => (
                  <Button
                    key={color}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={`
                      w-8 h-8 rounded-full border-2 transition-all p-0 min-w-0
                      ${formData.color === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'}
                    `}
                    style={{ backgroundColor: color }}
                    disabled={loading}
                  />
                ))}
              </div>
            </div>

            {/* Seletor de Ícone */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${colors.text.primary}`}>
                Ícone
              </label>
              <div className="grid grid-cols-5 gap-2">
                {defaultIcons.map((icon) => (
                  <Button
                    key={icon}
                    type="button"
                    variant={formData.icon === icon ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, icon }))}
                    className={`
                      w-8 h-8 rounded-lg text-lg transition-all p-0 min-w-0
                      ${formData.icon === icon ? 'scale-110' : ''}
                    `}
                    disabled={loading}
                  >
                    {icon}
                  </Button>
                ))}
              </div>
            </div>

            {/* Descrição */}
            <div data-field="description">
              <Input
                type="textarea"
                label="Descrição (opcional)"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva sua meta..."
                variant="outlined"
                size="sm"
                disabled={loading}
                loading={loading}
                rows={3}
                error={inputErrors.filter(a => a.toLowerCase().includes('descrição')).join('; ') || ''}
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className={`flex-shrink-0 flex gap-3 p-6 border-t ${colors.border.primary}`}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={loading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={loading}
            isLoading={loading}
            className="flex-1"
          >
            {editingGoal ? 'Atualizar' : 'Criar Meta'}
          </Button>
        </div>
      </div>
    </div>
  );
}