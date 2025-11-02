"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth, useUI } from "@/app/context";
import { useThemeColors } from '@/app/hook';
import { DayModalProps, Transaction, Category, Account } from "@/app/types/calendar";
import { Button, SummaryCards, FiltersSection, LoadingSkeleton, EmptyState, TransactionsList, TransactionFormModal, LoadingAction, ConfirmationModal } from '@/app/components';
import { FaPlus, FaTimes, FaArrowLeft } from 'react-icons/fa';
import { transactionService } from '@/app/services';

export default function DayModal({ 
  isOpen, 
  onClose, 
  selectedDate, 
  transactions, 
  isLoading, 
  onTransactionsChange,
  refreshAccounts
}: DayModalProps) {
  const { user } = useAuth();
  const colors = useThemeColors();
  const { setModalOpen } = useUI();
  
  // Estados para transações
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  
  // Estados compartilhados
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  
  // Estados de loading específicos
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState({
    creating: false,
    updating: false,
    deleting: false
  });

  // Estado para otimista updates
  const [optimisticTransactions, setOptimisticTransactions] = useState<Transaction[]>([]);

  // MELHORIA: Estados para o modal de confirmação
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    transactionId: string | null;
    transactionDescription: string;
  }>({
    isOpen: false,
    transactionId: null,
    transactionDescription: ''
  });

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [transactionFormData, setTransactionFormData] = useState({
    amount: '',
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    status: 'PENDING' as 'PENDING' | 'COMPLETED' | 'CANCELLED',
    description: '',
    categoryId: '',
    accountId: ''
  });

  // Sincronizar transações otimistas com as reais
  useEffect(() => {
    if (transactions) {
      setOptimisticTransactions(transactions);
    }
  }, [transactions]);

  useEffect(() => {
    setModalOpen(isOpen ?? false);
  }, [isOpen, setModalOpen]);

  const fetchCategoriesAndAccounts = useCallback(async () => {
    try {
      const [categoriesResponse, accountsResponse] = await Promise.all([
        fetch(`/api/category/all?userId=${user?.id}`),
        fetch(`/api/account/all?userId=${user?.id}`)
      ]);

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        if (categoriesData.success) {
          setCategories(categoriesData.categorias);
        }
      }

      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        if (accountsData.success) {
          setAccounts(accountsData.data.items);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isFormModalOpen && user) {
      fetchCategoriesAndAccounts();
    }
  }, [isFormModalOpen, user, fetchCategoriesAndAccounts]);

  const resetTransactionForm = () => {
    setTransactionFormData({
      amount: '',
      type: 'EXPENSE',
      status: 'PENDING',
      description: '',
      categoryId: '',
      accountId: ''
    });
    setEditingTransaction(null);
  };

  const filterAndSortTransactions = (
    items: Transaction[],
    getSearchFields: (item: Transaction) => string[]
  ): Transaction[] => {
    return items
      .filter(item => {
        const matchesSearch = searchTerm === '' || 
          getSearchFields(item).some(field =>
            field.toLowerCase().includes(searchTerm.toLowerCase())
          );

        const matchesType = filterType === '' || filterType === 'ALL' || item.type === filterType;
        
        const matchesCategory = filterCategory === '' || filterCategory === 'ALL' || item.categoryId === filterCategory;

        return matchesSearch && matchesType && matchesCategory;
      })
      .sort((a, b) => {
        if (!sortBy) return 0;
        
        let aValue: string | number, bValue: string | number;
        
        switch (sortBy) {
          case 'amount':
            aValue = parseFloat(a.amount?.toString() || '0');
            bValue = parseFloat(b.amount?.toString() || '0');
            break;
          case 'description':
            aValue = a.description?.toLowerCase() || '';
            bValue = b.description?.toLowerCase() || '';
            break;
          default:
            return 0;
        }
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
  };

  // Usar transações otimistas para filtragem
  const filteredTransactions = filterAndSortTransactions(
    optimisticTransactions || [],
    t => [t.description || '', t.category?.name || '']
  );

  const handleAddClick = () => {
    resetTransactionForm();
    setIsFormModalOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    
    const getSafeTransactionType = (type: string | undefined): 'INCOME' | 'EXPENSE' => {
      return type === 'INCOME' || type === 'EXPENSE' ? type : 'EXPENSE';
    };

    const getSafeTransactionStatus = (status: string | undefined): 'PENDING' | 'COMPLETED' | 'CANCELLED' => {
      return status === 'PENDING' || status === 'COMPLETED' || status === 'CANCELLED' ? status : 'COMPLETED';
    };

    setTransactionFormData({
      amount: transaction.amount?.toString() || '',
      type: getSafeTransactionType(transaction.type),
      description: transaction.description || '',
      categoryId: transaction.categoryId || '',
      accountId: transaction.accountId || '',
      status: getSafeTransactionStatus(transaction.status),
    });
    setIsFormModalOpen(true);
  };

  // Função para criar ID temporário
  const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Função para encontrar categoria e conta completas
  const findCategoryAndAccount = (categoryId: string, accountId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    const account = accounts.find(acc => acc.id === accountId);
    return { category, account };
  };

  // MELHORIA: Abrir modal de confirmação
  const handleDeleteClick = (transactionId: string, transactionDescription: string) => {
    setConfirmationModal({
      isOpen: true,
      transactionId,
      transactionDescription: transactionDescription || 'esta transação'
    });
  };

  // MELHORIA: Fechar modal de confirmação
  const handleCloseConfirmation = () => {
    setConfirmationModal({
      isOpen: false,
      transactionId: null,
      transactionDescription: ''
    });
  };

  // MELHORIA: Confirmar exclusão
  const handleConfirmDelete = async () => {
    const { transactionId } = confirmationModal;
    if (!user || !transactionId) return;

    // Otimista update - remover imediatamente
    const transactionToDelete = optimisticTransactions.find(t => t.id === transactionId);
    // setOptimisticTransactions(prev => 
    //   prev.filter(t => t.id !== transactionId)
    // );

    // Fechar modal de confirmação
    handleCloseConfirmation();

    setDeletingTransactionId(transactionId);
    setActionLoading(prev => ({ ...prev, deleting: true }));

    try {
      const result = await transactionService.deleteTransaction(transactionId);
      if (result.success) {
        onTransactionsChange?.();
        await refreshAccounts();
        setSuccess(result.message);
        setError(null);
        const successTimer = setTimeout(() => setSuccess(null), 2000);
        return () => clearTimeout(successTimer);
      } else {
        // Reverter se falhar
        if (transactionToDelete) {
          setOptimisticTransactions(prev => [...prev, transactionToDelete]);
        }
        setError(result.message);
        setSuccess(null);
      }
    } catch (error) {
      console.error('Erro ao excluir transação:', error);
      // Reverter se falhar
      if (transactionToDelete) {
        setOptimisticTransactions(prev => [...prev, transactionToDelete]);
      }
      setError('Erro ao excluir transação');
    } finally {
      setDeletingTransactionId(null);
      setActionLoading(prev => ({ ...prev, deleting: false }));
    }
  };

  const handleTransactionSubmit = async (data: any) => {
    if (!user || !selectedDate) return;

    // Setar loading específico para criação/edição
    const isEditing = !!editingTransaction;
    setActionLoading(prev => ({ 
      ...prev, 
      [isEditing ? 'updating' : 'creating']: true 
    }));
    setIsSubmitting(true);

    try {
      const transactionData = {
        ...data,
        userId: user.id,
        year: selectedDate.getFullYear(),
        month: selectedDate.getMonth() + 1,
        day: selectedDate.getDate()
      };

      // Otimista update
      let tempTransaction: Transaction;
      const { category, account } = findCategoryAndAccount(data.categoryId, data.accountId);

      if (editingTransaction) {
        // Atualização otimista
        tempTransaction = {
          ...editingTransaction,
          ...transactionData,
          amount: data.amount,
          description: data.description,
          categoryId: data.categoryId,
          accountId: data.accountId,
          status: data.status,
          category,
          account,
          // Manter o ID original
          id: editingTransaction.id
        };

        setOptimisticTransactions(prev =>
          prev.map(t => t.id === editingTransaction.id ? tempTransaction : t)
        );
      } else {
        // Criação otimista
        const tempId = generateTempId();
        tempTransaction = {
          ...transactionData,
          id: tempId,
          _id: tempId,
          amount: data.amount,
          description: data.description,
          categoryId: data.categoryId,
          accountId: data.accountId,
          status: data.status,
          type: data.type,
          category,
          account,
          // Marcar como otimista
          isOptimistic: true
        };

        setOptimisticTransactions(prev => [...prev, tempTransaction]);
      }

      let result;
      
      if (editingTransaction) {
        result = await transactionService.updateTransaction({
          id: editingTransaction.id,
          ...transactionData
        });
      } else {
        result = await transactionService.createTransaction(transactionData);
      }

      if (result.success) {
        setIsFormModalOpen(false);
        resetTransactionForm();
        
        // Forçar refresh para sincronizar com dados reais
        onTransactionsChange?.();
        await refreshAccounts();
        
        setSuccess(result.message);
        setError(null);
        const successTimer = setTimeout(() => setSuccess(null), 2000);
        return () => clearTimeout(successTimer);
      } else {
        // Reverter otimista update em caso de erro
        if (editingTransaction) {
          setOptimisticTransactions(prev =>
            prev.map(t => t.id === editingTransaction.id ? editingTransaction : t)
          );
        } else {
          setOptimisticTransactions(prev =>
            prev.filter(t => t.id !== tempTransaction.id)
          );
        }
        setError(result.message);
        setSuccess(null);
      }
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      // Reverter otimista update em caso de erro
      if (editingTransaction) {
        setOptimisticTransactions(prev =>
          prev.map(t => t.id === editingTransaction.id ? editingTransaction : t)
        );
      } else {
        setOptimisticTransactions(prev =>
          prev.filter(t => t.isOptimistic)
        );
      }
      setError('Erro ao salvar transação');
    } finally {
      setActionLoading(prev => ({ 
        ...prev, 
        [isEditing ? 'updating' : 'creating']: false 
      }));
      setIsSubmitting(false);
    }
  };

  // Calcular totais baseados nas transações otimistas
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + parseFloat(t.amount?.toString() || '0'), 0);

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + parseFloat(t.amount?.toString() || '0'), 0);

  const uniqueCategories = Array.from(
    new Map((optimisticTransactions || [])
      .filter(t => t.category)
      .map(t => [t.category!.id, t.category!])
    ).values()
  );

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => {
        document.removeEventListener('keydown', handleEscKey);
      };
    }
  }, [isOpen, onClose]);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  if (!isOpen) return null;

  const inputErrors = (error && error.split(';')) || []

  return (
    <>
      <div 
        className={`fixed inset-0 ${colors.bg.overlay} flex items-end sm:items-center justify-center z-50 p-0 animate-fade-in safe-area-container`}
        onClick={onClose}
      >
        <div 
          className={`
            ${colors.bg.modal} rounded-t-3xl sm:rounded-3xl shadow-xl w-full h-[95vh] 
            sm:max-w-6xl sm:max-h-[90vh] sm:mx-4 overflow-hidden flex flex-col 
            animate-slide-up-mobile sm:animate-slide-up
            modal-fullscreen-mobile
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header com loading indicator quando necessário */}
          <div className={`
            flex items-center justify-between p-4 border-b ${colors.border.primary} 
            flex-shrink-0 sticky top-0 ${colors.bg.modal} z-10
            shadow-sm sm:shadow-none pt-safe
          `}>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="sm:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                disabled={actionLoading.creating || actionLoading.updating || actionLoading.deleting}
              >
                <FaArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className={`text-lg sm:text-xl font-bold ${colors.text.primary}`}>
                  Transações do Dia
                </h2>
                {selectedDate && (
                  <p className={`text-xs sm:text-sm ${colors.text.secondary} mt-1`}>
                    {selectedDate.toLocaleDateString('pt-BR', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {/* Mostrar loading durante criação */}
              {(actionLoading.creating || actionLoading.updating) && (
                <LoadingAction 
                  message={actionLoading.updating ? "Atualizando..." : "Criando..."} 
                  size="sm"
                />
              )}

              <Button
                variant="primary"
                size="sm"
                onClick={handleAddClick}
                icon={<FaPlus size={14} />}
                className="!p-2"
                title="Adicionar nova transação"
                disabled={actionLoading.creating || actionLoading.updating || actionLoading.deleting}
              />
              
              <Button
                variant="secondary"
                size="sm"
                onClick={onClose}
                disabled={actionLoading.creating || actionLoading.updating || actionLoading.deleting}
                icon={<FaTimes size={16} />}
                className="!hidden sm:!inline-flex !p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title="Fechar"
              />
            </div>
          </div>

          {success && (
            <div 
              className={`
                mx-4 mt-2 p-3 rounded-xl border flex-shrink-0 animate-fade-in
                ${colors.colors.success.bg} ${colors.colors.success.border} ${colors.colors.success.text}
              `}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                <p className="text-sm flex-1">
                  {success}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={clearMessages}
                  icon={<FaTimes size={14} />}
                  className="!p-1 flex-shrink-0"
                  title="Fechar mensagem"
                  aria-label="Fechar mensagem"
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden flex flex-col">
            {isFormModalOpen ? (
              <>
                <TransactionFormModal
                  isOpen={isFormModalOpen}
                  onClose={() => {
                    setIsFormModalOpen(false);
                    resetTransactionForm();
                    setError(null);
                    setSuccess(null);
                  }}
                  formData={transactionFormData}
                  setFormData={setTransactionFormData}
                  editingTransaction={editingTransaction}
                  isSubmitting={isSubmitting}
                  categories={categories}
                  accounts={accounts}
                  onSubmit={handleTransactionSubmit}
                  selectedDate={selectedDate}
                  errors={inputErrors}
                  actionLoading={actionLoading}
                />
              </>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className={`px-4 py-3 border-b ${colors.border.primary}`}>
                  <SummaryCards
                    totalIncome={totalIncome}
                    totalExpenses={totalExpenses}
                  />
                </div>

                <div className={`
                  p-4 border-b ${colors.border.primary} flex-shrink-0 
                  ${colors.bg.secondary}
                `}>
                  <FiltersSection
                    searchTerm={searchTerm}
                    filterType={filterType}
                    filterCategory={filterCategory}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    categories={uniqueCategories}
                    onSearchChange={setSearchTerm}
                    onFilterTypeChange={setFilterType}
                    onFilterCategoryChange={setFilterCategory}
                    onSortChange={(field, order) => {
                      setSortBy(field);
                      setSortOrder(order);
                    }}
                    onClearFilters={() => {
                      setSearchTerm('');
                      setFilterType('');
                      setFilterCategory('');
                      setSortBy('');
                      setSortOrder('');
                    }}
                    disabled={actionLoading.creating || actionLoading.updating || actionLoading.deleting}
                  />
                </div>

                <div className="flex-1 overflow-y-auto pb-safe">
                  {isLoading ? (
                    <LoadingSkeleton />
                  ) : (
                    filteredTransactions.length === 0 ? (
                      <EmptyState
                        type="transactions"
                        hasItems={(optimisticTransactions?.length || 0) > 0}
                        onAddClick={handleAddClick}
                      />
                    ) : (
                      <TransactionsList
                        transactions={optimisticTransactions}
                        filteredTransactions={filteredTransactions}
                        loading={false}
                        onEdit={handleEditTransaction}
                        onDelete={handleDeleteClick}
                        user={user}
                        deletingTransactionId={deletingTransactionId} // Isso já existe
                        actionLoading={actionLoading}
                      />
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Loading global no footer */}
          {(actionLoading.creating || actionLoading.updating || actionLoading.deleting) && (
            <div className={`p-3 border-t ${colors.border.primary} ${colors.bg.secondary} flex-shrink-0`}>
              <LoadingAction 
                message={
                  actionLoading.creating ? "Criando transação..." :
                  actionLoading.updating ? "Atualizando transação..." :
                  "Excluindo transação..."
                } 
                size="sm"
                className="justify-center"
              />
            </div>
          )}

          <div className={`sm:hidden p-4 border-t ${colors.border.primary} ${colors.bg.secondary} flex-shrink-0 pb-safe`}>
            <div className={`flex items-center justify-between text-xs ${colors.text.tertiary}`}>
              <span>Toque em uma transação para editar</span>
              <span>{filteredTransactions.length} transações</span>
            </div>
          </div>
        </div>
      </div>

      {/* MELHORIA: Modal de Confirmação */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={handleCloseConfirmation}
        onConfirm={handleConfirmDelete}
        title="Excluir Transação"
        message={`Tem certeza que deseja excluir "${confirmationModal.transactionDescription}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        isLoading={actionLoading.deleting}
      />
    </>
  );
}