'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaSave,
  FaTimes,
  FaInfoCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaCalendarAlt,
  FaWallet,
  FaTag,
} from 'react-icons/fa';

import { transactionService, accountService, categoryService } from '@/app/services';
import { useAuth } from '@/app/context';
import { TransactionModel, TransactionType, TransactionStatus, TransactionFormData } from '@/app/types/transaction';
import { AccountModel } from '@/app/types/account';
import { CategoryModel } from '@/app/types/category';
import IconRenderer from '@/app/components/ui/IconRenderer';

import {
  Input,
  Select,
  Button,
  Alert
} from '@/app/components';

import { useFormManager, useCurrencyFormatter } from '@/app/hook';

interface TransactionFormProps {
  transaction?: TransactionModel | TransactionFormData | null;
  isEditing: boolean;
  onSubmitSuccess: (message: string) => void;
  onCancel: () => void;
  submitting?: boolean;
  initialAccountId?: string;
  initialData?: Partial<TransactionModel | TransactionFormData>;
}

// Tipo para o formulário interno (com campos obrigatórios)
interface FormData {
  amount: number;
  month: number;
  year: number;
  day: number;
  type: TransactionType;
  description: string;
  status: TransactionStatus;
  accountId: string;
  categoryId: string;
  userId: string;
}

const transactionTypeOptions = [
  { value: 'INCOME', label: '📈 Receita', description: 'Dinheiro que entrou' },
  { value: 'EXPENSE', label: '📉 Despesa', description: 'Dinheiro que saiu' },
];

const statusOptions = [
  { value: 'COMPLETED', label: '✅ Concluída', description: 'Transação efetivada' },
  { value: 'PENDING', label: '⏳ Pendente', description: 'Aguardando confirmação' },
  { value: 'CANCELLED', label: '❌ Cancelada', description: 'Transação cancelada' },
];

const initialFormData: FormData = {
  amount: 0,
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  day: new Date().getDate(),
  type: 'EXPENSE' as TransactionType,
  description: '',
  status: 'COMPLETED' as TransactionStatus,
  accountId: '',
  categoryId: '',
  userId: ''
};

export default function TransactionForm({
  transaction,
  isEditing,
  onSubmitSuccess,
  onCancel,
  submitting: externalSubmitting = false,
  initialAccountId,
  initialData,
}: TransactionFormProps) {
  const { user } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [accountsData, setAccountsData] = useState<{
    items: AccountModel[];
  }>({ items: [] });
  
  const [categoriesData, setCategoriesData] = useState<{
    items: CategoryModel[];
  }>({ items: [] });
  
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const currencyFormatter = useCurrencyFormatter({
    initialValue: 'R$ 0,00'
  });

  // Função para converter TransactionModel para FormData
  const mapTransactionToFormData = (tx: TransactionModel): FormData => {
    return {
      amount: tx.amount,
      month: tx.month,
      year: tx.year,
      day: tx.day,
      type: tx.type,
      description: tx.description || '',
      status: tx.status,
      accountId: tx.accountId || '',
      categoryId: tx.categoryId || '',
      userId: tx.userId
    };
  };

  // Função para converter Partial<TransactionModel> para FormData
  const mapPartialToFormData = (data: Partial<TransactionModel>): FormData => {
    return {
      amount: data.amount ?? 0,
      month: data.month ?? new Date().getMonth() + 1,
      year: data.year ?? new Date().getFullYear(),
      day: data.day ?? new Date().getDate(),
      type: data.type ?? 'EXPENSE',
      description: data.description ?? '',
      status: data.status ?? 'COMPLETED',
      accountId: data.accountId ?? '',
      categoryId: data.categoryId ?? '',
      userId: data.userId ?? user?.id ?? ''
    };
  };

  const isTransactionModel = (
    tx: TransactionModel | TransactionFormData
  ): tx is TransactionModel => {
    return (tx as TransactionModel).account !== undefined;
  };

  const getEditingItem = (): FormData | undefined => {
    if (transaction) {
      if (isTransactionModel(transaction)) {
        return mapTransactionToFormData(transaction);
      }

      // se já for TransactionFormData
      return {
        amount: transaction.amount,
        month: transaction.month ?? new Date().getMonth() + 1,
        year: transaction.year ?? new Date().getFullYear(),
        day: transaction.day ?? new Date().getDate(),
        type: transaction.type as TransactionType,
        description: transaction.description ?? '',
        status: (transaction.status as TransactionStatus) ?? 'COMPLETED',
        accountId: transaction.accountId ?? '',
        categoryId: transaction.categoryId ?? '',
        userId: transaction.userId
      };
    }

    if (initialData) {
      return mapPartialToFormData(initialData as Partial<TransactionModel>);
    }

    return undefined;
  };

  const formManager = useFormManager({
    initialData: initialFormData,
    editingItem: getEditingItem(),
    isEditing: isEditing || !!initialData,
    onSubmit: async (data) => {
      setSubmitError(null);
      setTouched(true);
      setIsSubmitting(true);

      try {
        const payload: TransactionFormData = {
          ...data,
          description: data.description || '',
          userId: user!.id
        };

        if (isEditing && transaction) {
          await transactionService.updateTransaction({
            ...payload,
            id: transaction.id
          });
        } else {
          await transactionService.createTransaction(payload);
        }

        return {
          success: true,
          message: isEditing
            ? 'Transação atualizada com sucesso!'
            : 'Transação criada com sucesso!'
        };

      } catch (err: any) {
        setSubmitError(err.message || 'Erro ao salvar transação');
        return {
          success: false,
          message: err.message
        };
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: (message) => {
      onSubmitSuccess(message || (isEditing ? 'Transação atualizada com sucesso!' : 'Transação criada com sucesso!'));
    },
    userId: user?.id
  });

  // Inicializar com accountId se fornecido
  useEffect(() => {
    if (initialAccountId && !formManager.formData.accountId) {
      formManager.setFormData({ accountId: initialAccountId });
    }
  }, [initialAccountId, formManager]);

  // Atualizar formatter quando transaction carregar
  useEffect(() => {
    if (transaction && isEditing) {
      const formatted = currencyFormatter.formatCentsToCurrency(transaction.amount);
      currencyFormatter.setDisplayValue(formatted);
    }
  }, [transaction, isEditing, currencyFormatter]);

  // Carregar contas e categorias
  useEffect(() => {
    async function loadData() {
      if (!user?.id) return;

      try {
        const [accountsRes, categoriesRes] = await Promise.all([
          accountService.getAccounts(user.id),
          categoryService.getCategories(user.id),
        ]);

        setAccountsData({
          items: accountsRes.data?.items || []
        });
        
        setCategoriesData({
          items: categoriesRes.data?.items || []
        });

      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoadingAccounts(false);
        setLoadingCategories(false);
      }
    }

    loadData();
  }, [user?.id]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    currencyFormatter.handleCurrencyChange(value);
    const cents = currencyFormatter.formatCurrencyToCents(value);
    formManager.setFormData({ amount: cents });
  };

  const isFormValid = () => {
    return (
      formManager.formData.description.trim().length > 0 &&
      formManager.formData.amount > 0 &&
      formManager.formData.accountId &&
      formManager.formData.categoryId
    );
  };

  const accountOptions = accountsData.items
    .filter(a => a.isActive)
    .map(a => ({
      value: a.id,
      label: a.name,
      icon: (
        <div style={{ color: a.color }}>
          <IconRenderer iconName={a.icon || 'wallet'} size={16} />
        </div>
      ),
      description: `${a.currency} - ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: a.currency }).format(a.balance / 100)}`
    }));

  const categoryOptions = categoriesData.items.map(c => ({
    value: c.id,
    label: c.name,
    icon: (
      <div style={{ color: c.color }}>
        <IconRenderer iconName={c.icon || 'tag'} size={16} />
      </div>
    ),
    description: c.type === 'INCOME' ? 'Receita' : 'Despesa'
  }));

  const getToday = () => {
    const today = new Date();
    return {
      day: today.getDate(),
      month: today.getMonth() + 1,
      year: today.getFullYear()
    };
  };

  const handleSetToday = () => {
    const today = getToday();
    formManager.setFormData(today);
  };

  const loading = isSubmitting || externalSubmitting || loadingAccounts || loadingCategories;

  return (
    <form onSubmit={formManager.handleSubmit} className="relative">
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

      {/* Seção 1: Tipo e Valor */}
      <div className="space-y-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-purple-500 rounded-full" />
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Tipo e Valor
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Tipo de Transação"
            value={formManager.formData.type}
            onChange={(v) => formManager.setFormData({ type: v as TransactionType })}
            options={transactionTypeOptions}
            disabled={loading}
            required
            className="w-full"
          />

          <Input
            label="Valor (R$)"
            value={currencyFormatter.displayValue}
            onChange={handleAmountChange}
            disabled={loading}
            placeholder="R$ 0,00"
            required
            className="w-full"
          />
        </div>
      </div>

      {/* Seção 2: Descrição */}
      <div className="space-y-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-indigo-500 rounded-full" />
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Descrição
          </h3>
        </div>

        <Input
          label="Descrição"
          value={formManager.formData.description}
          onChange={(e) => formManager.setFormData({ description: e.target.value })}
          onBlur={() => setTouched(true)}
          placeholder="Ex: Salário, Supermercado, etc."
          disabled={loading}
          required
          error={touched && !formManager.formData.description.trim() ? 'Descrição é obrigatória' : undefined}
          icon={<FaInfoCircle />}
          className="w-full"
        />
      </div>

      {/* Seção 3: Data */}
      <div className="space-y-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-pink-500 rounded-full" />
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Data
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Dia"
            type="number"
            min={1}
            max={31}
            value={formManager.formData.day}
            onChange={(e) => formManager.setFormData({ day: parseInt(e.target.value) || 1 })}
            disabled={loading}
            required
          />
          
          <Input
            label="Mês"
            type="number"
            min={1}
            max={12}
            value={formManager.formData.month}
            onChange={(e) => formManager.setFormData({ month: parseInt(e.target.value) || 1 })}
            disabled={loading}
            required
          />
          
          <Input
            label="Ano"
            type="number"
            min={2000}
            max={2100}
            value={formManager.formData.year}
            onChange={(e) => formManager.setFormData({ year: parseInt(e.target.value) || 2024 })}
            disabled={loading}
            required
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSetToday}
          icon={<FaCalendarAlt />}
          disabled={loading}
          className="mt-2"
        >
          Usar data atual
        </Button>
      </div>

      {/* Seção 4: Associações */}
      <div className="space-y-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-green-500 rounded-full" />
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Associações
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Conta"
            value={formManager.formData.accountId}
            onChange={(v) => formManager.setFormData({ accountId: String(v) })}
            options={accountOptions}
            disabled={loading || loadingAccounts}
            required
            icon={<FaWallet />}
            placeholder={loadingAccounts ? "Carregando contas..." : "Selecione uma conta"}
            className="w-full"
          />

          <Select
            label="Categoria"
            value={formManager.formData.categoryId}
            onChange={(v) => formManager.setFormData({ categoryId: String(v) })}
            options={categoryOptions}
            disabled={loading || loadingCategories}
            required
            icon={<FaTag />}
            placeholder={loadingCategories ? "Carregando categorias..." : "Selecione uma categoria"}
            className="w-full"
          />
        </div>
      </div>

      {/* Seção 5: Status */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-orange-500 rounded-full" />
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Status
          </h3>
        </div>

        <Select
          label="Status"
          value={formManager.formData.status}
          onChange={(v) => formManager.setFormData({ status: v as TransactionStatus })}
          options={statusOptions}
          disabled={loading}
          required
          className="w-full"
        />
      </div>

      {/* Botões de Ação */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-white/10">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          size="md"
          disabled={loading}
          className="w-full sm:w-auto order-3 sm:order-2"
          icon={<FaTimes />}
        >
          Cancelar
        </Button>

        <Button
          type="submit"
          disabled={loading || !isFormValid()}
          size="lg"
          className="w-full sm:w-auto order-1 sm:order-3
                     bg-gradient-to-r from-purple-600 to-indigo-600
                     hover:from-purple-700 hover:to-indigo-700
                     text-white font-semibold shadow-lg"
          icon={loading ? <FaSpinner className="animate-spin" /> : <FaSave />}
          isLoading={loading}
        >
          {loading 
            ? (isEditing ? 'Salvando...' : 'Criando...') 
            : (isEditing ? 'Salvar Alterações' : 'Criar Transação')
          }
        </Button>
      </div>

      {/* Validação em tempo real */}
      <AnimatePresence>
        {touched && !isFormValid() && !loading && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-red-400 flex items-center gap-2 mt-4"
          >
            <FaExclamationTriangle size={12} />
            Preencha todos os campos obrigatórios
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  );
}