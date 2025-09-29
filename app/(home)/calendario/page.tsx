"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from "@/app/context/AuthContext";
import { useTheme } from "@/app/context/ThemeContext"; 
import { HiArrowUp, HiArrowDown, HiCurrencyDollar, HiTrendingUp, HiGift, HiChevronLeft, HiChevronRight, HiX, HiPlus, HiPencil, HiTrash, HiFilter, HiSearch } from "react-icons/hi";

interface Transaction {
  id: string;
  amount: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  transactionDate: string;
  category?: {
    id: string;
    name: string;
  };
  account?: {
    id: string;
    name: string;
    currency: string;
  };
  categoryId?: string;
  accountId?: string;
  userId?: string;
}

interface Category {
  id: string;
  name: string;
}

interface Account {
  id: string;
  name: string;
  currency: string;
}

interface Investment {
  id: string;
  amount: string;
  type: 'BUY' | 'SELL' | 'DIVIDEND';
  description: string;
  investmentDate: string;
  ticker?: string;
  quantity?: number;
  unitPrice?: string;
  account?: {
    id: string;
    name: string;
    currency: string;
  };
  accountId?: string;
  userId?: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  income: number;
  expenses: number;
  transactions: Transaction[];
  investments: Investment[]; // Adicionar investimentos
}

interface DayModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  transactions: Transaction[];
  investments: Investment[]; // Adicionar investimentos
  isLoading: boolean;
  onTransactionsChange: () => void;
}

function MonthlySummarySkeleton() {
  const { resolvedTheme } = useTheme();
  
  const bgColor = resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100';
  const borderColor = resolvedTheme === 'dark' ? 'border-gray-700' : 'border-gray-200';
  const skeletonColor = resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-300';

  return (
    <div className="mt-4">
      {/* Versão Desktop */}
      <div className="hidden sm:grid grid-cols-3 gap-4 max-w-md">
        {[...Array(3)].map((_, index) => (
          <div key={index} className={`p-3 rounded-lg border ${borderColor} ${bgColor}`}>
            <div className={`h-4 ${skeletonColor} rounded mb-2 w-3/4`}></div>
            <div className={`h-6 ${skeletonColor} rounded w-full`}></div>
          </div>
        ))}
      </div>
      
      {/* Versão Mobile */}
      <div className="sm:hidden grid grid-cols-2 gap-2">
        {[...Array(4)].map((_, index) => (
          <div key={index} className={`p-2 rounded-lg border ${borderColor} ${bgColor}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <div className={`h-3 w-3 ${skeletonColor} rounded`}></div>
                <div className={`h-3 ${skeletonColor} rounded w-12`}></div>
              </div>
              <div className={`h-4 ${skeletonColor} rounded w-16`}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarDaysSkeleton() {
  const { resolvedTheme } = useTheme();
  
  const bgColor = resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const borderColor = resolvedTheme === 'dark' ? 'border-gray-700' : 'border-gray-100';
  const skeletonColor = resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-300';
  const skeletonLightColor = resolvedTheme === 'dark' ? 'bg-gray-600' : 'bg-gray-200';
  
  return (
    <div className={`grid grid-cols-7 gap-px ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
      {[...Array(42)].map((_, index) => (
        <div
          key={index}
          className={`min-h-[60px] sm:min-h-[120px] p-1 sm:p-2 border ${borderColor} ${bgColor}`}
        >
          {/* Número do dia */}
          <div className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full ${skeletonColor} mb-1 sm:mb-2 mx-auto`}></div>
          
          {/* Conteúdo do dia - Desktop */}
          <div className="hidden sm:block space-y-1">
            <div className={`h-3 ${skeletonLightColor} rounded`}></div>
            <div className={`h-3 ${skeletonLightColor} rounded`}></div>
            <div className={`h-3 ${skeletonLightColor} rounded mt-2`}></div>
          </div>
          
          {/* Conteúdo do dia - Mobile (simplificado) */}
          <div className="sm:hidden flex justify-center space-x-1">
            <div className={`h-2 w-2 ${skeletonLightColor} rounded-full`}></div>
            <div className={`h-2 w-2 ${skeletonLightColor} rounded-full`}></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Modal para exibir transações do dia - MELHORADO
function DayModal({ isOpen, onClose, selectedDate, transactions, investments, isLoading, onTransactionsChange }: DayModalProps) {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [formData, setFormData] = useState({
    amount: '',
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    description: '',
    categoryId: '',
    accountId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados para investimentos
  const [activeTab, setActiveTab] = useState<'transactions' | 'investments'>('transactions');
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [isInvestmentFormOpen, setIsInvestmentFormOpen] = useState(false);
  const [isInvestmentDeleteOpen, setIsInvestmentDeleteOpen] = useState(false);
  const [investmentToDelete, setInvestmentToDelete] = useState<Investment | null>(null);
  const [investmentFormData, setInvestmentFormData] = useState({
    amount: '',
    type: 'BUY' as 'BUY' | 'SELL' | 'DIVIDEND',
    description: '',
    ticker: '',
    quantity: '',
    unitPrice: '',
    accountId: ''
  });

  // Estados para filtros mobile
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'description'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

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
      // Buscar categorias
      const categoriesResponse = await fetch(`/api/category/all?userId=${user?.id}`);
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        if (categoriesData.success) {
          setCategories(categoriesData.categorias);
        }
      }

      // Buscar contas
      const accountsResponse = await fetch(`/api/account/all?userId=${user?.id}`);
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        if (accountsData.success) {
          setAccounts(accountsData.accounts);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    }
  }, [user?.id]); // Adicionar dependência

  useEffect(() => {
    if ((isFormModalOpen || isInvestmentFormOpen) && user) {
      fetchCategoriesAndAccounts();
    }
  }, [isFormModalOpen, isInvestmentFormOpen, user, fetchCategoriesAndAccounts]);

  const resetForm = () => {
    setFormData({
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

  // Filtrar e ordenar transações
  const filteredTransactions = transactions
    .filter(transaction => {
      const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           transaction.category?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'ALL' || transaction.type === filterType;
      const matchesCategory = filterCategory === 'ALL' || transaction.categoryId === filterCategory;
      
      return matchesSearch && matchesType && matchesCategory;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
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
          aValue = new Date(a.transactionDate).getTime();
          bValue = new Date(b.transactionDate).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Filtrar e ordenar investimentos
  const filteredInvestments = investments
    .filter(investment => {
      const matchesSearch = investment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           investment.ticker?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'ALL' || 
                         (filterType === 'INCOME' && investment.type === 'DIVIDEND') ||
                         (filterType === 'EXPENSE' && (investment.type === 'BUY' || investment.type === 'SELL'));
      
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
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
          aValue = new Date(a.investmentDate).getTime();
          bValue = new Date(b.investmentDate).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Funções para transações (mantidas iguais)
  const handleAddClick = () => {
    resetForm();
    setIsFormModalOpen(true);
  };

  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      amount: transaction.amount,
      type: transaction.type,
      description: transaction.description,
      categoryId: transaction.categoryId || '',
      accountId: transaction.accountId || ''
    });
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedDate) return;

    setIsSubmitting(true);

    try {
      const transactionData = {
        ...formData,
        amount: parseFloat(formData.amount),
        transactionDate: selectedDate.toISOString(),
        userId: user.id
      };

      const url = '/api/transactions';
      const method = editingTransaction ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingTransaction ? 
          { id: editingTransaction.id, ...transactionData } : 
          transactionData
        ),
      });

      if (response.ok) {
        setIsFormModalOpen(false);
        resetForm();
        onTransactionsChange();
      }
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!transactionToDelete) return;

    try {
      const response = await fetch('/api/transactions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
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
    }
  };

  // Funções para investimentos (mantidas iguais)
  const handleAddInvestmentClick = () => {
    resetInvestmentForm();
    setIsInvestmentFormOpen(true);
  };

  const handleEditInvestmentClick = (investment: Investment) => {
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

  const handleDeleteInvestmentClick = (investment: Investment) => {
    setInvestmentToDelete(investment);
    setIsInvestmentDeleteOpen(true);
  };

  const handleInvestmentFormSubmit = async (e: React.FormEvent) => {
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingInvestment ? 
          { id: editingInvestment.id, ...investmentData } : 
          investmentData
        ),
      });

      if (response.ok) {
        setIsInvestmentFormOpen(false);
        onTransactionsChange();
      }
    } catch (error) {
      console.error('Erro ao salvar investimento:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmInvestmentDelete = async () => {
    if (!investmentToDelete) return;

    try {
      const response = await fetch('/api/investments', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
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
    }
  };

  // const toggleSort = (field: 'date' | 'amount' | 'description') => {
  //   if (sortBy === field) {
  //     setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  //   } else {
  //     setSortBy(field);
  //     setSortOrder('desc');
  //   }
  // };

  if (!isOpen) return null;

  const formatCurrency = (amount: string, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(parseFloat(amount));
  };

  // Calcular totais para transações
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  // Calcular totais para investimentos
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

  const getThemeColors = () => {
    if (resolvedTheme === 'dark') {
      return {
        bg: 'bg-gray-900',
        bgSecondary: 'bg-gray-800',
        bgTertiary: 'bg-gray-700',
        text: 'text-gray-100',
        textSecondary: 'text-gray-300',
        textTertiary: 'text-gray-400',
        border: 'border-gray-700',
        borderSecondary: 'border-gray-600',
        hover: 'hover:bg-gray-800',
        inputBg: 'bg-gray-800',
        inputBorder: 'border-gray-600',
        modalBg: 'bg-gray-900',
        headerBg: 'bg-gray-800',
      };
    }
    
    return {
      bg: 'bg-white',
      bgSecondary: 'bg-gray-50',
      bgTertiary: 'bg-gray-100',
      text: 'text-gray-800',
      textSecondary: 'text-gray-600',
      textTertiary: 'text-gray-500',
      border: 'border-gray-200',
      borderSecondary: 'border-gray-300',
      hover: 'hover:bg-gray-50',
      inputBg: 'bg-white',
      inputBorder: 'border-gray-300',
      modalBg: 'bg-white',
      headerBg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
    };
  };

  const colors = getThemeColors();

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'INCOME': return 'text-green-600';
      case 'EXPENSE': return 'text-red-600';
      case 'BUY': return 'text-blue-600';
      case 'SELL': return 'text-orange-600';
      case 'DIVIDEND': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getTypeBgColor = (type: string) => {
    switch (type) {
      case 'INCOME': return 'bg-green-100 text-green-800';
      case 'EXPENSE': return 'bg-red-100 text-red-800';
      case 'BUY': return 'bg-blue-100 text-blue-800';
      case 'SELL': return 'bg-orange-100 text-orange-800';
      case 'DIVIDEND': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderTransactionsList = () => (
    <div className="flex-1 overflow-y-auto">
      {isLoading ? (
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, index) => (
            <div key={index} className={`flex items-center justify-between p-3 border rounded-lg ${colors.border} ${colors.bgSecondary}`}>
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${resolvedTheme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                <div className="space-y-1">
                  <div className={`h-3 ${resolvedTheme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'} rounded w-24 sm:w-32`}></div>
                  <div className={`h-2 ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded w-16 sm:w-24`}></div>
                </div>
              </div>
              <div className="space-y-1">
                <div className={`h-3 ${resolvedTheme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'} rounded w-12 sm:w-20`}></div>
                <div className={`h-2 ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded w-10 sm:w-16`}></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div className={`w-16 h-16 ${colors.bgSecondary} rounded-full flex items-center justify-center mb-3`}>
            <HiSearch className={`w-8 h-8 ${resolvedTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
          </div>
          <h4 className={`text-base font-semibold ${colors.textSecondary} mb-1`}>
            {transactions.length === 0 ? 'Nenhuma transação' : 'Nenhuma transação encontrada'}
          </h4>
          <p className={`text-sm ${colors.textTertiary} mb-3`}>
            {transactions.length === 0 
              ? 'Adicione uma nova transação'
              : 'Ajuste os filtros'
            }
          </p>
          {transactions.length === 0 && (
            <button
              onClick={handleAddClick}
              className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors text-sm"
            >
              Criar Transação
            </button>
          )}
        </div>
      ) : (
        <div className="p-2 sm:p-4">
          {filteredTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className={`flex items-center justify-between p-3 border-b last:border-b-0 ${colors.border} ${colors.hover} transition-all duration-200 group`}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  transaction.type === 'INCOME' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className={`font-semibold ${colors.text} text-sm truncate`}>{transaction.description}</p>
                    <p className={`text-base font-bold ${getTypeColor(transaction.type)} flex-shrink-0 ml-2`}>
                      {transaction.type === 'INCOME' ? '+' : '-'}{' '}
                      {formatCurrency(transaction.amount, transaction.account?.currency)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500">
                    <span className={`${resolvedTheme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} px-1.5 py-0.5 rounded`}>
                      {transaction.category?.name || 'Sem categoria'}
                    </span>
                    <span className="truncate">{transaction.account?.name}</span>
                    <span>
                      {new Date(transaction.transactionDate).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
                <button
                  onClick={() => handleEditClick(transaction)}
                  className={`p-1.5 text-blue-500 ${resolvedTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-blue-50'} rounded transition-colors`}
                  title="Editar transação"
                >
                  <HiPencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteClick(transaction)}
                  className={`p-1.5 text-red-500 ${resolvedTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-red-50'} rounded transition-colors`}
                  title="Excluir transação"
                >
                  <HiTrash className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderInvestmentsList = () => (
    <div className="flex-1 overflow-y-auto">
      {isLoading ? (
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, index) => (
            <div key={index} className={`flex items-center justify-between p-3 border rounded-lg ${colors.border} ${colors.bgSecondary}`}>
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${resolvedTheme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                <div className="space-y-1">
                  <div className={`h-3 ${resolvedTheme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'} rounded w-24 sm:w-32`}></div>
                  <div className={`h-2 ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded w-16 sm:w-24`}></div>
                </div>
              </div>
              <div className="space-y-1">
                <div className={`h-3 ${resolvedTheme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'} rounded w-12 sm:w-20`}></div>
                <div className={`h-2 ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded w-10 sm:w-16`}></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredInvestments.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div className={`w-16 h-16 ${colors.bgSecondary} rounded-full flex items-center justify-center mb-3`}>
            <HiSearch className={`w-8 h-8 ${resolvedTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
          </div>
          <h4 className={`text-base font-semibold ${colors.textSecondary} mb-1`}>
            {investments.length === 0 ? 'Nenhum investimento' : 'Nenhum investimento encontrado'}
          </h4>
          <p className={`text-sm ${colors.textTertiary} mb-3`}>
            {investments.length === 0 
              ? 'Adicione um novo investimento'
              : 'Ajuste os filtros'
            }
          </p>
          {investments.length === 0 && (
            <button
              onClick={handleAddInvestmentClick}
              className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors text-sm"
            >
              Criar Investimento
            </button>
          )}
        </div>
      ) : (
        <div className="p-2 sm:p-4">
          {filteredInvestments.map((investment) => (
            <div
              key={investment.id}
              className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-gray-50 transition-all duration-200 group"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  investment.type === 'BUY' ? 'bg-blue-500' : 
                  investment.type === 'SELL' ? 'bg-orange-500' : 'bg-purple-500'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="min-w-0">
                      <p className={`font-semibold ${colors.text} text-sm truncate`}>{investment.description}</p>
                      {investment.ticker && (
                        <span className={`${resolvedTheme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} px-1.5 py-0.5 rounded`}>({investment.ticker})</span>
                      )}
                    </div>
                    <p className={`text-base font-bold ${getTypeColor(investment.type)} flex-shrink-0 ml-2`}>
                      {investment.type === 'SELL' ? '+' : '-'}{' '}
                      {formatCurrency(investment.amount, investment.account?.currency)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500">
                    <span className={`px-1.5 py-0.5 rounded ${getTypeBgColor(investment.type)}`}>
                      {investment.type === 'BUY' ? 'Compra' : 
                       investment.type === 'SELL' ? 'Venda' : 'Dividendo'}
                    </span>
                    {investment.quantity && investment.unitPrice && (
                      <span>{investment.quantity} × {formatCurrency(investment.unitPrice)}</span>
                    )}
                    <span className="truncate">{investment.account?.name}</span>
                    <span>
                      {new Date(investment.investmentDate).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
                <button
                  onClick={() => handleEditInvestmentClick(investment)}
                  className={`p-1.5 text-blue-500 ${resolvedTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-blue-50'} rounded transition-colors`}
                  title="Editar investimento"
                >
                  <HiPencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteInvestmentClick(investment)}
                  className={`p-1.5 text-red-500 ${resolvedTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-red-50'} rounded transition-colors`}
                  title="Excluir investimento"
                >
                  <HiTrash className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>  
  );

  return (
    <>
      {/* Modal Principal - ATUALIZADO COM TEMA */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-4">
        <div className={`${colors.modalBg} rounded-3xl shadow-xl w-full h-full sm:max-w-6xl sm:max-h-[90vh] sm:mx-4 overflow-hidden flex flex-col`}>
          {/* Cabeçalho Mobile Optimized */}
          <div className={`p-4 border-b ${resolvedTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-gray-200'}`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1 min-w-0">
                <h3 className={`text-lg font-bold ${colors.text} truncate`}>
                  {activeTab === 'transactions' ? 'Transações' : 'Investimentos'} - {selectedDate?.toLocaleDateString('pt-BR', { 
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </h3>
                <p className={`text-sm ${colors.textSecondary} mt-1`}>
                  {activeTab === 'transactions' 
                    ? `${filteredTransactions.length} transação${filteredTransactions.length !== 1 ? 's' : ''}`
                    : `${filteredInvestments.length} investimento${filteredInvestments.length !== 1 ? 's' : ''}`
                  }
                </p>
              </div>
              <div className="flex items-center space-x-2 ml-2">
                <button
                  onClick={activeTab === 'transactions' ? handleAddClick : handleAddInvestmentClick}
                  className="flex items-center space-x-1 p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-all text-sm"
                  title={`Novo ${activeTab === 'transactions' ? 'Transação' : 'Investimento'}`}
                >
                  <HiPlus className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className={`p-2 ${resolvedTheme === 'dark' ? 'text-gray-400 hover:text-gray-200 bg-gray-700' : 'text-gray-500 hover:text-gray-700 bg-gray-300'} rounded-full transition-colors`}
                >
                  <HiX className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Abas Mobile */}
            <div className={`flex space-x-1 ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-white'} rounded-full p-1 shadow-inner`}>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`flex-1 py-2 px-2 rounded-full transition-colors text-sm ${
                  activeTab === 'transactions'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : `${colors.textSecondary} hover:${colors.text}`
                }`}
              >
                Transações
              </button>
              <button
                onClick={() => setActiveTab('investments')}
                className={`flex-1 py-2 px-2 rounded-full transition-colors text-sm ${
                  activeTab === 'investments'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : `${colors.textSecondary} hover:${colors.text}`
                }`}
              >
                Investimentos
              </button>
            </div>
            
            {/* Resumo Mobile - ATUALIZADO COM TEMA */}
            {activeTab === 'transactions' ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className={`${resolvedTheme === 'dark' ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} py-1 rounded-full text-center border`}>
                  <p className={`text-xs ${resolvedTheme === 'dark' ? 'text-green-400' : 'text-green-600'} font-semibold`}>Receitas</p>
                  <p className={`text-sm font-bold ${resolvedTheme === 'dark' ? 'text-green-300' : 'text-green-700'} truncate`}>
                    {formatCurrency(totalIncome.toString())}
                  </p>
                </div>
                <div className={`${resolvedTheme === 'dark' ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} py-1 rounded-full text-center border`}>
                  <p className={`text-xs ${resolvedTheme === 'dark' ? 'text-red-400' : 'text-red-600'} font-semibold`}>Despesas</p>
                  <p className={`text-sm font-bold ${resolvedTheme === 'dark' ? 'text-red-300' : 'text-red-700'} truncate`}>
                    {formatCurrency(totalExpenses.toString())}
                  </p>
                </div>
                <div className={`py-1 rounded-full text-center border col-span-2 ${
                  totalIncome - totalExpenses >= 0 
                    ? `${resolvedTheme === 'dark' ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}` 
                    : `${resolvedTheme === 'dark' ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200'}`
                }`}>
                  <p className={`text-xs font-semibold ${colors.textSecondary}`}>Saldo do dia</p>
                  <p className={`text-sm font-bold ${
                    totalIncome - totalExpenses >= 0 
                      ? `${resolvedTheme === 'dark' ? 'text-blue-300' : 'text-blue-700'}` 
                      : `${resolvedTheme === 'dark' ? 'text-orange-300' : 'text-orange-700'}`
                  }`}>
                    {formatCurrency((totalIncome - totalExpenses).toString())}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className={`${resolvedTheme === 'dark' ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} py-1 rounded-full text-center border`}>
                  <p className={`text-xs ${resolvedTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'} font-semibold`}>Compras</p>
                  <p className={`text-sm font-bold ${resolvedTheme === 'dark' ? 'text-blue-300' : 'text-blue-700'} truncate`}>
                    {formatCurrency(totalBuys.toString())}
                  </p>
                </div>
                <div className={`${resolvedTheme === 'dark' ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200'} py-1 rounded-full text-center border`}>
                  <p className={`text-xs ${resolvedTheme === 'dark' ? 'text-orange-400' : 'text-orange-600'} font-semibold`}>Vendas</p>
                  <p className={`text-sm font-bold ${resolvedTheme === 'dark' ? 'text-orange-300' : 'text-orange-700'} truncate`}>
                    {formatCurrency(totalSells.toString())}
                  </p>
                </div>
                <div className={`${resolvedTheme === 'dark' ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200'} py-1 rounded-full text-center border`}>
                  <p className={`text-xs ${resolvedTheme === 'dark' ? 'text-purple-400' : 'text-purple-600'} font-semibold`}>Dividendos</p>
                  <p className={`text-sm font-bold ${resolvedTheme === 'dark' ? 'text-purple-300' : 'text-purple-700'} truncate`}>
                    {formatCurrency(totalDividends.toString())}
                  </p>
                </div>
                <div className={`py-1 rounded-full text-center border ${
                  netInvestment >= 0 
                    ? `${resolvedTheme === 'dark' ? 'bg-indigo-900/20 border-indigo-800' : 'bg-indigo-50 border-indigo-200'}` 
                    : `${resolvedTheme === 'dark' ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`
                }`}>
                  <p className={`text-xs font-semibold ${colors.textSecondary}`}>Líquido</p>
                  <p className={`text-sm font-bold ${
                    netInvestment >= 0 
                      ? `${resolvedTheme === 'dark' ? 'text-indigo-300' : 'text-indigo-700'}` 
                      : `${resolvedTheme === 'dark' ? 'text-red-300' : 'text-red-700'}`
                  }`}>
                    {formatCurrency(netInvestment.toString())}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Filtros Mobile Optimized - ATUALIZADO COM TEMA */}
          <div className={`p-3 border-b ${resolvedTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex flex-col gap-3">
              {/* Busca e Botão Filtros */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <HiSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-400'} w-4 h-4`} />
                  <input
                    type="text"
                    placeholder={`Buscar...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border ${colors.inputBorder} ${colors.text} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${colors.inputBg}`}
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 border ${colors.inputBorder} rounded-lg ${colors.hover} transition-colors`}
                >
                  <HiFilter className={`w-4 h-4 ${colors.textSecondary}`} />
                </button>
              </div>

              {/* Filtros Expandíveis */}
              {showFilters && (
                <div className={`grid grid-cols-2 gap-2 p-3 ${colors.bgSecondary} rounded-lg border ${colors.border}`}>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className={`w-full p-2 ${colors.text} border ${colors.inputBorder} rounded text-sm ${colors.inputBg}`}
                  >
                    <option value="ALL">Todos os tipos</option>
                    {activeTab === 'transactions' ? (
                      <>
                        <option value="INCOME">Receitas</option>
                        <option value="EXPENSE">Despesas</option>
                      </>
                    ) : (
                      <>
                        <option value="BUY">Compras</option>
                        <option value="SELL">Vendas</option>
                        <option value="DIVIDEND">Dividendos</option>
                      </>
                    )}
                  </select>

                  {activeTab === 'transactions' && (
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className={`w-full ${colors.text} p-2 border ${colors.inputBorder} rounded text-sm ${colors.inputBg}`}
                    >
                      <option value="ALL">Todas categorias</option>
                      {uniqueCategories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('-');
                      setSortBy(field as any);
                      setSortOrder(order as any);
                    }}
                    className={`w-full ${colors.text} p-2 border ${colors.inputBorder} rounded text-sm col-span-2 ${colors.inputBg}`}
                  >
                    <option value="description-asc">Descrição (A-Z)</option>
                    <option value="description-desc">Descrição (Z-A)</option>
                    <option value="amount-desc">Valor (maior)</option>
                    <option value="amount-asc">Valor (menor)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Conteúdo */}
          {activeTab === 'transactions' ? renderTransactionsList() : renderInvestmentsList()}
        </div>
      </div>

      {/* Modais de Formulário (Mobile Optimized) - ATUALIZADOS COM TEMA */}
      {isFormModalOpen && (
        <TransactionFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            resetForm();
          }}
          formData={formData}
          setFormData={setFormData}
          editingTransaction={editingTransaction}
          isSubmitting={isSubmitting}
          categories={categories}
          accounts={accounts}
          onSubmit={handleFormSubmit}
          selectedDate={selectedDate}
        />
      )}

      {isInvestmentFormOpen && (
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
          onSubmit={handleInvestmentFormSubmit}
          selectedDate={selectedDate}
        />
      )}

      {/* Modais de Confirmação (Mobile Optimized) */}
      {isDeleteModalOpen && (
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          itemName={transactionToDelete?.description || ''}
          itemType="transação"
        />
      )}

      {isInvestmentDeleteOpen && (
        <DeleteConfirmationModal
          isOpen={isInvestmentDeleteOpen}
          onClose={() => setIsInvestmentDeleteOpen(false)}
          onConfirm={confirmInvestmentDelete}
          itemName={investmentToDelete?.description || ''}
          itemType="investimento"
        />
      )}
    </>
  );
}

// Componentes modais auxiliares MOBILE OPTIMIZED
const TransactionFormModal = ({ isOpen, onClose, formData, setFormData, editingTransaction, isSubmitting, categories, accounts, onSubmit }: any) => {
  const { resolvedTheme } = useTheme();
  
  const colors = {
    bg: resolvedTheme === 'dark' ? 'bg-gray-900' : 'bg-white',
    text: resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-800',
    textSecondary: resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600',
    border: resolvedTheme === 'dark' ? 'border-gray-700' : 'border-gray-300',
    inputBg: resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white',
    buttonBg: resolvedTheme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-300 hover:bg-gray-400',
  };

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-60 p-4">
      <div className={`${colors.bg} rounded-lg p-4 w-full max-w-sm mx-auto shadow-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-4">
          <h4 className={`text-lg font-bold ${colors.text}`}>
            {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
          </h4>
          <button 
            onClick={onClose} 
            className={`${colors.textSecondary} hover:${colors.text} p-1 rounded-full ${resolvedTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            type="button"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className={`block text-sm font-medium ${colors.textSecondary} mb-1`}>
                Tipo *
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, type: 'EXPENSE'})}
                  className={`flex-1 py-2 px-2 rounded-full border transition-colors text-sm ${
                    formData.type === 'EXPENSE' 
                      ? 'bg-red-500 text-white border-red-500' 
                      : `${colors.inputBg} ${colors.text} ${colors.border} ${resolvedTheme === 'dark' ? 'hover:border-red-400' : 'hover:border-red-300'}`
                  }`}
                >
                  Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, type: 'INCOME'})}
                  className={`flex-1 py-2 px-2 rounded-full border transition-colors text-sm ${
                    formData.type === 'INCOME' 
                      ? 'bg-green-500 text-white border-green-500' 
                      : `${colors.inputBg} ${colors.text} ${colors.border} ${resolvedTheme === 'dark' ? 'hover:border-green-400' : 'hover:border-green-300'}`
                  }`}
                >
                  Receita
                </button>
              </div>
            </div>

            <div className="col-span-2">
              <label className={`block text-sm font-medium ${colors.textSecondary} mb-1`}>
                Valor *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className={`w-full p-2 border ${colors.border} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${colors.inputBg} ${colors.text}`}
                placeholder="0,00"
                required
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium ${colors.textSecondary} mb-1`}>
              Descrição *
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className={`w-full p-2 border ${colors.border} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${colors.inputBg} ${colors.text}`}
              placeholder="Descrição"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`block text-sm font-medium ${colors.textSecondary} mb-1`}>
                Categoria
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                className={`w-full p-2 border ${colors.border} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${colors.inputBg} ${colors.text}`}
              >
                <option value="">Selecione</option>
                {categories.map((category: Category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium ${colors.textSecondary} mb-1`}>
                Conta *
              </label>
              <select
                value={formData.accountId}
                onChange={(e) => setFormData({...formData, accountId: e.target.value})}
                className={`w-full p-2 border ${colors.border} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${colors.inputBg} ${colors.text}`}
                required
              >
                <option value="">Selecione</option>
                {accounts.map((account: Account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 ${colors.textSecondary} hover:${colors.text} rounded-full transition-colors text-sm font-medium`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm font-medium"
            >
              {isSubmitting ? 'Salvando...' : editingTransaction ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const InvestmentFormModal = ({ isOpen, onClose, formData, setFormData, editingInvestment, isSubmitting, accounts, onSubmit, selectedDate }: any) => {
  const { resolvedTheme } = useTheme();
  
  const colors = {
    bg: resolvedTheme === 'dark' ? 'bg-gray-900' : 'bg-white',
    text: resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-800',
    textSecondary: resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600',
    border: resolvedTheme === 'dark' ? 'border-gray-700' : 'border-gray-300',
    inputBg: resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white',
    buttonBg: resolvedTheme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-300 hover:bg-gray-400',
  };

  if (!isOpen) return null;
  
  // Calcular valor total baseado em quantidade e preço unitário
  const calculateTotal = () => {
    if (formData.quantity && formData.unitPrice) {
      const quantity = parseFloat(formData.quantity);
      const unitPrice = parseFloat(formData.unitPrice);
      if (!isNaN(quantity) && !isNaN(unitPrice)) {
        const total = quantity * unitPrice;
        setFormData({...formData, amount: total.toFixed(2)});
      }
    }
  };

  const formatCurrency = (amount: string, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(parseFloat(amount));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-60 p-4">
      <div className={`${colors.bg} rounded-lg p-4 w-full max-w-sm mx-auto shadow-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-4">
          <h4 className={`text-lg font-bold ${colors.text}`}>
            {editingInvestment ? 'Editar Investimento' : 'Novo Investimento'}
          </h4>
          <button 
            onClick={onClose} 
            className={`${colors.textSecondary} hover:${colors.text} p-1 rounded-full ${resolvedTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            type="button"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className={`block text-sm font-medium ${colors.textSecondary} mb-1`}>
              Tipo *
            </label>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setFormData({...formData, type: 'BUY'})}
                className={`py-2 px-1 rounded-full border transition-colors text-xs ${
                  formData.type === 'BUY' 
                    ? 'bg-blue-500 text-white border-blue-500' 
                    : `${colors.inputBg} ${colors.text} ${colors.border} ${resolvedTheme === 'dark' ? 'hover:border-red-400' : 'hover:border-red-300'}`
                }`}
              >
                Compra
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, type: 'SELL'})}
                className={`py-2 px-1 rounded-full border transition-colors text-xs ${
                  formData.type === 'SELL' 
                    ? 'bg-orange-500 text-white border-orange-500' 
                    : `${colors.inputBg} ${colors.text} ${colors.border} ${resolvedTheme === 'dark' ? 'hover:border-green-400' : 'hover:border-green-300'}`
                }`}
              >
                Venda
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, type: 'DIVIDEND'})}
                className={`py-2 px-1 rounded-full border transition-colors text-xs ${
                  formData.type === 'DIVIDEND' 
                    ? 'bg-purple-500 text-white border-purple-500' 
                    : `${colors.inputBg} ${colors.text} ${colors.border} ${resolvedTheme === 'dark' ? 'hover:border-green-400' : 'hover:border-green-300'}`
                }`}
              >
                Dividend
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 sm:col-span-1">
              <label className={`block text-sm font-medium ${colors.textSecondary} mb-1`}>
                Ticker
              </label>
              <input
                type="text"
                value={formData.ticker}
                onChange={(e) => setFormData({...formData, ticker: e.target.value.toUpperCase()})}
                className={`w-full p-2 border ${colors.border} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${colors.inputBg} ${colors.text}`}
                placeholder="PETR4, AAPL"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className={`block text-sm font-medium ${colors.textSecondary} mb-1`}>
                Valor Total *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className={`w-full p-2 border ${colors.border} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${colors.inputBg} ${colors.text}`}
                placeholder="0,00"
                required
              />
            </div>
          </div>

          {formData.type !== 'DIVIDEND' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`block text-sm font-medium ${colors.textSecondary} mb-1`}>
                  Quantidade
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  onBlur={calculateTotal}
                  className={`w-full p-2 border ${colors.border} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${colors.inputBg} ${colors.text}`}
                  placeholder="0"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${colors.textSecondary} mb-1`}>
                  Preço Unit.
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({...formData, unitPrice: e.target.value})}
                  onBlur={calculateTotal}
                  className={`w-full p-2 border ${colors.border} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${colors.inputBg} ${colors.text}`}
                  placeholder="0,00"
                />
              </div>
            </div>
          )}

          <div>
            <label className={`block text-sm font-medium ${colors.textSecondary} mb-1`}>
              Descrição *
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className={`w-full p-2 border ${colors.border} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${colors.inputBg} ${colors.text}`}
              placeholder={
                formData.type === 'BUY' ? 'Compra de ações...' :
                formData.type === 'SELL' ? 'Venda de ações...' :
                'Recebimento de dividendos...'
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 sm:col-span-1">
              <label className={`block text-sm font-medium ${colors.textSecondary} mb-1`}>
                Conta *
              </label>
              <select
                value={formData.accountId}
                onChange={(e) => setFormData({...formData, accountId: e.target.value})}
                className={`w-full p-2 border ${colors.border} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${colors.inputBg} ${colors.text}`}
                required
              >
                <option value="">Selecione</option>
                {accounts.map((account: Account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className={`block text-sm font-medium ${colors.textSecondary} mb-1`}>
                Data
              </label>
              <input
                type="date"
                value={selectedDate?.toISOString().split('T')[0]}
                disabled
                className={`w-full p-2 border ${colors.border} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${colors.inputBg} ${colors.text}`}
              />
            </div>
          </div>

          {formData.type !== 'DIVIDEND' && formData.quantity && formData.unitPrice && (
            <div className="bg-blue-50 p-2 rounded">
              <p className="text-xs text-blue-600">
                <strong>Calculado:</strong> {formData.quantity} × {formatCurrency(formData.unitPrice)} = {formatCurrency(formData.amount)}
              </p>
              <p className="text-xs text-blue-500 mt-1">
                Valor atualizado automaticamente
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className={`rounded-full px-4 py-2 ${colors.textSecondary} hover:${colors.text} transition-colors text-sm font-medium`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm font-medium"
            >
              {isSubmitting ? 'Salvando...' : editingInvestment ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Função auxiliar para formatar moeda (já definida anteriormente)
// const formatCurrency = (amount: string, currency: string = 'BRL') => {
//   return new Intl.NumberFormat('pt-BR', {
//     style: 'currency',
//     currency: currency
//   }).format(parseFloat(amount));
// };

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, itemName, itemType }: any) => {
  const { resolvedTheme } = useTheme();
  
  const colors = {
    bg: resolvedTheme === 'dark' ? 'bg-gray-900' : 'bg-white',
    text: resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-800',
    textSecondary: resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600',
    border: resolvedTheme === 'dark' ? 'border-gray-700' : 'border-gray-300',
    inputBg: resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white',
    buttonBg: resolvedTheme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-300 hover:bg-gray-400',
  };

  if (!isOpen) return null;
  
  const getTypeDisplayName = () => {
    switch (itemType) {
      case 'transação': return 'transação';
      case 'investimento': return 'investimento';
      default: return itemType;
    }
  };

  // Função para truncar texto muito longo em mobile
  const truncateText = (text: string, maxLength: number = 30) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-70 p-4">
      <div className="bg-white rounded-lg p-4 w-full max-w-xs mx-auto shadow-xl">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mb-3 mx-auto">
          <HiTrash className="w-5 h-5 text-red-500" />
        </div>
        
        <h4 className="text-base font-semibold text-gray-800 mb-2 text-center">
          Excluir {getTypeDisplayName()}?
        </h4>
        
        <p className="text-sm text-gray-600 mb-4 text-center leading-relaxed">
          Tem certeza que deseja excluir <strong className="break-words">{truncateText(itemName)}</strong>?
        </p>
        
        <p className="text-xs text-red-500 text-center mb-4">
          Esta ação não pode ser desfeita.
        </p>
        
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 sm:justify-center">
          <button 
            onClick={onClose}
            className="flex-1 sm:flex-none px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 sm:flex-none px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
};

// O restante do código permanece igual...
export default function CalendarPage() {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayTransactions, setDayTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [additionalData, setAdditionalData] = useState({
    income: "0",
    expenses: "0"
  });
  const [additionalInvestmentData, setAdditionalInvestmentData] = useState({
    buy: "0",
    dividend: "0"
  });

  const [dayInvestments, setDayInvestments] = useState<Investment[]>([]);

  // Função para buscar transações do mês
  const handleTransactionsChange = () => {
    if (selectedDate) {
      fetchDayTransactions(selectedDate);
      fetchDayInvestments(selectedDate)
      fetchMonthTransactions(currentDate);
    }
  };

  const createCalendarDay = useCallback((
    date: Date,
    isCurrentMonth: boolean,
    isToday: boolean,
    transactions: Transaction[],
    investments: Investment[]
  ): CalendarDay => {
    const income = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const expenses = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    return {
      date,
      isCurrentMonth,
      isToday,
      income,
      expenses,
      transactions,
      investments,
    };
  }, []);

  // Processar transações e agrupar por dia
  const processTransactionsByDay = useCallback((transactions: Transaction[], investments: Investment[], currentDate: Date) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Agrupar transações por dia
    const transactionsByDay: { [key: string]: Transaction[] } = {};
    transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.transactionDate);
      const dateKey = transactionDate.toISOString().split('T')[0];
      if (!transactionsByDay[dateKey]) transactionsByDay[dateKey] = [];
      transactionsByDay[dateKey].push(transaction);
    });

    // Agrupar investimentos por dia
    const investmentsByDay: { [key: string]: Investment[] } = {};
    investments.forEach(investment => {
      const investmentDate = new Date(investment.investmentDate);
      const dateKey = investmentDate.toISOString().split('T')[0];
      if (!investmentsByDay[dateKey]) investmentsByDay[dateKey] = [];
      investmentsByDay[dateKey].push(investment);
    });

    const days: CalendarDay[] = [];
    const today = new Date();

    const isToday = (date: Date) => 
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    // Dias do mês anterior
    const daysInPreviousMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();
    const startDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    for (let i = startDay; i > 0; i--) {
      const date = new Date(year, month - 1, daysInPreviousMonth - i + 1);
      const dateKey = date.toISOString().split('T')[0];
      const dayTransactions = transactionsByDay[dateKey] || [];
      const dayInvestments = investmentsByDay[dateKey] || [];
      days.push(createCalendarDay(date, false, isToday(date), dayTransactions, dayInvestments));
    }

    // Dias do mês atual
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = date.toISOString().split('T')[0];
      const dayTransactions = transactionsByDay[dateKey] || [];
      const dayInvestments = investmentsByDay[dateKey] || [];
      days.push(createCalendarDay(date, true, isToday(date), dayTransactions, dayInvestments));
    }

    // Dias do próximo mês
    const totalCells = 42;
    const remainingDays = totalCells - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      const dateKey = date.toISOString().split('T')[0];
      const dayTransactions = transactionsByDay[dateKey] || [];
      const dayInvestments = investmentsByDay[dateKey] || [];
      days.push(createCalendarDay(date, false, isToday(date), dayTransactions, dayInvestments));
    }

    // Garantir que temos exatamente 42 dias
    if (days.length !== 42) {
      while (days.length < 42) {
        const lastDate = days.length > 0 ? new Date(days[days.length - 1].date) : new Date(year, month + 1, 1);
        lastDate.setDate(lastDate.getDate() + 1);
        const dateKey = lastDate.toISOString().split('T')[0];
        const dayTransactions = transactionsByDay[dateKey] || [];
        const dayInvestments = investmentsByDay[dateKey] || [];
        days.push(createCalendarDay(lastDate, false, isToday(lastDate), dayTransactions, dayInvestments));
      }
      if (days.length > 42) days.splice(42);
    }

    setCalendarDays(days);
  }, [createCalendarDay]); // Esta função não tem dependências externas

  const fetchMonthTransactions = useCallback(async (date: Date) => {
    setIsLoading(true);
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      if (!user) {
        console.error('User ID não encontrado');
        return;
      }

      const response = await fetch(
        `/api/transactions?userId=${user.id}&year=${year}&month=${month}&limit=1000`
      );

      const investments = await fetch(
        `/api/investments?userId=${user.id}&year=${year}&month=${month}&limit=1000`
      );

      if (response.ok && investments.ok) {
        const data = await response.json();
        const investmentsData = await investments.json();

        if (data.success && investmentsData.success) {
          processTransactionsByDay(data.data.items, investmentsData.data.items, date);
        }

        if (data.data.additionalData) {
          setAdditionalData(data.data.additionalData);
        }

        if (investmentsData.data.additionalData) {
          setAdditionalInvestmentData(investmentsData.data.additionalData);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, processTransactionsByDay]);

  // Função para buscar transações de um dia específico
  const fetchDayTransactions = async (date: Date) => {
    setIsModalLoading(true);
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();

      if (!user) {
        console.error('User ID não encontrado');
        return;
      }

      const response = await fetch(
        `/api/transactions?userId=${user.id}&year=${year}&month=${month}&limit=1000`
      );

      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          const selectedKey = new Date(year, month - 1, day).toISOString().split("T")[0];

          const dayTransactions = data.data.items.filter((transaction: Transaction) => {
            const dateKey = transaction.transactionDate.split("T")[0];
            return dateKey === selectedKey;
          });
          
          setDayTransactions(dayTransactions);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar transações do dia:', error);
    } finally {
      setIsModalLoading(false);
    }
  };

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [neighborMonths, setNeighborMonths] = useState({
    previous: getPreviousMonth(currentDate),
    next: getNextMonth(currentDate)
  });

  // A distância mínima do swipe para considerar como mudança de mês
  const minSwipeDistance = 50;

  // Funções para calcular meses vizinhos
  function getPreviousMonth(date: Date) {
    const newDate = new Date(date);
    newDate.setMonth(date.getMonth() - 1);
    return newDate;
  }

  function getNextMonth(date: Date) {
    const newDate = new Date(date);
    newDate.setMonth(date.getMonth() + 1);
    return newDate;
  }

  // Atualizar meses vizinhos quando currentDate mudar
  useEffect(() => {
    setNeighborMonths({
      previous: getPreviousMonth(currentDate),
      next: getNextMonth(currentDate)
    });
  }, [currentDate]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setSwipeOffset(0);
    setIsSwiping(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);
    
    // Feedback visual do swipe - limitado a 100px
    const distance = touchStart - currentTouch;
    const limitedDistance = Math.max(-100, Math.min(100, distance));
    setSwipeOffset(limitedDistance);
  };

  const onTouchEnd = () => {
    setIsSwiping(false);
    
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe || isRightSwipe) {
      // Animação mais suave
      setSwipeOffset(isLeftSwipe ? -window.innerWidth : window.innerWidth);
      
      setTimeout(() => {
        if (isLeftSwipe) {
          goToPreviousMonth();
        } else if (isRightSwipe) {
          goToNextMonth();
        }
        setSwipeOffset(0);
      }, 300);
    } else {
      // Animação de retorno suave
      setSwipeOffset(0);
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Gerar dias para os meses vizinhos
  const generateCalendarDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const startDay = firstDayOfMonth.getDay();
    const endDay = lastDayOfMonth.getDay();
    
    const days: CalendarDay[] = [];
    
    // Dias do mês anterior
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const dayDate = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date: dayDate,
        isCurrentMonth: false,
        isToday: isToday(dayDate),
        income: 0,
        expenses: 0,
        transactions: [],
        investments: []
      });
    }
    
    // Dias do mês atual
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const dayDate = new Date(year, month, i);
      // Aqui você precisaria buscar os dados reais para cada dia
      days.push({
        date: dayDate,
        isCurrentMonth: true,
        isToday: isToday(dayDate),
        income: Math.random() > 0.7 ? Math.random() * 1000 : 0, // Exemplo
        expenses: Math.random() > 0.7 ? Math.random() * 500 : 0, // Exemplo
        transactions: [],
        investments: []
      });
    }
    
    // Dias do próximo mês
    for (let i = 1; i <= (6 - endDay); i++) {
      const dayDate = new Date(year, month + 1, i);
      days.push({
        date: dayDate,
        isCurrentMonth: false,
        isToday: isToday(dayDate),
        income: 0,
        expenses: 0,
        transactions: [],
        investments: []
      });
    }
    
    return days;
  };
  
  // Funções de navegação
  const goToPreviousMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const fetchDayInvestments = async (date: Date) => {
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();

      if (!user) return;

      const response = await fetch(
        `/api/investments?userId=${user.id}&year=${year}&month=${month}&limit=1000`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const selectedKey = new Date(year, month - 1, day).toISOString().split("T")[0];
          const dayInvestments = data.data.items.filter((investment: Investment) => {
            const dateKey = investment.investmentDate.split("T")[0];
            return dateKey === selectedKey;
          });
          setDayInvestments(dayInvestments);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar investimentos do dia:', error);
    }
  };

  // Abrir modal com transações do dia
  const handleDayClick = async (day: CalendarDay) => {
    setSelectedDate(day.date);
    setIsModalOpen(true);
    await Promise.all([
      fetchDayTransactions(day.date),
      fetchDayInvestments(day.date)
    ]);
  };

  // Fechar modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
    setDayTransactions([]);
    setDayInvestments([]);
  };

  // Buscar transações quando o mês mudar
  useEffect(() => {
    if (!user) return;
    fetchMonthTransactions(currentDate);
  }, [user, currentDate, fetchMonthTransactions]);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const getThemeColors = () => {
    if (resolvedTheme === 'dark') {
      return {
        bg: 'bg-gray-900',
        bgSecondary: 'bg-gray-800',
        text: 'text-gray-100',
        textSecondary: 'text-gray-300',
        textTertiary: 'text-gray-400',
        border: 'border-gray-700',
        borderSecondary: 'border-gray-600',
        calendarBg: 'bg-gray-800',
        calendarBorder: 'border-gray-700',
        dayBg: 'bg-gray-800',
        dayBgCurrent: 'bg-gray-700',
        dayBgToday: 'bg-blue-900/30',
        dayText: 'text-gray-100',
        dayTextMuted: 'text-gray-400',
        headerBg: 'bg-gray-800',
        skeletonBg: 'bg-gray-700',
        skeletonLight: 'bg-gray-600',
      };
    }
    
    return {
      bg: 'bg-white',
      bgSecondary: 'bg-gray-50',
      text: 'text-gray-800',
      textSecondary: 'text-gray-600',
      textTertiary: 'text-gray-500',
      border: 'border-gray-200',
      borderSecondary: 'border-gray-300',
      calendarBg: 'bg-white',
      calendarBorder: 'border-gray-200',
      dayBg: 'bg-white',
      dayBgCurrent: 'bg-gray-50',
      dayBgToday: 'bg-blue-50',
      dayText: 'text-gray-800',
      dayTextMuted: 'text-gray-400',
      headerBg: 'bg-white',
      skeletonBg: 'bg-gray-300',
      skeletonLight: 'bg-gray-200',
    };
  };

  const colors = getThemeColors();

  return (
    <Suspense fallback={
      <div className={`${colors.calendarBg} rounded-lg shadow-md w-full h-screen`}>
        <div className={`p-4 sm:p-6 border-b ${colors.border}`}>
          <div className={`h-6 sm:h-8 ${colors.skeletonBg} rounded w-48 sm:w-64 mb-4`}></div>
          <MonthlySummarySkeleton />
        </div>
        <div className={`grid grid-cols-7 gap-px ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
          {[...Array(7)].map((_, index) => (
            <div key={index} className={`${colors.headerBg} p-2 sm:p-4 text-center`}>
              <div className={`h-3 sm:h-4 ${colors.skeletonBg} rounded mx-auto w-3/4`}></div>
            </div>
          ))}
        </div>
        <CalendarDaysSkeleton />
      </div>
    }>
      <div className="w-full min-h-screen overflow-hidden relative">
        {/* Calendário do Mês Anterior (escondido à esquerda) */}
        <div className={`absolute inset-0 transition-opacity duration-300 z-0 ${
          swipeOffset > 0 ? 'opacity-70' : 'opacity-0'
        }`}>
          <div className={`${colors.calendarBg} rounded-3xl shadow-3xl w-full h-full`} 
               style={{ transform: `translateX(${-100 + swipeOffset * 0.5}%)` }}>
            {/* Header do mês anterior */}
            <div className={`px-3 pt-1 sm:pt-0 sm:px-4 border-b ${colors.border}`}>
              <div className={`flex items-center justify-between mb-4 pb-2 sm:mb-0 border-b ${colors.border}`}>
                <h2 className={`text-lg sm:text-2xl font-bold ${colors.textTertiary}`}>
                  {monthNames[neighborMonths.previous.getMonth()]} {neighborMonths.previous.getFullYear()}
                </h2>
              </div>
            </div>
            {/* Grid simplificado do mês anterior */}
            <div className={`grid grid-cols-7 gap-px ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
              {generateCalendarDays(neighborMonths.previous).map((day, index) => (
                <div key={index} className={`min-h-[60px] p-1 ${colors.dayBg}`}>
                  <div className={`text-center text-xs ${
                    day.isCurrentMonth ? colors.textTertiary : colors.textTertiary
                  }`}>
                    {day.date.getDate()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Calendário do Próximo Mês (escondido à direita) */}
        <div className={`absolute inset-0 transition-opacity duration-300 z-0 ${
          swipeOffset < 0 ? 'opacity-70' : 'opacity-0'
        }`}>
          <div className={`${colors.calendarBg} rounded-3xl shadow-3xl w-full h-full`}
               style={{ transform: `translateX(${100 + swipeOffset * 0.5}%)` }}>
            {/* Header do próximo mês */}
            <div className={`px-3 pt-1 sm:pt-0 sm:px-4 border-b ${colors.border}`}>
              <div className={`flex items-center justify-between mb-4 pb-2 sm:mb-0 border-b ${colors.border}`}>
                <h2 className={`text-lg sm:text-2xl font-bold ${colors.textTertiary}`}>
                  {monthNames[neighborMonths.next.getMonth()]} {neighborMonths.next.getFullYear()}
                </h2>
              </div>
            </div>
            {/* Grid simplificado do próximo mês */}
            <div className={`grid grid-cols-7 gap-px ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
              {generateCalendarDays(neighborMonths.next).map((day, index) => (
                <div key={index} className={`min-h-[60px] p-1 ${colors.dayBg}`}>
                  <div className={`text-center text-xs ${
                    day.isCurrentMonth ? colors.textTertiary : colors.textTertiary
                  }`}>
                    {day.date.getDate()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Calendário Principal (com swipe) */}
        <div 
          ref={calendarRef}
          className={`${colors.calendarBg} rounded-3xl shadow-3xl w-full relative z-10 transition-transform duration-300 ease-out`}
          style={{
            transform: `translateX(${swipeOffset}px)`,
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Cabeçalho do calendário - Mobile Optimized */}
          <div className={`px-3 pt-1 sm:pt-0 sm:px-4 border-b ${colors.border}`}>
            <div className={`flex items-center justify-between mb-4 pb-2 sm:mb-0 border-b ${colors.border}`}>
              <div className="flex items-center space-x-2 sm:space-x-4">
                <h2 className={`text-lg sm:text-2xl font-bold ${colors.text} whitespace-nowrap`}>
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <button
                  onClick={goToToday}
                  className="px-2 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors whitespace-nowrap"
                >
                  Hoje
                </button>
              </div>
              
              <div className="flex items-center space-x-1 sm:space-x-2">
                <button
                  onClick={goToPreviousMonth}
                  className={`p-1 sm:p-2 rounded-full ${resolvedTheme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors ${colors.textSecondary}`}
                  aria-label="Mês anterior"
                >
                  <HiChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                </button>
                
                <button
                  onClick={goToNextMonth}
                  className={`p-1 sm:p-2 rounded-full ${resolvedTheme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors ${colors.textSecondary}`}
                  aria-label="Próximo mês"
                >
                  <HiChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
                </button>
              </div>
            </div>

            {/* RESUMO MENSAL - Responsivo */}
            {isLoading ? (
              <MonthlySummarySkeleton />
            ) : (
              <div className="my-4 w-full">
                {/* Grid principal para desktop */}
                <div className="hidden sm:flex justify-between w-full">
                  <div className="grid grid-cols-3 gap-3 w-full max-w-md">
                    <div className={`${resolvedTheme === 'dark' ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} p-3 sm:p-4 rounded-3xl border flex flex-col items-center w-full`}>
                      <HiArrowUp className="w-4 h-4 text-green-500" />
                      <span className={`text-xs sm:text-sm ${resolvedTheme === 'dark' ? 'text-green-400' : 'text-green-600'} font-medium`}>Receitas</span>
                      <span className={`text-xs sm:text-sm font-bold ${resolvedTheme === 'dark' ? 'text-green-300' : 'text-green-700'}`}>
                        {formatCurrency(parseFloat(additionalData.income))}
                      </span>
                    </div>
                    <div className={`${resolvedTheme === 'dark' ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} p-3 sm:p-4 rounded-3xl border flex flex-col items-center w-full`}>
                      <HiArrowDown className="w-4 h-4 text-red-500" />
                      <span className={`text-xs sm:text-sm ${resolvedTheme === 'dark' ? 'text-red-400' : 'text-red-600'} font-medium`}>Despesas</span>
                      <span className={`text-xs sm:text-sm font-bold ${resolvedTheme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>
                        {formatCurrency(parseFloat(additionalData.expenses))}
                      </span>
                    </div>
                    <div className={`p-3 sm:p-4 rounded-3xl border flex flex-col items-center w-full ${
                      parseFloat(additionalData.income) - parseFloat(additionalData.expenses) >= 0 
                        ? `${resolvedTheme === 'dark' ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`
                        : `${resolvedTheme === 'dark' ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200'}`
                    }`}>
                      <HiCurrencyDollar className={`w-4 h-4 ${
                        parseFloat(additionalData.income) - parseFloat(additionalData.expenses) >= 0
                          ? 'text-blue-500' : 'text-orange-500'
                      }`} />
                      <span className={`text-xs sm:text-sm font-medium ${colors.textSecondary}`}>Saldo</span>
                      <span className={`text-xs sm:text-sm font-bold ${
                        parseFloat(additionalData.income) - parseFloat(additionalData.expenses) >= 0
                          ? `${resolvedTheme === 'dark' ? 'text-blue-300' : 'text-blue-700'}` 
                          : `${resolvedTheme === 'dark' ? 'text-orange-300' : 'text-orange-700'}`
                      }`}>
                        {formatCurrency(parseFloat(additionalData.income) - parseFloat(additionalData.expenses))}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                    <div className={`${resolvedTheme === 'dark' ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} p-3 sm:p-4 rounded-3xl border flex flex-col items-center w-full`}>
                      <HiTrendingUp className="w-4 h-4 text-blue-500" />
                      <span className={`text-xs sm:text-sm ${resolvedTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'} font-medium`}>Investido</span>
                      <span className={`text-xs sm:text-sm font-bold ${resolvedTheme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                        {formatCurrency(parseFloat(additionalInvestmentData.buy))}
                      </span>
                    </div>
                    <div className={`${resolvedTheme === 'dark' ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200'} p-3 sm:p-4 rounded-3xl border flex flex-col items-center w-full`}>
                      <HiGift className="w-4 h-4 text-purple-500" />
                      <span className={`text-xs sm:text-sm ${resolvedTheme === 'dark' ? 'text-purple-400' : 'text-purple-600'} font-medium`}>Dividendos</span>
                      <span className={`text-xs sm:text-sm font-bold ${resolvedTheme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>
                        {formatCurrency(parseFloat(additionalInvestmentData.dividend))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grid simplificado para mobile */}
                <div className="sm:hidden grid grid-cols-2 gap-2 w-full">
                  <div className={`${resolvedTheme === 'dark' ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} p-2 rounded-full border flex items-center justify-between w-full`}>
                    <div className="flex items-center space-x-1">
                      <HiArrowUp className="w-3 h-3 text-green-500" />
                      <span className={`text-xs ${resolvedTheme === 'dark' ? 'text-green-400' : 'text-green-600'} font-medium`}>Receitas</span>
                    </div>
                    <span className={`text-xs font-bold ${resolvedTheme === 'dark' ? 'text-green-300' : 'text-green-700'}`}>
                      {formatCurrency(parseFloat(additionalData.income))}
                    </span>
                  </div>
                  <div className={`${resolvedTheme === 'dark' ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} p-2 rounded-full border flex items-center justify-between w-full`}>
                    <div className="flex items-center space-x-1">
                      <HiArrowDown className="w-3 h-3 text-red-500" />
                      <span className={`text-xs ${resolvedTheme === 'dark' ? 'text-red-400' : 'text-red-600'} font-medium`}>Despesas</span>
                    </div>
                    <span className={`text-xs font-bold ${resolvedTheme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>
                      {formatCurrency(parseFloat(additionalData.expenses))}
                    </span>
                  </div>
                  <div className={`p-2 rounded-full border flex items-center justify-between w-full ${
                    parseFloat(additionalData.income) - parseFloat(additionalData.expenses) >= 0 
                      ? `${resolvedTheme === 'dark' ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}` 
                      : `${resolvedTheme === 'dark' ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200'}`
                  }`}>
                    <div className="flex items-center space-x-1">
                      <HiCurrencyDollar className={`w-3 h-3 ${
                        parseFloat(additionalData.income) - parseFloat(additionalData.expenses) >= 0
                          ? 'text-blue-500' : 'text-orange-500'
                      }`} />
                      <span className={`text-xs font-medium ${colors.textSecondary}`}>Saldo</span>
                    </div>
                    <span className={`text-xs font-bold ${
                      parseFloat(additionalData.income) - parseFloat(additionalData.expenses) >= 0
                        ? `${resolvedTheme === 'dark' ? 'text-blue-300' : 'text-blue-700'}` 
                        : `${resolvedTheme === 'dark' ? 'text-orange-300' : 'text-orange-700'}`
                    }`}>
                      {formatCurrency(parseFloat(additionalData.income) - parseFloat(additionalData.expenses))}
                    </span>
                  </div>
                  <div className={`${resolvedTheme === 'dark' ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} p-2 rounded-full border flex items-center justify-between w-full`}>
                    <div className="flex items-center space-x-1">
                      <HiTrendingUp className="w-3 h-3 text-blue-500" />
                      <span className={`text-xs ${resolvedTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'} font-medium`}>Investido</span>
                    </div>
                    <span className={`text-xs font-bold ${resolvedTheme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                      {formatCurrency(parseFloat(additionalInvestmentData.buy))}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dias da semana - Mobile Optimized */}
          <div className={`grid grid-cols-7 gap-px ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} border-b ${colors.border} w-full`}>
            {dayNames.map(day => (
              <div key={day} className={`${colors.headerBg} p-1 sm:p-2 text-center w-full`}>
                <span className={`text-xs sm:text-sm font-medium ${colors.textSecondary} hidden sm:inline`}>
                  {day}
                </span>
                <span className={`text-xs font-medium ${colors.textSecondary} sm:hidden`}>
                  {day.substring(0, 1)}
                </span>
              </div>
            ))}
          </div>

          {/* Grid de dias - Mobile Optimized */}
          {isLoading ? (
            <CalendarDaysSkeleton />
          ) : (
            <div className={`grid grid-cols-7 gap-px ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} w-full`}>
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  className={`
                    min-h-[80px] sm:min-h-[120px] p-0 sm:p-2 cursor-pointer transition-colors
                    ${resolvedTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} border ${colors.border} relative w-full
                    ${day.isCurrentMonth ? `${colors.dayText} ${colors.dayBg}` : `${colors.dayTextMuted} ${colors.dayBg}`}
                    ${day.isToday ? `${colors.dayBgToday} ${resolvedTheme === 'dark' ? 'border-blue-700' : 'border-blue-200'}` : ''}
                  `}
                  onClick={() => handleDayClick(day)}
                >
                  <div className={`
                    flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-medium mb-1 sm:mb-2 mx-auto
                    ${day.isToday ? 'bg-blue-500 text-white' : ''}
                    ${!day.isCurrentMonth && day.isToday ? 'bg-blue-300' : ''}
                  `}>
                    {day.date.getDate()}
                  </div>
                  
                  {/* Resumo financeiro do dia - Mobile Simplified */}
                  <div className="space-y-0 sm:space-y-1 w-full">
                    {day.income > 0 && (
                      <div className="text-[7px] sm:text-xs text-green-600 font-medium truncate text-center">
                        + {formatCurrency(day.income)}
                      </div>
                    )}
                    {day.expenses > 0 && (
                      <div className="text-[7px] sm:text-xs text-red-600 font-medium truncate text-center">
                        - {formatCurrency(day.expenses)}
                      </div>
                    )}
                    
                    {/* Indicador de transações - Mobile Simplified */}
                    {day.transactions.length > 0 && (
                      <div className={`text-[7px] sm:text-xs ${colors.textTertiary} mt-0.5 sm:mt-2 text-center truncate`}>
                        <span className="">
                          {day.transactions.length} transação{day.transactions.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}

                    {day.investments && day.investments.length > 0 && (
                      <div className="text-[7px] sm:text-xs text-indigo-500 mt-0.5 sm:mt-1 text-center truncate">
                        <span className="">
                          {day.investments.length} investimento{day.investments.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de transações do dia */}
        <DayModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          selectedDate={selectedDate}
          transactions={dayTransactions}
          investments={dayInvestments} 
          isLoading={isModalLoading}
          onTransactionsChange={handleTransactionsChange}
        />

        <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 ${resolvedTheme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-black text-white'} bg-opacity-50 px-3 py-1 rounded-full text-sm transition-opacity duration-300 z-20 ${
          isSwiping ? 'opacity-100' : 'opacity-0'
        }`}>
          {swipeOffset > 0 ? '← Mês anterior' : swipeOffset < 0 ? 'Próximo mês →' : 'Arraste para os lados'}
        </div>
      </div>
    </Suspense>
  );
}
