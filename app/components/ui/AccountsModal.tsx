// app/components/AccountsModal.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaTimes, FaPlus, FaTrash, FaWallet, FaChartLine, FaArrowLeft } from 'react-icons/fa';
import { accountService } from '@/app/services/accountService';
import { useAuth } from '@/app/context/AuthContext';
import { useTheme } from '@/app/context/ThemeContext';
import { AccountModel } from '@/app/types/account';
import { Button, Input, Select } from '@/app/components';

interface AccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mapeamento de tipos para ícones
const typeIcons: { [key: string]: React.ReactNode } = {
  CHECKING: <FaWallet className="text-blue-500" size={16} />,
  INVESTMENT: <FaChartLine className="text-purple-500" size={16} />,
};

// Mapeamento de tipos para labels
const typeLabels: { [key: string]: string } = {
  CHECKING: 'Conta Corrente',
  INVESTMENT: 'Investimento',
};

// Opções para o select de tipo de conta
const accountTypeOptions = [
  { value: 'CHECKING', label: 'Conta Corrente' },
  { value: 'INVESTMENT', label: 'Investimento' },
];

export default function AccountsModal({ isOpen, onClose }: AccountsModalProps) {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const [accounts, setAccounts] = useState<AccountModel[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<AccountModel | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    balance: 0,
    type: 'CHECKING' as 'CHECKING' | 'INVESTMENT',
    userId: user?.id || ''
  });

  // Sistema de cores baseado no tema
  const getThemeColors = () => {
    return isDark 
      ? {
          // Backgrounds
          bg: {
            primary: 'bg-gray-900',
            secondary: 'bg-gray-800',
            tertiary: 'bg-gray-700',
            modal: 'bg-gray-900',
            overlay: 'bg-black/80',
          },
          // Text
          text: {
            primary: 'text-gray-100',
            secondary: 'text-gray-300',
            tertiary: 'text-gray-400',
            inverse: 'text-gray-900',
          },
          // Borders
          border: {
            primary: 'border-gray-700',
            secondary: 'border-gray-600',
            accent: 'border-blue-500',
          },
          // Estados
          state: {
            hover: 'hover:bg-gray-800',
            active: 'bg-gray-700',
            disabled: 'bg-gray-800 text-gray-500',
          },
          // Cores específicas
          colors: {
            success: {
              bg: 'bg-green-900/20',
              border: 'border-green-800',
              text: 'text-green-300',
            },
            error: {
              bg: 'bg-red-900/20',
              border: 'border-red-800',
              text: 'text-red-300',
            },
            warning: {
              bg: 'bg-yellow-900/20',
              border: 'border-yellow-800',
              text: 'text-yellow-300',
            },
            info: {
              bg: 'bg-blue-900/20',
              border: 'border-blue-800',
              text: 'text-blue-300',
            },
          }
        }
      : {
          // Backgrounds
          bg: {
            primary: 'bg-white',
            secondary: 'bg-gray-50',
            tertiary: 'bg-gray-100',
            modal: 'bg-white',
            overlay: 'bg-black/50',
          },
          // Text
          text: {
            primary: 'text-gray-900',
            secondary: 'text-gray-600',
            tertiary: 'text-gray-500',
            inverse: 'text-white',
          },
          // Borders
          border: {
            primary: 'border-gray-200',
            secondary: 'border-gray-300',
            accent: 'border-blue-500',
          },
          // Estados
          state: {
            hover: 'hover:bg-gray-50',
            active: 'bg-gray-100',
            disabled: 'bg-gray-100 text-gray-400',
          },
          // Cores específicas
          colors: {
            success: {
              bg: 'bg-green-50',
              border: 'border-green-200',
              text: 'text-green-700',
            },
            error: {
              bg: 'bg-red-50',
              border: 'border-red-200',
              text: 'text-red-700',
            },
            warning: {
              bg: 'bg-yellow-50',
              border: 'border-yellow-200',
              text: 'text-yellow-700',
            },
            info: {
              bg: 'bg-blue-50',
              border: 'border-blue-200',
              text: 'text-blue-700',
            },
          }
        };
  };

  const colors = getThemeColors();

  const loadAccounts = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await accountService.getAccounts(user.id, { limit: '50' });
      setAccounts(response.data?.items || []);
    } catch (err) {
      setError('Erro ao carregar contas');
      console.error('Erro ao carregar contas:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Função para prevenir scroll do body
  const preventBodyScroll = useCallback(() => {
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    
    return scrollY;
  }, []);

  // Função para restaurar scroll do body
  const restoreBodyScroll = useCallback((scrollY: number) => {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    window.scrollTo(0, scrollY);
  }, []);

  useEffect(() => {
    if (isOpen && user?.id) {
      loadAccounts();
      setFormData(prev => ({ ...prev, userId: user.id }));
      // Resetar estado do formulário quando o modal abrir
      setShowForm(false);
      setIsEditing(false);
      setCurrentAccount(null);

      // Prevenir scroll apenas em mobile
      if (window.innerWidth <= 768) {
        const scrollY = preventBodyScroll();
        return () => {
          restoreBodyScroll(scrollY);
        };
      }
    }
  }, [isOpen, user?.id, loadAccounts, preventBodyScroll, restoreBodyScroll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const accountData = {
        name: formData.name,
        balance: Number(formData.balance),
        type: formData.type,
        userId: user.id
      };

      if (isEditing && currentAccount) {
        // Editar conta existente
        const updatedAccount = await accountService.updateAccount({
          ...currentAccount,
          ...accountData
        });
        setAccounts(accounts.map(acc => 
          acc.id === currentAccount.id ? updatedAccount : acc
        ));
        setSuccess('Conta atualizada com sucesso!');
      } else {
        // Criar nova conta
        const newAccount = await accountService.createAccount(accountData);
        setAccounts([...accounts, newAccount]);
        setSuccess('Conta criada com sucesso!');
      }
      resetForm();
      loadAccounts();
    } catch (err: any) {
      const errorMessage = err?.message || 'Erro ao salvar conta';
      setError(errorMessage);
      console.error('Erro ao salvar conta:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddNew = () => {
    resetForm();
    setShowForm(true);
    setIsEditing(false);
    setCurrentAccount(null);
  };

  const handleEdit = (account: AccountModel) => {
    setCurrentAccount(account);
    setFormData({
      name: account.name,
      balance: account.balance,
      type: account.type as 'CHECKING' | 'INVESTMENT',
      userId: account.userId
    });
    setIsEditing(true);
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return;

    setLoading(true);
    try {
      const result = await accountService.deleteAccount(id);
      if (result.success) {
        setAccounts(accounts.filter(account => account.id !== id));
        setSuccess('Conta excluída com sucesso!');
      } else {
        setError(result.message || 'Erro ao excluir conta');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Erro ao excluir conta';
      setError(errorMessage);
      console.error('Erro ao excluir conta:', err);
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(null), 2000);
    }
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      balance: 0, 
      type: 'CHECKING',
      userId: user?.id || ''
    });
    setIsEditing(false);
    setCurrentAccount(null);
    setShowForm(false);
    setError(null);
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleBackToList = () => {
    resetForm();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 ${colors.bg.overlay} flex items-center justify-center z-50 px-2 py-3 animate-fade-in`}>
      <div className={`${colors.bg.modal} rounded-3xl shadow-xl w-full h-full sm:max-w-6xl sm:max-h-[90vh] sm:mx-4 overflow-hidden flex flex-col animate-slide-up`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${colors.border.primary} flex-shrink-0`}>
          <div className="flex items-center gap-3">
            {showForm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                disabled={submitting}
                icon={<FaArrowLeft />}
                className="!p-2"
                title="Voltar para lista"
              />
            )}
            <h3 className={`text-lg font-bold ${colors.text.primary} truncate`}>
              {showForm 
                ? (isEditing ? 'Editar Conta' : 'Nova Conta')
                : 'Gerenciar Contas'
              }
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={submitting}
            icon={<FaTimes />}
            className="!p-2"
          />
        </div>

        {/* Mensagens de status */}
        {(error || success) && (
          <div className={`mx-6 mt-4 p-3 rounded-lg border ${
            error ? `${colors.colors.error.bg} ${colors.colors.error.border}` : `${colors.colors.success.bg} ${colors.colors.success.border}`
          } flex-shrink-0`}>
            <p className={`text-sm ${
              error ? colors.colors.error.text : colors.colors.success.text
            }`}>
              {error || success}
            </p>
          </div>
        )}

        {/* Conteúdo Principal */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {showForm ? (
            /* Formulário */
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <Input
                    label="Nome da Conta"
                    name="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Conta Corrente BB, Carteira, etc."
                    required
                    disabled={submitting}
                    variant="outlined"
                    size="md"
                    autoFocus
                  />
                  
                  <Input
                    label="Saldo Inicial"
                    name="balance"
                    type="number"
                    step="0.01"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                    placeholder="0,00"
                    disabled={submitting}
                    variant="outlined"
                    size="md"
                  />

                  <Select
                    label="Tipo de Conta"
                    name="type"
                    value={formData.type}
                    onChange={(value) => setFormData({ ...formData, type: value as 'CHECKING' | 'INVESTMENT' })}
                    options={accountTypeOptions}
                    placeholder="Selecione o tipo de conta"
                    disabled={submitting}
                    variant="outlined"
                    size="md"
                  />
                </div>
              </div>

              <div className={`p-6 border-t ${colors.border.primary} flex-shrink-0`}>
                <div className="flex gap-3 flex-col sm:flex-row">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    fullWidth
                    isLoading={submitting}
                    icon={<FaPlus size={14} />}
                    disabled={submitting}
                  >
                    {isEditing ? 'Atualizar' : 'Adicionar'} Conta
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={handleBackToList}
                    disabled={submitting}
                    fullWidth
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            /* Lista de Contas */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Botão Adicionar */}
              <div className={`p-6 border-b ${colors.border.primary} flex-shrink-0`}>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleAddNew}
                  icon={<FaPlus size={14} />}
                  fullWidth
                >
                  Adicionar Nova Conta
                </Button>
              </div>

              {/* Lista */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className={`mt-2 ${colors.text.tertiary}`}>Carregando contas...</p>
                  </div>
                ) : accounts.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6">
                    <FaWallet className="text-gray-400 text-4xl mb-4" />
                    <p className={`text-center ${colors.text.tertiary} mb-4`}>
                      Nenhuma conta cadastrada
                    </p>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleAddNew}
                      icon={<FaPlus size={14} />}
                    >
                      Adicionar Primeira Conta
                    </Button>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="space-y-2">
                      {accounts.map((account) => (
                        <div 
                          key={account.id} 
                          className={`p-4 rounded-lg border ${colors.border.primary} ${colors.state.hover} transition-colors cursor-pointer`}
                          onClick={() => handleEdit(account)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${colors.bg.secondary}`}>
                                {typeIcons[account.type] || <FaWallet size={16} />}
                              </div>
                              <div>
                                <h3 className={`font-medium ${colors.text.primary}`}>{account.name}</h3>
                                <p className={`text-sm ${colors.text.secondary}`}>
                                  {typeLabels[account.type] || account.type}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-sm font-medium ${
                                account.balance >= 0 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : 'text-red-600 dark:text-red-400'
                              }`}>
                                {formatCurrency(account.balance)}
                              </span>
                              <div className="flex gap-1">
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    handleDelete(account.id); 
                                  }}
                                  disabled={loading}
                                  icon={<FaTrash size={12} />}
                                  className="!p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400"
                                  title="Excluir conta"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}