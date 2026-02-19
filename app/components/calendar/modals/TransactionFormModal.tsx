// app/components/calendar/modals/TransactionFormModal.tsx
'use client';

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Input, 
  Select, 
  Button, 
  Alert 
} from "@/app/components";
import { 
  FaArrowUp, 
  FaArrowDown, 
  FaWallet,
  FaCalendarAlt,
} from "react-icons/fa";

interface TransactionFormModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  editingTransaction?: any;
  categories?: any[];
  accounts?: any[];
  onSubmit?: (data: any) => void;
  selectedDate?: Date | null;
  actionLoading?: {
    creating: boolean;
    updating: boolean;
    deleting: boolean;
  };
  errors?: string[];
}

export default function TransactionFormModal({
  isOpen = false,
  onClose,
  editingTransaction,
  categories = [],
  accounts = [],
  onSubmit,
  selectedDate,
  actionLoading = { creating: false, updating: false, deleting: false },
  errors = [],
}: TransactionFormModalProps) {
  const [formData, setFormData] = useState({
    amount: 'R$ 0,00',
    description: '',
    categoryId: '',
    accountId: '',
    status: 'PENDING',
  });

  const [repeatMonths, setRepeatMonths] = useState<number>(1);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const isFormLoading = actionLoading.creating || actionLoading.updating;

  // Atualizar formulário quando editar
  useEffect(() => {
    if (editingTransaction) {
      const amountFormatted = formatCentsToCurrency(Number(editingTransaction.amount) || 0);
      setFormData({
        amount: amountFormatted,
        description: editingTransaction.description || '',
        categoryId: editingTransaction.categoryId || '',
        accountId: editingTransaction.accountId || '',
        status: editingTransaction.status || 'PENDING',
      });
      setRepeatMonths(1);
    } else {
      setFormData({
        amount: 'R$ 0,00',
        description: '',
        categoryId: '',
        accountId: '',
        status: 'PENDING',
      });
      setRepeatMonths(1);
    }
    setFormErrors([]);
  }, [editingTransaction, isOpen]);

  // Sincronizar erros externos
  useEffect(() => {
    if (errors && errors.length > 0) {
      setFormErrors(errors);
    }
  }, [errors]);

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

  const formatCentsToCurrency = (cents: number): string => {
    const amountInReais = cents / 100;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amountInReais);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    const numericValue = value.replace(/\D/g, "");
    
    if (!numericValue) {
      setFormData(prev => ({ ...prev, amount: 'R$ 0,00' }));
      return;
    }

    const cents = parseInt(numericValue);
    const amountInReais = cents / 100;
    
    const formattedValue = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amountInReais);

    setFormData(prev => ({ ...prev, amount: formattedValue }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const category = categories.find(c => c.id === formData.categoryId);
    const transactionType = category?.type === 'INCOME' ? 'INCOME' : 'EXPENSE';
    const amountInCents = formatCurrencyToCents(formData.amount);
    
    const submitData = {
      amount: amountInCents,
      description: formData.description?.trim() || '',
      categoryId: formData.categoryId || '',
      accountId: formData.accountId || '',
      status: formData.status || 'PENDING',
      type: transactionType,
      repeatMonths: editingTransaction ? 1 : repeatMonths,
      ...(selectedDate && { 
        day: selectedDate.getDate(),
        month: selectedDate.getMonth() + 1,
        year: selectedDate.getFullYear()
      })
    };
    
    onSubmit?.(submitData);
  };

  const getFieldError = (field: string) => {
    if (!formErrors.length) return "";

    const map: Record<string, string[]> = {
      amount: ["valor"],
      description: ["descrição"],
      categoryId: ["categoria"],
      accountId: ["conta"],
      status: ["status"],
    };

    const keywords = map[field] || [];

    const found = formErrors.find(err =>
      keywords.some(keyword =>
        err.toLowerCase().includes(keyword)
      )
    );

    return found || "";
  };

  // Preparar opções de categoria com ícones embutidos
  const categoryOptions = [
    {
      label: 'Receitas',
      options: categories
        .filter(c => c.type === 'INCOME')
        .map(c => ({
          value: c.id,
          label: c.name,
          icon: <FaArrowUp className="text-green-400" /> // Ícone já incluso
        }))
    },
    {
      label: 'Despesas', 
      options: categories
        .filter(c => c.type === 'EXPENSE')
        .map(c => ({
          value: c.id,
          label: c.name,
          icon: <FaArrowDown className="text-red-400" /> // Ícone já incluso
        }))
    }
  ];

  // Opções de conta com ícones
  const accountOptions = accounts.map(account => ({
    value: account.id,
    label: account.name,
    icon: <FaWallet style={{ color: account.color }} /> // Ícone já incluso
  }));

  const statusOptions = [
    { value: 'PENDING', label: 'Pendente', icon: '⏳' },
    { value: 'COMPLETED', label: 'Concluído', icon: '✓' },
    { value: 'CANCELLED', label: 'Cancelado', icon: '✗' }
  ];

  const selectedCategory = categories.find(c => c.id === formData.categoryId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 relative">
      {/* Error Alert */}
      <AnimatePresence>
        {formErrors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Alert
              variant="error"
              message="Corrija os erros abaixo para continuar"
              onClose={() => setFormErrors([])}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seção 1: Valor e Descrição */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-purple-500 rounded-full" />
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Informações da Transação
          </h3>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Valor"
            value={formData.amount}
            onChange={handleAmountChange}
            placeholder="R$ 0,00"
            required
            disabled={isFormLoading}
            error={getFieldError("amount")}
            icon="💰"
          />

          <Input
            label="Descrição"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Ex: Almoço, Salário, etc."
            required
            disabled={isFormLoading}
            error={getFieldError("description")}
            icon="📝"
          />
        </div>
      </div>

      {/* Seção 2: Categoria e Conta */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-indigo-500 rounded-full" />
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Classificação
          </h3>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            value={formData.categoryId}
            onChange={(value) => setFormData(prev => ({ ...prev, categoryId: value.toString() }))}
            label="Categoria"
            options={categoryOptions}
            grouped
            placeholder="Selecione uma categoria"
            required
            disabled={isFormLoading}
            error={getFieldError("categoryId")}
          />

          <Select
            value={formData.accountId}
            onChange={(value) => setFormData(prev => ({ ...prev, accountId: value.toString() }))}
            label="Conta"
            options={accountOptions}
            placeholder="Selecione uma conta"
            required
            disabled={isFormLoading}
            error={getFieldError("accountId")}
          />
        </div>
      </div>

      {/* Seção 3: Status e Repetição */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-pink-500 rounded-full" />
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Detalhes Adicionais
          </h3>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            value={formData.status}
            onChange={(value) => setFormData(prev => ({ ...prev, status: value.toString() }))}
            label="Status"
            options={statusOptions}
            placeholder="Selecione o status"
            disabled={isFormLoading}
            error={getFieldError("status")}
          />

          {!editingTransaction && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Repetir transação
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setRepeatMonths(prev => Math.max(1, prev - 1))}
                  disabled={isFormLoading || repeatMonths <= 1}
                  className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  -
                </button>

                <span className="min-w-[3rem] text-center text-white font-medium">
                  {repeatMonths}
                </span>

                <button
                  type="button"
                  onClick={() => setRepeatMonths(prev => prev + 1)}
                  disabled={isFormLoading}
                  className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  +
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Serão criadas {repeatMonths} transações (uma por mês)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Data selecionada */}
      {selectedDate && (
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 flex items-center gap-3">
          <FaCalendarAlt className="text-purple-400" />
          <span className="text-sm text-slate-300">
            Data: {selectedDate.toLocaleDateString('pt-BR')}
          </span>
        </div>
      )}

      {/* Botões */}
      <div className="flex gap-3 pt-6 border-t border-white/10">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onClose}
          disabled={isFormLoading}
          className="flex-1"
        >
          Cancelar
        </Button>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isFormLoading}
          isLoading={isFormLoading}
          className={`
            flex-1
            ${selectedCategory?.type === 'INCOME' 
              ? 'bg-gradient-to-r from-green-600 to-emerald-600' 
              : 'bg-gradient-to-r from-purple-600 to-indigo-600'
            }
          `}
        >
          {editingTransaction ? 'Atualizar' : 'Adicionar'}
        </Button>
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isFormLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm rounded-2xl flex items-center justify-center"
          >
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-300">
                {actionLoading.updating ? 'Atualizando...' : 'Criando transação...'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
