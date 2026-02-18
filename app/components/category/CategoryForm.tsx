'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaSave,
  FaTimes,
  FaInfoCircle,
  FaArrowUp,
  FaArrowDown,
  FaExclamationTriangle,
  FaEye,
} from 'react-icons/fa';

import { categoryService } from '@/app/services';
import { useAuth } from '@/app/context';
import { CategoryModel, CategoryType } from '@/app/types/category';

import { 
  Input, 
  Select, 
  ColorIconSelector, 
  ActiveToggle,
  Alert,
  Button,
  IconRenderer
} from '@/app/components';

import { useFormManager } from '@/app/hook';

interface CategoryFormProps {
  category?: CategoryModel | null;
  isEditing: boolean;
  onSubmitSuccess: (message: string) => void;
  onCancel: () => void;
  submitting?: boolean;
}

// Opções para o select de tipo de categoria com descrições
const categoryTypeOptions = [
  { 
    value: 'EXPENSE', 
    label: 'Despesa', 
    icon: <FaArrowDown />,
    description: 'Para gastos, compras e pagamentos',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10'
  },
  { 
    value: 'INCOME', 
    label: 'Receita', 
    icon: <FaArrowUp />,
    description: 'Para ganhos, salários e rendimentos',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10'
  },
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
  submitting: externalSubmitting = false,
}: CategoryFormProps) {
  const { user } = useAuth();
  const [showPreview, setShowPreview] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const formManager = useFormManager({
    initialData: initialFormData,
    editingItem: category,
    isEditing,
    onSubmit: async (data) => {
      setSubmitError(null);
      try {
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
      } catch (err: any) {
        setSubmitError(err.message || 'Erro ao salvar categoria');
        throw err;
      }
    },
    onSuccess: (message) => {
      onSubmitSuccess(message || (isEditing ? 'Categoria atualizada com sucesso!' : 'Categoria criada com sucesso!'));
    },
    userId: user?.id
  });

  const inputError = (formManager.error && formManager.error.split(';')) || [];

  const isFormValid = () => {
    return formManager.formData.name.trim().length > 0;
  };

  const currentType = categoryTypeOptions.find(t => t.value === formManager.formData.type);

  return (
    <form onSubmit={formManager.handleSubmit} className="space-y-10">
      {/* Error Alert */}
      <AnimatePresence>
        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Alert
              variant="error"
              message={submitError}
              onClose={() => setSubmitError(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seção 1: Informações Básicas */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-purple-500 rounded-full" />
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Informações Básicas
          </h3>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Input
            label="Nome da Categoria"
            value={formManager.formData.name}
            onChange={(e) => formManager.setFormData({ name: e.target.value })}
            placeholder="Ex: Alimentação, Transporte, Salário"
            disabled={externalSubmitting}
            required
            error={inputError.filter(a => a.toLowerCase().includes('nome')).join('; ') || ''}
            icon={<FaInfoCircle />}
          />
          
          <Select
            label="Tipo de Categoria"
            value={formManager.formData.type}
            onChange={(value) => formManager.setFormData({ type: value as CategoryType })}
            options={categoryTypeOptions}
            placeholder="Selecione o tipo"
            required
            disabled={externalSubmitting}
            error={inputError.filter(a => a.toLowerCase().includes('tipo')).join('; ') || ''}
          />
        </div>
      </div>

      {/* Seção 2: Personalização */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-indigo-500 rounded-full" />
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Personalização
          </h3>
        </div>

        <ColorIconSelector
          color={formManager.formData.color}
          icon={formManager.formData.icon}
          onColorChange={(color) => formManager.setFormData({ color })}
          onIconChange={(icon) => formManager.setFormData({ icon })}
          disabled={externalSubmitting}
          colorLabel="Cor da categoria"
        />

        <Input
          label="Descrição (Opcional)"
          value={formManager.formData.description}
          onChange={(e) => formManager.setFormData({ description: e.target.value })}
          placeholder="Descreva o propósito desta categoria..."
          disabled={externalSubmitting}
          multiline
          rows={3}
          error={inputError.filter(a => a.toLowerCase().includes('descrição')).join('; ') || ''}
        />
      </div>

      {/* Seção 3: Status */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-pink-500 rounded-full" />
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Status
          </h3>
        </div>

        <ActiveToggle
          isActive={formManager.formData.isActive}
          onToggle={(isActive) => formManager.setFormData({ isActive })}
          disabled={externalSubmitting}
          label="Categoria ativa"
        />
      </div>

      {/* Preview Card */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-6 p-6 rounded-2xl bg-white/5 border border-white/10">
              <h4 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
                <FaEye size={14} />
                Pré-visualização
              </h4>
              
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-white shadow-lg"
                  style={{ backgroundColor: formManager.formData.color }}
                >
                  <IconRenderer iconName={formManager.formData.icon || 'tag'} size={24} />
                </div>
                
                <div className="flex-1">
                  <p className="font-medium text-white text-lg">
                    {formManager.formData.name || 'Nome da Categoria'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-sm flex items-center gap-1 ${currentType?.color}`}>
                      {currentType?.icon}
                      {currentType?.label}
                    </span>
                    
                    {!formManager.formData.isActive && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span className="text-sm text-slate-500">Inativa</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {formManager.formData.description && (
                <div className="mt-4 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                  <p className="text-sm text-slate-400 italic">
                    {formManager.formData.description}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botões de Ação */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 border-t border-white/10">
        <Button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          variant="ghost"
          size="md"
          className="order-2 sm:order-1"
        >
          {showPreview ? 'Ocultar preview' : 'Mostrar preview'}
        </Button>

        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          size="md"
          disabled={externalSubmitting}
          className="order-3 sm:order-2"
          icon={<FaTimes />}
        >
          Cancelar
        </Button>

        <Button
          type="submit"
          disabled={externalSubmitting || !isFormValid()}
          size="lg"
          className={`
            order-1 sm:order-3 font-semibold shadow-lg
            ${formManager.formData.type === 'INCOME'
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
            }
          `}
          icon={<FaSave />}
          loading={externalSubmitting}
        >
          {externalSubmitting 
            ? (isEditing ? 'Salvando...' : 'Criando...') 
            : (isEditing ? 'Salvar Alterações' : 'Criar Categoria')
          }
        </Button>
      </div>

      {/* Validação em tempo real */}
      <AnimatePresence>
        {!isFormValid() && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-red-400 flex items-center gap-2"
          >
            <FaExclamationTriangle size={12} />
            Preencha o nome da categoria para continuar
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  );
}
