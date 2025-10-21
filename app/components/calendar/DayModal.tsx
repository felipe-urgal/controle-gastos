"use client";

import { useState, useEffect, useCallback } from 'react';

import { useAuth, useUI } from "@/app/context";

import { useThemeColors } from '@/app/hook';

import { DayModalProps, Transaction, Category, Account } from "@/app/types/calendar";

import { Button, SummaryCards, FiltersSection, LoadingSkeleton, EmptyState, TransactionsList, TransactionFormModal } from '@/app/components';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

  const preventBodyScroll = useCallback(() => {
    if (typeof window === 'undefined') return 0;
    
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = '15px';
    return scrollY;
  }, []);

  const restoreBodyScroll = useCallback((scrollY: number) => {
    if (typeof window === 'undefined') return;
    
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    window.scrollTo(0, scrollY);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setModalOpen(isOpen);
      const scrollY = preventBodyScroll();
      return () => {
        restoreBodyScroll(scrollY);
        setModalOpen(false);
      };
    }
  }, [isOpen, preventBodyScroll, restoreBodyScroll, setModalOpen]);

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
        
        // CORREÇÃO: Usar categoryId em vez de category
        const matchesCategory = filterCategory === '' || filterCategory === 'ALL' || item.categoryId === filterCategory;

        return matchesSearch && matchesType && matchesCategory;
      })
      .sort((a, b) => {
        if (!sortBy) return 0; // Se não há ordenação, mantém a ordem original
        
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
        
        // CORREÇÃO: Lógica de ordenação mais robusta
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
  };

  const filteredTransactions = filterAndSortTransactions(
    transactions || [],
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

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!user) return;

    if (!confirm('Tem certeza que deseja excluir esta conta?')) return;

    try {
      const result = await transactionService.deleteTransaction(transactionId);
      if (result.success) {
        onTransactionsChange?.();
        await refreshAccounts();
        setSuccess(result.message)
        setError(null)
        const successTimer = setTimeout(() => setSuccess(null), 2000);
        return () => clearTimeout(successTimer);
      } else {
        setError(result.message)
        setSuccess(null)
      }
    } catch (error) {
      console.error('Erro ao excluir transação:', error);
    }
  };

  const handleTransactionSubmit = async (data: any) => {
    if (!user || !selectedDate) return;

    setIsSubmitting(true);

    try {
      const transactionData = {
        ...data,
        userId: user.id,
        year: selectedDate.getFullYear(),
        month: selectedDate.getMonth() + 1,
        day: selectedDate.getDate()
      };

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
        onTransactionsChange?.();
        await refreshAccounts();
        setSuccess(result.message)
        setError(null)
        const successTimer = setTimeout(() => setSuccess(null), 2000);
        return () => clearTimeout(successTimer);
      } else {
        setError(result.message)
        setSuccess(null)
      }
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + parseFloat(t.amount?.toString() || '0'), 0);

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + parseFloat(t.amount?.toString() || '0'), 0);

  const uniqueCategories = Array.from(
    new Map((transactions || [])
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
          <div className={`
            flex items-center justify-between p-4 border-b ${colors.border.primary} 
            flex-shrink-0 sticky top-0 ${colors.bg.modal} z-10
            shadow-sm sm:shadow-none pt-safe
          `}>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="sm:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
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
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddClick}
                icon={<FaPlus size={14} />}
                className="!p-2"
                title="Adicionar nova transação"
              />
              
              <Button
                variant="secondary"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
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
                />
              </>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className={`px-4 py-3 border-b ${colors.border.primary}`}>
                  <SummaryCards
                    totalIncome={totalIncome / 100}
                    totalExpenses={totalExpenses / 100}
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
                  />
                </div>

                <div className="flex-1 overflow-y-auto pb-safe">
                  {isLoading ? (
                    <LoadingSkeleton />
                  ) : (
                    filteredTransactions.length === 0 ? (
                      <EmptyState
                        type="transactions"
                        hasItems={(transactions?.length || 0) > 0}
                        onAddClick={handleAddClick}
                      />
                    ) : (
                      <TransactionsList
                        transactions={transactions}
                        filteredTransactions={filteredTransactions}
                        loading={false}
                        onEdit={handleEditTransaction}
                        onDelete={handleDeleteTransaction}
                        user={user}
                      />
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={`sm:hidden p-4 border-t ${colors.border.primary} ${colors.bg.secondary} flex-shrink-0 pb-safe`}>
            <div className={`flex items-center justify-between text-xs ${colors.text.tertiary}`}>
              <span>Toque em uma transação para editar</span>
              <span>{filteredTransactions.length} transações</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up-mobile {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes bounce-gentle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        .animate-slide-up-mobile {
          animation: slide-up-mobile 0.3s ease-out;
        }
        .animate-bounce-gentle {
          animation: bounce-gentle 2s infinite;
        }
      `}</style>
    </>
  );
}
