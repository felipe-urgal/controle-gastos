"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from "@/app/context/AuthContext";
import { useThemeColors } from '@/app/hook/useThemeColors';
import { DayModalProps, Transaction, Category, Account } from "@/app/types/calendar";
import { TransactionFormModal } from '@/app/components';
import { SummaryCards, FiltersSection, LoadingSkeleton, EmptyState, TransactionsList } from '@/app/components';
import { FaPlus, FaTimes, FaArrowLeft } from 'react-icons/fa';
import { Button } from '@/app/components';
import { useUI } from '@/app/context/UIContext';

export default function DayModal({ 
  isOpen, 
  onClose, 
  selectedDate, 
  transactions, 
  isLoading, 
  onTransactionsChange 
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
  const [filterType, setFilterType] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // const [listLoading, setListLoading] = useState(false);
  // const [listError, setListError] = useState<string | null>(null);
  // const [listSuccess, setListSuccess] = useState<string | null>(null);

  const [transactionFormData, setTransactionFormData] = useState({
    amount: '',
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    status: 'PENDING' as 'PENDING' | 'COMPLETED' | 'CANCELLED',
    description: '',
    categoryId: '',
    accountId: ''
  });

  // Funções para prevenir/restaurar scroll
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

  // Efeito para bloquear scroll
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
    getDate: (item: Transaction) => string,
    getSearchFields: (item: Transaction) => string[]
  ): Transaction[] => {
    return items
      .filter(item => {
        const matchesSearch = getSearchFields(item).some(field =>
          field.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const matchesType = filterType === 'ALL' || item.type === filterType;
        const matchesCategory = filterCategory === 'ALL' || item.categoryId === filterCategory;

        return matchesSearch && matchesType && matchesCategory;
      })
      .sort((a, b) => {
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
          case 'date':
          default:
            aValue = new Date(getDate(a)).getTime();
            bValue = new Date(getDate(b)).getTime();
        }
        return sortOrder === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
      });
  };

  const filteredTransactions = filterAndSortTransactions(
    transactions || [],
    t => t.transactionDate || new Date().toISOString(),
    t => [t.description || '', t.category?.name || '']
  );

  const handleAddClick = () => {
    resetTransactionForm();
    setIsFormModalOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    
    // Funções auxiliares para validar tipos
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

  const handleDeleteTransaction = () => {
    onTransactionsChange?.();
  };

  const handleTransactionSubmit = async (data) => {
    if (!user || !selectedDate) return;

    setIsSubmitting(true);

    try {
      const transactionData = {
        ...data,
        userId: user.id
      };

      const url = '/api/transactions';
      const method = editingTransaction ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTransaction ? 
          { id: editingTransaction.id, ...transactionData } : 
          transactionData
        ),
      });

      if (response.ok) {
        setIsFormModalOpen(false);
        resetTransactionForm();
        onTransactionsChange?.();
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

  // Fechar modal ao pressionar ESC
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

  if (!isOpen) return null;

  return (
    <>
      <div 
        className={`fixed h-full w-full ${colors.bg.overlay} flex items-center justify-center z-55 p-0 sm:p-3 animate-fade-in`}
      >
        <div className={`
          ${colors.bg.modal} rounded-none sm:rounded-3xl shadow-xl w-full h-full 
          sm:max-w-6xl sm:max-h-[90vh] sm:mx-4 overflow-hidden flex flex-col 
          animate-slide-up-mobile sm:animate-slide-up
        `}>
          
          {/* Header */}
          <div className={`
            flex items-center justify-between p-4 border-b ${colors.border.primary} 
            flex-shrink-0 sticky top-0 ${colors.bg.modal} z-10
            shadow-sm sm:shadow-none
          `}>
            <div className="flex items-center gap-3">
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

            <div className="!hidden sm:!inline flex items-center gap-1 sm:gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddClick}
                icon={<FaPlus size={14} />}
                className="!hidden sm:!inline !p-2 sm:!p-2"
                title="Adicionar nova transação"
              >
              </Button>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
                icon={<FaTimes size={16} />}
                className="!p-3 sm:!p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title="Fechar"
              />
            </div>
          </div>

          {/* Conteúdo Principal */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {isFormModalOpen ? (
              <TransactionFormModal
                isOpen={isFormModalOpen}
                onClose={() => {
                  setIsFormModalOpen(false);
                  resetTransactionForm();
                }}
                formData={transactionFormData}
                setFormData={setTransactionFormData}
                editingTransaction={editingTransaction}
                isSubmitting={isSubmitting}
                categories={categories}
                accounts={accounts}
                onSubmit={handleTransactionSubmit}
                selectedDate={selectedDate}
              />
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Resumo */}
                <div className={`px-3 py-3 border-b ${colors.border.primary}`}>
                  <SummaryCards
                    totalIncome={totalIncome / 100}
                    totalExpenses={totalExpenses / 100}
                  />
                </div>

                {/* Filtros */}
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
                  />
                </div>

                {/* Lista de Transações */}
                <div className="flex-1 overflow-y-auto">
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
                        onError={() => {}} // Função vazia em vez de string
                        onSuccess={() => {}}
                        user={user}
                      />
                    )
                  )}
                </div>

                {/* Botão Flutuante para Mobile */}
                <div className="sm:hidden fixed bottom-13 left-3 z-20">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onClose}
                    disabled={isSubmitting}
                    icon={<FaArrowLeft size={16} />}
                    className="!p-3 sm:!p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    title="Voltar"
                  >
                  </Button>
                 </div>

                {!isLoading && (
                  <div className="sm:hidden fixed bottom-13 right-3 z-20">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleAddClick}
                      icon={<FaPlus size={16} />}
                      className="!p-3 shadow-lg rounded-full animate-bounce-gentle"
                      title="Adicionar nova transação"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={`sm:hidden p-3 border-t ${colors.border.primary} ${colors.bg.secondary} flex-shrink-0`}>
            <div className={`flex items-center justify-between text-xs ${colors.text.tertiary}`}>
              <span>Toque em uma transação para editar</span>
              <span>{filteredTransactions.length} transações</span>
            </div>
          </div>
        </div>

        {/* CSS para animações personalizadas */}
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
            animation: slide-up-mobile 0.5s ease-out;
          }
          .animate-bounce-gentle {
            animation: bounce-gentle 2s infinite;
          }
        `}</style>
      </div>
    </>
  );
}