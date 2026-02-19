'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaSave,
  FaTimes,
  FaInfoCircle,
  FaArrowUp,
  FaArrowDown,
  FaSpinner
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // ← Estado interno de loading

  const formManager = useFormManager({
    initialData: initialFormData,
    editingItem: category,
    isEditing,
    onSubmit: async (data) => {
      setSubmitError(null);
      setIsSubmitting(true); // ← Ativa loading
      
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
      } finally {
        setIsSubmitting(false); // ← Desativa loading sempre
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

  // Determina se está em loading
  const loading = isSubmitting || externalSubmitting;

  return (
    <form onSubmit={formManager.handleSubmit} className="relative">
      {/* Overlay de loading para toda a tela */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm rounded-2xl z-50 flex items-center justify-center"
          >
            <div className="text-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-purple-500/30 rounded-full" />
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-white mt-4 font-medium">
                {isEditing ? 'Atualizando categoria...' : 'Criando categoria...'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Alert */}
      <AnimatePresence>
        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
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
            disabled={loading} // ← Desabilitado durante loading
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
            disabled={loading} // ← Desabilitado durante loading
            error={inputError.filter(a => a.toLowerCase().includes('tipo')).join('; ') || ''}
          />
        </div>
      </div>

      {/* Seção 2: Personalização */}
      <div className="space-y-6 mt-4">
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
          disabled={loading} // ← Desabilitado durante loading
          colorLabel="Cor da categoria"
        />

        <Input
          label="Descrição (Opcional)"
          value={formManager.formData.description}
          onChange={(e) => formManager.setFormData({ description: e.target.value })}
          placeholder="Descreva o propósito desta categoria..."
          disabled={loading} // ← Desabilitado durante loading
          multiline
          rows={3}
          error={inputError.filter(a => a.toLowerCase().includes('descrição')).join('; ') || ''}
        />
      </div>

      {/* Seção 3: Status */}
      <div className="space-y-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-pink-500 rounded-full" />
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Status
          </h3>
        </div>

        <ActiveToggle
          isActive={formManager.formData.isActive}
          onToggle={(isActive) => formManager.setFormData({ isActive })}
          disabled={loading} // ← Desabilitado durante loading
          label="Categoria ativa"
        />
      </div>

      {/* Botões de Ação */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 border-t border-white/10">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          size="md"
          disabled={loading} // ← Desabilitado durante loading
          icon={<FaTimes />}
        >
          Cancelar
        </Button>

        <Button
          type="submit"
          disabled={loading || !isFormValid()} // ← Desabilitado durante loading ou se inválido
          size="lg"
          className={`
            font-semibold shadow-lg
            ${formManager.formData.type === 'INCOME'
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
            }
          `}
          icon={loading ? <FaSpinner className="animate-spin" /> : <FaSave />}
          isLoading={loading}
        >
          {loading 
            ? (isEditing ? 'Salvando...' : 'Criando...') 
            : (isEditing ? 'Salvar Alterações' : 'Criar Categoria')
          }
        </Button>
      </div>
    </form>
  );
}
