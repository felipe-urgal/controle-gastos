// app/components/categories/CategoryForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { categoryService } from '@/app/services/categoryService';
import { useAuth } from '@/app/context/AuthContext';
import { CategoryModel, CategoryType } from '@/app/types/category';
import { Button, Input, Select, IconSelector } from '@/app/components';
import { useThemeColors } from '@/app/hook/useThemeColors';
import IconRenderer, { useIcons } from '@/app/components/ui/IconRenderer';

interface CategoryFormProps {
  category?: CategoryModel | null;
  isEditing: boolean;
  onSubmitSuccess: (message: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
  submitting: boolean;
  setSubmitting: (submitting: boolean) => void;
}

// Opções para o select de tipo de categoria
const categoryTypeOptions = [
  { value: 'EXPENSE', label: 'Despesa' },
  { value: 'INCOME', label: 'Receita' },
];

const initialFormData = {
  name: '',
  type: 'EXPENSE' as CategoryType,
  color: '#3B82F6',
  icon: 'tag',
  description: '',
  isActive: true,
  position: 0,
  userId: ''
};

export default function CategoryForm({
  category,
  isEditing,
  onSubmitSuccess,
  onError,
  onCancel,
  submitting,
  setSubmitting
}: CategoryFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    if (category && isEditing) {
      setFormData({
        name: category.name,
        type: category.type,
        color: category.color || '#3B82F6',
        icon: category.icon || 'tag',
        description: category.description || '',
        isActive: category.isActive,
        position: category.position || 0,
        userId: category.userId
      });
    } else {
      setFormData({
        ...initialFormData,
        userId: user?.id || ''
      });
    }
  }, [category, isEditing, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSubmitting(true);
    onError('');

    try {
      const categoryData = {
        name: formData.name,
        type: formData.type,
        color: formData.color,
        icon: formData.icon,
        description: formData.description || null,
        isActive: formData.isActive,
        position: formData.position,
        userId: user.id
      };

      if (isEditing && category) {
        await categoryService.updateCategory({
          ...category,
          ...categoryData
        });
        onSubmitSuccess('Categoria atualizada com sucesso!');
      } else {
        await categoryService.createCategory(categoryData);
        onSubmitSuccess('Categoria criada com sucesso!');
      }
    } catch (err: any) {
      onError(err?.message || 'Erro ao salvar categoria');
      console.error('Erro ao salvar categoria:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const { getIconLabel } = useIcons();

  const colors = useThemeColors();

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
      <div className="p-3 sm:p-4 lg:p-6 flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 xl:grid-cols-1 gap-4 sm:gap-6">
          {/* Coluna do formulário */}
          <div className="space-y-3 sm:space-y-4">
            <Input
              label="Nome da Categoria"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Alimentação, Transporte, Salário, etc."
              required
              disabled={submitting}
              variant="outlined"
              size="sm"
            />
            
            <Select
              label="Tipo de Categoria"
              name="type"
              value={formData.type}
              onChange={(value) => setFormData({ ...formData, type: value as CategoryType })}
              options={categoryTypeOptions}
              placeholder="Selecione o tipo"
              required
              disabled={submitting}
              size="sm"
            />

            {/* Seletor de Cores - Mobile Optimized */}
            <div>
              <div className="flex gap-1.5 sm:gap-2 flex-wrap items-center justify-start sm:justify-start">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                  Cor
                </label>

                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  disabled={submitting}
                  className="w-20 h-8 rounded cursor-pointer border border-gray-300"
                  title="Escolher cor manualmente"
                />

                <div className={`
                  ${colors.border.accent} border rounded-full px-3 py-1
                  flex items-center gap-3 transition-all
                `}>
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white shadow-sm flex-shrink-0"
                    style={{ backgroundColor: formData.color || '#3B82F6' }}
                  >
                    <IconRenderer 
                      iconName={formData.icon} 
                      className="w-3.5 h-3.5"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs ${colors.text.secondary} capitalize`}>
                      {getIconLabel(formData.icon)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Seletor de Ícones */}
            <div className="mt-4">
              <IconSelector
                value={formData.icon}
                onChange={(icon) => setFormData({ ...formData, icon })}
                disabled={submitting}
                mode='compact'
              />
            </div>

            <Input
              label="Descrição (Opcional)"
              name="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição detalhada da categoria..."
              disabled={submitting}
              variant="outlined"
              size="sm"
            />

            <div className={`flex items-center gap-3 p-3 rounded-lg ${colors.bg.tertiary}`}>
              <label className="flex items-center gap-3 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500 transition-colors"
                  disabled={submitting}
                />
                <span className={`text-sm font-medium ${colors.text.tertiary}`}>
                  Categoria ativa
                </span>
              </label>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                formData.isActive 
                  ? colors.state.active
                  : colors.state.disabled
              }`}>
                {formData.isActive ? 'Ativa' : 'Inativa'}
              </div>
            </div>
          </div>

          {/* Coluna da pré-visualização */}
          {/*<div className="xl:sticky xl:top-0 order-last xl:order-last">
            <div className="mb-4 xl:mb-0">
              <FormPreview formData={formData} compact={true} />
            </div>
            
            <div className="xl:hidden mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="space-y-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  isLoading={submitting}
                  icon={<FaPlus size={14} />}
                  disabled={submitting}
                >
                  {isEditing ? 'Atualizar' : 'Adicionar'} Categoria
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={onCancel}
                  disabled={submitting}
                  fullWidth
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>*/}
        </div>
      </div>

      {/* Ações Desktop - Aparece apenas em desktop */}
      <div className={`p-4 lg:p-6 border-t ${colors.border.primary}  flex-shrink-0`}>
        <div className="flex gap-3 w-full max-w-2xl ml-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="flex-1"
            isLoading={submitting}
            disabled={submitting}
          >
            {isEditing ? 'Atualizar' : 'Adicionar'}
          </Button>
        </div>
      </div>
    </form>
  );
}
