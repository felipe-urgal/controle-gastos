"use client";

import { useState, useEffect } from 'react';

import { FinancialGoal, CreateGoalData, UpdateGoalData, GoalType } from '@/app/types/goals';

import { goalTypeConfig } from '@/app/utils';

import { Input, Select, BaseForm, ColorIconSelector } from '@/app/components';

import { FaCalendar } from 'react-icons/fa';

interface GoalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateGoalData | UpdateGoalData) => Promise<any>;
  editingGoal?: FinancialGoal | null;
  loading?: boolean;
}

export default function GoalFormModal({ isOpen, onClose, onSave, editingGoal, loading = false }: GoalFormModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    targetAmount: 'R$ 0,00',
    deadline: '',
    type: GoalType.OTHER,
    color: '#3B82F6',
    icon: 'wallet',
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
        icon: 'wallet',
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
    <BaseForm
      submitting={loading}
      onSubmit={handleSubmit}
      onCancel={handleClose}
      isEditing={!!editingGoal}
    >
      <div className="space-y-4">
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

        <ColorIconSelector
          color={formData.color}
          icon={formData.icon}
          onColorChange={(color) => setFormData(prev => ({ ...prev, color }))}
          onIconChange={(icon) => setFormData(prev => ({ ...prev, icon }))}
          disabled={loading}
          colorLabel="Cor da meta"
        />

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
      </div>
    </BaseForm>
  );
}