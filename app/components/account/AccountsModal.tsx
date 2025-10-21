// app/components/modals/AccountsModal.tsx
'use client';

import { useEffect, useCallback } from 'react'
import { FaPlus } from 'react-icons/fa';
import { accountService } from '@/app/services';
import { useAuth } from '@/app/context';
import { AccountModel } from '@/app/types/account';
import { Button, AccountsList, AccountForm, AccountsFilter, ModalBase, ModalMessage } from '@/app/components';
import { useThemeColors, useModalManager, useModal } from '@/app/hook';

export default function AccountsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const colors = useThemeColors();
  const modal = useModal({ onClose });

  const modalManager = useModalManager<AccountModel>({
    fetchItems: useCallback(async () => {
      if (!user?.id) return [];
      const response = await accountService.getAccounts(user.id);
      return response.data?.items || [];
    }, [user?.id]),
    userId: user?.id,
    initialFilter: 'ALL'
  });

  // Sync with parent isOpen - versão simplificada
  useEffect(() => {
    if (isOpen && !modal.isOpen) {
      modal.open();
      modalManager.loadItems();
    } else if (!isOpen && modal.isOpen) {
      modal.close();
      modalManager.resetFormState();
    }
  }, [isOpen, modal, modalManager]); // Apenas dependências essenciais

  const activeAccountsCount = modalManager.items.filter(acc => acc.isActive).length;

  const getSubtitle = () => {
    if (modalManager.loading) return 'Carregando...';
    if (modalManager.items.length === 0) return 'Nenhuma conta encontrada';
    return `${modalManager.filteredItems.length} de ${modalManager.items.length} conta${modalManager.items.length !== 1 ? 's' : ''}`;
  };

  const getTitle = () => {
    if (modalManager.showForm) {
      return modalManager.isEditing ? 'Editar Conta' : 'Nova Conta';
    }
    return 'Gerenciar Contas';
  };

  const headerActions = !modalManager.showForm ? (
    <Button
      variant="primary"
      size="sm"
      onClick={modalManager.handleAddNew}
      icon={<FaPlus size={16} />}
      className="!p-2"
      title="Adicionar nova conta"
      aria-label="Adicionar nova conta"
    />
  ) : null;

  const footer = !modalManager.showForm && !modalManager.loading ? (
    <div className={`sm:hidden p-4 border-t ${colors.border.primary} ${colors.bg.secondary} flex-shrink-0 pb-safe`}>
      <div className={`flex items-center justify-between text-xs ${colors.text.tertiary}`}>
        <span>Toque em uma conta para editar</span>
        <span>{activeAccountsCount} ativa{activeAccountsCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  ) : null;

  return (
    <ModalBase
      isOpen={modal.isOpen}
      onClose={modal.close}
      title={getTitle()}
      subtitle={!modalManager.showForm ? getSubtitle() : undefined}
      showForm={modalManager.showForm}
      onBackToList={modalManager.handleBackToList}
      headerActions={headerActions}
      footer={footer}
      size="xl"
    >
      {/* Mensagens de erro/sucesso */}
      {(modalManager.error || modalManager.success) && (
        <ModalMessage
          type={modalManager.error ? 'error' : 'success'}
          message={modalManager.error || modalManager.success!}
          onClose={modalManager.clearMessages}
        />
      )}

      {/* Conteúdo Principal */}
      {modalManager.showForm ? (
        <AccountForm
          account={modalManager.currentItem}
          isEditing={modalManager.isEditing}
          onSubmitSuccess={modalManager.handleSuccess}
          onCancel={modalManager.handleBackToList}
          submitting={modalManager.submitting}
        />
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Filtros */}
          <div className={`
            p-4 border-b ${colors.border.primary} flex-shrink-0 
            ${colors.bg.secondary}
          `}>
            <AccountsFilter
              filterType={modalManager.filterType}
              filterActive={modalManager.filterActive}
              onFilterTypeChange={modalManager.setFilterType}
              onFilterActiveChange={modalManager.setFilterActive}
            />
          </div>

          {/* Lista de Contas */}
          <div className="flex-1 overflow-y-auto pb-safe">
            <AccountsList
              accounts={modalManager.items}
              filteredAccounts={modalManager.filteredItems}
              loading={modalManager.loading}
              onEdit={modalManager.handleEdit}
              onDelete={modalManager.handleItemsUpdate}
              onToggleActive={modalManager.handleItemsUpdate}
              onError={modalManager.setError}
              onSuccess={modalManager.setSuccess}
              onAdd={modalManager.handleAddNew}
            />
          </div>
        </div>
      )}
    </ModalBase>
  );
}
