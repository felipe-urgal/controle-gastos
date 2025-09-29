"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from "@/app/context/AuthContext";
import { useTheme } from "@/app/context/ThemeContext"; 
import { DayModalProps, Transaction, Investment, Category, Account } from "@/app/types/calendar";
import { TransactionFormModal, InvestmentFormModal, DeleteConfirmationModal } from '@/app/components';

// Importando componentes novos
import { DayModalHeader, TabNavigation, SummaryCards, FiltersSection, LoadingSkeleton, EmptyState, TransactionsList, InvestmentsList } from '@/app/components';

export default function DayModal({ 
  isOpen, 
  onClose, 
  selectedDate, 
  transactions, 
  investments, 
  isLoading, 
  onTransactionsChange 
}: DayModalProps) {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();

  // Estados principais
  const [activeTab, setActiveTab] = useState<'transactions' | 'investments'>('transactions');
  
  // Estados para transações
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Estados para investimentos
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [isInvestmentFormOpen, setIsInvestmentFormOpen] = useState(false);
  const [isInvestmentDeleteOpen, setIsInvestmentDeleteOpen] = useState(false);
  const [investmentToDelete, setInvestmentToDelete] = useState<Investment | null>(null);
  
  // Estados compartilhados
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'description'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Form data states
  const [transactionFormData, setTransactionFormData] = useState({
    amount: '',
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    description: '',
    categoryId: '',
    accountId: ''
  });

  const [investmentFormData, setInvestmentFormData] = useState({
    amount: '',
    type: 'BUY' as 'BUY' | 'SELL' | 'DIVIDEND',
    description: '',
    ticker: '',
    quantity: '',
    unitPrice: '',
    accountId: ''
  });

  // Efeito para bloquear scroll
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

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
          setAccounts(accountsData.accounts);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if ((isFormModalOpen || isInvestmentFormOpen) && user) {
      fetchCategoriesAndAccounts();
    }
  }, [isFormModalOpen, isInvestmentFormOpen, user, fetchCategoriesAndAccounts]);

  // Reset functions
  const resetTransactionForm = () => {
    setTransactionFormData({
      amount: '',
      type: 'EXPENSE',
      description: '',
      categoryId: '',
      accountId: ''
    });
    setEditingTransaction(null);
  };

  const resetInvestmentForm = () => {
    setInvestmentFormData({
      amount: '',
      type: 'BUY',
      description: '',
      ticker: '',
      quantity: '',
      unitPrice: '',
      accountId: ''
    });
    setEditingInvestment(null);
  };

  // Filtering and sorting logic
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
            aValue = parseFloat(a.amount);
            bValue = parseFloat(b.amount);
            break;
          case 'description':
            aValue = a.description.toLowerCase();
            bValue = b.description.toLowerCase();
            break;
          case 'date':
          default:
            aValue = new Date(getDate(a)).getTime();
            bValue = new Date(getDate(b)).getTime();
        }
        return sortOrder === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
      });
  };

  const filterAndSortInvestments = (
    items: Investment[],
    getDate: (item: Investment) => string,
    getSearchFields: (item: Investment) => string[]
  ): Investment[] => {
    return items
      .filter(item => {
        const matchesSearch = getSearchFields(item).some(field =>
          field.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const matchesType =
          filterType === 'ALL' ||
          item.type === 'DIVIDEND'||
          (item.type === 'BUY' || item.type === 'SELL');

        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        let aValue: string | number, bValue: string | number;
        switch (sortBy) {
          case 'amount':
            aValue = parseFloat(a.amount);
            bValue = parseFloat(b.amount);
            break;
          case 'description':
            aValue = a.description.toLowerCase();
            bValue = b.description.toLowerCase();
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
    transactions,
    t => t.transactionDate,
    t => [t.description, t.category?.name || '']
  );

  const filteredInvestments = filterAndSortInvestments(
    investments,
    i => i.investmentDate,
    i => [i.description, i.ticker || '']
  );

  // Event handlers
  const handleAddClick = () => {
    resetTransactionForm();
    setIsFormModalOpen(true);
  };

  const handleAddInvestmentClick = () => {
    resetInvestmentForm();
    setIsInvestmentFormOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTransactionFormData({
      amount: transaction.amount,
      type: transaction.type,
      description: transaction.description,
      categoryId: transaction.categoryId || '',
      accountId: transaction.accountId || ''
    });
    setIsFormModalOpen(true);
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteModalOpen(true);
  };

  const handleEditInvestment = (investment: Investment) => {
    setEditingInvestment(investment);
    setInvestmentFormData({
      amount: investment.amount,
      type: investment.type,
      description: investment.description,
      ticker: investment.ticker || '',
      quantity: investment.quantity?.toString() || '',
      unitPrice: investment.unitPrice || '',
      accountId: investment.accountId || ''
    });
    setIsInvestmentFormOpen(true);
  };

  const handleDeleteInvestment = (investment: Investment) => {
    setInvestmentToDelete(investment);
    setIsInvestmentDeleteOpen(true);
  };

  // API calls
  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedDate) return;

    setIsSubmitting(true);

    try {
      const transactionData = {
        ...transactionFormData,
        amount: parseFloat(
          transactionFormData.amount
            .replace('R$', '')
            .replace(/\./g, '')
            .replace(',', '.')
            .trim()
        ) || 0,
        transactionDate: selectedDate.toISOString(),
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
        onTransactionsChange();
      }
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvestmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedDate) return;

    setIsSubmitting(true);

    try {
      const investmentData = {
        ...investmentFormData,
        amount: parseFloat(investmentFormData.amount),
        quantity: investmentFormData.quantity ? parseFloat(investmentFormData.quantity) : null,
        unitPrice: investmentFormData.unitPrice ? parseFloat(investmentFormData.unitPrice) : null,
        investmentDate: selectedDate.toISOString(),
        userId: user.id
      };

      const url = '/api/investments';
      const method = editingInvestment ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingInvestment ? 
          { id: editingInvestment.id, ...investmentData } : 
          investmentData
        ),
      });

      if (response.ok) {
        setIsInvestmentFormOpen(false);
        resetInvestmentForm();
        onTransactionsChange();
      }
    } catch (error) {
      console.error('Erro ao salvar investimento:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmTransactionDelete = async () => {
    if (!transactionToDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch('/api/transactions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: transactionToDelete.id }),
      });

      if (response.ok) {
        onTransactionsChange();
      }
    } catch (error) {
      console.error('Erro ao deletar transação:', error);
    } finally {
      setIsDeleteModalOpen(false);
      setTransactionToDelete(null);
      setIsDeleting(false);
    }
  };

  const confirmInvestmentDelete = async () => {
    if (!investmentToDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch('/api/investments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: investmentToDelete.id }),
      });

      if (response.ok) {
        onTransactionsChange();
      }
    } catch (error) {
      console.error('Erro ao deletar investimento:', error);
    } finally {
      setIsInvestmentDeleteOpen(false);
      setInvestmentToDelete(null);
      setIsDeleting(false);
    }
  };

  // Calculations
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const totalBuys = investments
    .filter(i => i.type === 'BUY')
    .reduce((sum, i) => sum + parseFloat(i.amount), 0);

  const totalSells = investments
    .filter(i => i.type === 'SELL')
    .reduce((sum, i) => sum + parseFloat(i.amount), 0);

  const totalDividends = investments
    .filter(i => i.type === 'DIVIDEND')
    .reduce((sum, i) => sum + parseFloat(i.amount), 0);

  const netInvestment = totalBuys - totalSells;

  const uniqueCategories = Array.from(
    new Map(transactions
      .filter(t => t.category)
      .map(t => [t.category!.id, t.category!])
    ).values()
  );

  if (!isOpen) return null;

  const getThemeColors = () => {
    return resolvedTheme === 'dark' 
      ? {
          bg: 'bg-gray-900',
          modalBg: 'bg-gray-900',
        }
      : {
          bg: 'bg-white',
          modalBg: 'bg-white',
        };
  };

  const colors = getThemeColors();

  return (
    <>
      <div className="fixed inset-0 bg-black/80 bg-opacity-50 flex items-center justify-center z-50 px-2 py-3">
        <div className={`${colors.modalBg} rounded-3xl shadow-xl w-full h-full sm:max-w-6xl sm:max-h-[90vh] sm:mx-4 overflow-hidden flex flex-col`}>
          <DayModalHeader
            activeTab={activeTab}
            selectedDate={selectedDate!}
            transactionsCount={filteredTransactions.length}
            investmentsCount={filteredInvestments.length}
            onClose={onClose}
            onAddClick={activeTab === 'transactions' ? handleAddClick : handleAddInvestmentClick}
          />

          <div className="p-4 border-b">
            <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
            
            <SummaryCards
              activeTab={activeTab}
              totalIncome={totalIncome}
              totalExpenses={totalExpenses}
              totalBuys={totalBuys}
              totalSells={totalSells}
              totalDividends={totalDividends}
              netInvestment={netInvestment}
            />
          </div>

          <FiltersSection
            activeTab={activeTab}
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

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <LoadingSkeleton />
            ) : activeTab === 'transactions' ? (
              filteredTransactions.length === 0 ? (
                <EmptyState
                  type="transactions"
                  hasItems={transactions.length > 0}
                  onAddClick={handleAddClick}
                />
              ) : (
                <TransactionsList
                  transactions={filteredTransactions}
                  onEdit={handleEditTransaction}
                  onDelete={handleDeleteTransaction}
                  user={user}
                />
              )
            ) : (
              filteredInvestments.length === 0 ? (
                <EmptyState
                  type="investments"
                  hasItems={investments.length > 0}
                  onAddClick={handleAddInvestmentClick}
                />
              ) : (
                <InvestmentsList
                  investments={filteredInvestments}
                  onEdit={handleEditInvestment}
                  onDelete={handleDeleteInvestment}
                  user={user}
                />
              )
            )}
          </div>
        </div>
      </div>

      {/* Modais */}
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

      <InvestmentFormModal
        isOpen={isInvestmentFormOpen}
        onClose={() => {
          setIsInvestmentFormOpen(false);
          resetInvestmentForm();
        }}
        formData={investmentFormData}
        setFormData={setInvestmentFormData}
        editingInvestment={editingInvestment}
        isSubmitting={isSubmitting}
        accounts={accounts}
        onSubmit={handleInvestmentSubmit}
        selectedDate={selectedDate}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmTransactionDelete}
        itemName={transactionToDelete?.description || ''}
        itemType="transação"
        isDeleting={isDeleting}
      />

      <DeleteConfirmationModal
        isOpen={isInvestmentDeleteOpen}
        onClose={() => setIsInvestmentDeleteOpen(false)}
        onConfirm={confirmInvestmentDelete}
        itemName={investmentToDelete?.description || ''}
        itemType="investimento"
        isDeleting={isDeleting}
      />
    </>
  );
}