'use client';

import { useState } from 'react';

import { PageHeader } from '@/app/components/base-pages';
import { pageBarButtonProps } from '@/app/components/base-pages/page-bar';
import { PageEmpty, PageLoading } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import { ConfirmationModal, DeleteOverlay } from '@/app/components/overlays';
import MerchantShowView from '@/app/components/pages/merchant/show/merchant-show-view';
import { Button, ShowFrom } from '@/app/components/ui';
import { FaPowerOff } from 'react-icons/fa';
import { useDelete } from '@/app/hooks/crud/delete';
import { useShow } from '@/app/hooks/crud/show';
import { merchantService } from '@/app/services/merchant-service';
import type { MerchantDTO } from '@/app/types/merchant';

const BACK_URL = '/estabelecimentos';

export default function Show({ id }: { id: string }) {
  const { entity, setEntity, loading } = useShow<MerchantDTO>({ id, service: merchantService });
  const [actionError, setActionError] = useState('');
  const { isDeleteModalOpen, setIsDeleteModalOpen, isDeleting, deleteError, handleDelete } = useDelete({
    redirectPath: BACK_URL,
    deleteService: merchantService.delete,
  });

  /** Atualiza nome ou status sem perder a atividade carregada na leitura. */
  async function update(data: { name?: string; isActive?: boolean }) {
    if (!entity) return;
    setActionError('');
    try {
      const response = await merchantService.update(entity.id, data);
      setEntity({ ...entity, ...response.data, activity: entity.activity });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar estabelecimento';
      setActionError(message);
      throw error;
    }
  }

  const toggleActive = () => {
    if (entity) void update({ isActive: !entity.isActive }).catch(() => undefined);
  };

  return (
    <ProtectedRoute>
      <DeleteOverlay isOpen={isDeleting} entityName="estabelecimento" title="Excluindo estabelecimento" />

      <ShowFrom breakpoint="lg">
        <PageHeader
                    title="Detalhes do estabelecimento"
          backUrl={BACK_URL}
          sidebarAligned
          animated="neon"
breadcrumb={[{ label: 'Estabelecimentos', href: BACK_URL }, { label: entity?.name ?? 'Estabelecimento' }]}
          actions={
            entity ? (
              <Button variant="outline" {...pageBarButtonProps} icon={<FaPowerOff />} onClick={toggleActive} disabled={isDeleting}>
                {entity.isActive ? 'Inativar' : 'Reativar'}
              </Button>
            ) : undefined
          }
          onDelete={entity ? () => setIsDeleteModalOpen(true) : undefined}
          loading={loading}
          isDeleting={isDeleting}
        />
      </ShowFrom>

      {loading ? (
        <PageLoading type="details" />
      ) : !entity ? (
        <PageEmpty title="Estabelecimento não encontrado" redirectTo={BACK_URL} />
      ) : (
        <>
          <MerchantShowView
            merchant={entity}
            backUrl={BACK_URL}
            isBusy={isDeleting}
            error={actionError}
            onUpdate={update}
            onToggleActive={toggleActive}
            onDeleteRequest={() => setIsDeleteModalOpen(true)}
          />

          <ConfirmationModal
            isOpen={isDeleteModalOpen}
            onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
            onConfirm={() => void handleDelete(entity.id)}
            title="Excluir estabelecimento"
            message={`Tem certeza que deseja excluir ${entity.name}? Esta ação não poderá ser desfeita.`}
            confirmText="Excluir"
            variant="danger"
            isLoading={isDeleting}
            dangerNotice="Estabelecimentos com transações ou aliases vinculados não podem ser excluídos. Para preservar o histórico, inative o estabelecimento."
          >
            {deleteError && (
              <p role="alert" className="rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]">
                {deleteError}
              </p>
            )}
          </ConfirmationModal>
        </>
      )}
    </ProtectedRoute>
  );
}
