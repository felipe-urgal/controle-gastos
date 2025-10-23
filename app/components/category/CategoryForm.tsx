// app/components/categories/CategoryForm.tsx
'use client';

import { categoryService } from '@/app/services';

import { useAuth } from '@/app/context';

import { CategoryModel, CategoryType } from '@/app/types/category';

import { Input, Select, BaseForm, ColorIconSelector, ActiveToggle } from '@/app/components';

import { useFormManager } from '@/app/hook';

interface CategoryFormProps {
  category?: CategoryModel | null;
  isEditing: boolean;
  onSubmitSuccess: (message: string) => void;
  onCancel: () => void;
  submitting: boolean;
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
  onCancel,
  submitting,
}: CategoryFormProps) {
  const { user } = useAuth();

  const formManager = useFormManager({
    initialData: initialFormData,
    editingItem: category,
    isEditing,
    onSubmit: async (data) => {
      const categoryData = {
        name: data.name,
        type: data.type,
        color: data.color,
        icon: data.icon,
        description: data.description || null,
        isActive: data.isActive,
        position: data.position,
        userId: user!.id
      };

      if (isEditing && category) {
        return await categoryService.updateCategory({
          ...category,
          ...categoryData
        });
      } else {
        return await categoryService.createCategory(categoryData);
      }
    },
    onSuccess: onSubmitSuccess,
    userId: user?.id
  });

  const inputError = (formManager.error && formManager.error.split(';')) || [];

  return (
    <BaseForm
      submitting={submitting}
      // error={formManager.error}
      onSubmit={formManager.handleSubmit}
      onCancel={onCancel}
      isEditing={isEditing}
    >
      <div className="grid grid-cols-1 xl:grid-cols-1 gap-4 sm:gap-6">
        <div className="space-y-3 sm:space-y-4">
          <Input
            label="Nome da Categoria"
            name="name"
            value={formManager.formData.name}
            onChange={(e) => formManager.setFormData({ name: e.target.value })}
            placeholder="Ex: Alimentação, Transporte, Salário, etc."
            required
            disabled={submitting}
            variant="outlined"
            size="sm"
            error={inputError.filter(a => a.toLowerCase().includes('nome')).join('; ') || ''}
          />
          
          <Select
            label="Tipo de Categoria"
            name="type"
            value={formManager.formData.type}
            onChange={(value) => formManager.setFormData({ type: value as CategoryType })}
            options={categoryTypeOptions}
            placeholder="Selecione o tipo"
            required
            disabled={submitting}
            size="sm"
            error={inputError.filter(a => a.toLowerCase().includes('tipo')).join('; ') || ''}
          />

          <ColorIconSelector
            color={formManager.formData.color}
            icon={formManager.formData.icon}
            onColorChange={(color) => formManager.setFormData({ color })}
            onIconChange={(icon) => formManager.setFormData({ icon })}
            disabled={submitting}
            colorLabel="Cor da categoria"
          />

          <Input
            label="Descrição (Opcional)"
            name="description"
            value={formManager.formData.description}
            onChange={(e) => formManager.setFormData({ description: e.target.value })}
            placeholder="Descrição detalhada da categoria..."
            disabled={submitting}
            variant="outlined"
            size="sm"
            error={inputError.filter(a => a.toLowerCase().includes('descrição')).join('; ') || ''}
          />

          <ActiveToggle
            isActive={formManager.formData.isActive}
            onToggle={(isActive) => formManager.setFormData({ isActive })}
            disabled={submitting}
            label="Categoria ativa"
            activeLabel="Ativa"
            inactiveLabel="Inativa"
          />
        </div>
      </div>
    </BaseForm>
  );
}
