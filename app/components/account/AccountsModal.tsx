// app/components/AccountsModal.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';

import { FaTimes, FaWallet, FaArrowLeft, FaPlus } from 'react-icons/fa';

import { accountService } from '@/app/services/accountService';

import { useAuth } from '@/app/context/AuthContext';

import { AccountModel, AccountType } from '@/app/types/account';

import { Button, AccountsList, AccountForm, AccountsFilter } from '@/app/components';

import { useThemeColors } from '@/app/hook/useThemeColors';

interface AccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccountsModal({ isOpen, onClose }: AccountsModalProps) {
  const { user } = useAuth();
  const colors = useThemeColors();
  
  const [accounts, setAccounts] = useState<AccountModel[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<AccountModel | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<AccountType | 'ALL' | null>(null);
  const [filterActive, setFilterActive] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | null>(null);

  const loadAccounts = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await accountService.getAccounts(user.id, { limit: '100' });
      setAccounts(response.data?.items || []);
    } catch (err) {
      setError('Erro ao carregar contas');
      console.error('Erro ao carregar contas:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

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

  useEffect(() => {
    if (isOpen && user?.id) {
      loadAccounts();
      setShowForm(false);
      setIsEditing(false);
      setCurrentAccount(null);
      setError(null);
      setSuccess(null);

      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        const scrollY = preventBodyScroll();
        return () => {
          restoreBodyScroll(scrollY);
        };
      }
    }
  }, [isOpen, user?.id, loadAccounts, preventBodyScroll, restoreBodyScroll]);

  const handleAddNew = () => {
    setShowForm(true);
    setIsEditing(false);
    setCurrentAccount(null);
    setError(null);
    setSuccess(null);
  };

  const handleEdit = (account: AccountModel) => {
    setCurrentAccount(account);
    setIsEditing(true);
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleBackToList = () => {
    setShowForm(false);
    setIsEditing(false);
    setCurrentAccount(null);
    setError(null);
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleSuccess = (message: string) => {
    setSuccess(message);
    loadAccounts();
    handleBackToList();
  };

  const handleAccountUpdate = (updatedAccounts: AccountModel[]) => {
    setAccounts(updatedAccounts);
    loadAccounts();
  };

  // Fechar modal ao pressionar ESC
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
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
    <div 
      className={`fixed inset-0 ${colors.bg.overlay} flex items-center justify-center z-50 p-0 sm:p-3 animate-fade-in`}
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
            {showForm ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                disabled={submitting}
                icon={<FaArrowLeft size={18} />}
                className="!p-2 sm:!p-2"
                title="Voltar para lista"
              />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500 flex items-center justify-center">
                <FaWallet className="text-white" size={16} />
              </div>
            )}
            
            <div>
              <h2 className={`text-lg sm:text-xl font-bold ${colors.text.primary}`}>
                {showForm 
                  ? (isEditing ? 'Editar Conta' : 'Nova Conta')
                  : 'Gerenciar Contas'
                }
              </h2>
              {!showForm && accounts.length > 0 && (
                <p className={`text-xs sm:text-sm ${colors.text.secondary} mt-1`}>
                  {accounts.length} conta{accounts.length !== 1 ? 's' : ''} encontrada{accounts.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 ">
            {!showForm && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddNew}
                icon={<FaPlus size={14} />}
                className="!hidden sm:!inline !p-2 sm:!p-2"
                title="Adicionar nova conta"
              >
              </Button>
            )}
            
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              icon={<FaTimes size={16} />}
              className="!p-3 sm:!p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              title="Fechar"
            />
          </div>
        </div>

        {/* Mensagens de status */}
        {(error || success) && (
          <div className={`
            mx-4 mt-2 p-3 rounded-xl border flex-shrink-0 animate-fade-in
            ${error 
              ? `${colors.colors.error.bg} ${colors.colors.error.border} ${colors.colors.error.text}`
              : `${colors.colors.success.bg} ${colors.colors.success.border} ${colors.colors.success.text}`
            }
          `}>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'}`}></div>
              <p className="text-sm flex-1">
                {error || success}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setError(null);
                  setSuccess(null);
                }}
                icon={<FaTimes size={12} />}
                className="!p-1 flex-shrink-0"
                title="Fechar mensagem"
              />
            </div>
          </div>
        )}

        {/* Conteúdo Principal */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {showForm ? (
            <AccountForm
              account={currentAccount}
              isEditing={isEditing}
              onSubmitSuccess={handleSuccess}
              onError={setError}
              onCancel={handleBackToList}
              submitting={submitting}
              setSubmitting={setSubmitting}
            />
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Filtros */}
              <div className={`
                p-4 border-b ${colors.border.primary} flex-shrink-0 
                ${colors.bg.secondary}
              `}>
                <AccountsFilter
                  filterType={filterType}
                  filterActive={filterActive}
                  onFilterTypeChange={setFilterType}
                  onFilterActiveChange={setFilterActive}
                />
              </div>

              {/* Lista de Contas */}
              <div className="flex-1 overflow-y-auto">
                <AccountsList
                  accounts={accounts}
                  filteredAccounts={accounts.filter(account => {
                    const typeMatch = 
                      !filterType || 
                      filterType === 'ALL' || 
                      account.type === filterType;

                    const activeMatch = 
                      !filterActive ||
                      filterActive === 'ALL' || 
                      (filterActive === 'ACTIVE' && account.isActive) ||
                      (filterActive === 'INACTIVE' && !account.isActive);
                    
                    return typeMatch && activeMatch;
                  })}
                  loading={loading}
                  onEdit={handleEdit}
                  onDelete={handleAccountUpdate}
                  onToggleActive={handleAccountUpdate}
                  onError={setError}
                  onSuccess={setSuccess}
                />
              </div>

              {/* Botão Flutuante para Mobile */}
              {!showForm && accounts.length > 0 && (
                <div className="sm:hidden fixed bottom-12 right-2 z-20">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleAddNew}
                    icon={<FaPlus size={16} />}
                    className="!p-3 shadow-lg rounded-full animate-bounce-gentle"
                    title="Adicionar nova conta"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Info Mobile */}
        {!showForm && (
          <div className={`sm:hidden p-3 border-t ${colors.border.primary} ${colors.bg.secondary} flex-shrink-0`}>
            <div className={`flex items-center justify-between text-xs ${colors.text.tertiary}`}>
              <span>Toque em uma conta para editar</span>
              <span>{accounts.filter(acc => acc.isActive).length} ativas</span>
            </div>
          </div>
        )}
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
          animation: slide-up-mobile 0.3s ease-out;
        }
        .animate-bounce-gentle {
          animation: bounce-gentle 2s infinite;
        }
      `}</style>
    </div>
  );
}