'use client';

import { useState } from 'react';
import { FaEdit, FaSignOutAlt, FaTrash } from 'react-icons/fa';

import { PageHeader } from '@/app/components/base-pages';
import { PageEmpty, PageLoading } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import { ConfirmationModal, DeleteOverlay } from '@/app/components/overlays';
import { Button } from '@/app/components/ui';
import ExportData from '@/app/components/pages/user/show/export-data';
import Preferences from '@/app/components/pages/user/show/preferences';
import { UserInfo } from '@/app/components/pages/user';
import { useAuth } from '@/app/context';
import { useUser } from '@/app/hooks/users/user-show';

export default function Show({ id }: { id: string }) {
  const { logout } = useAuth();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const {
    user,
    setUser,
    loading,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete,
  } = useUser({ id });

  const handleAccountDelete = async () => {
    setDeleteError(null);

    try {
      await handleDelete();
      await logout();
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : 'Não foi possível excluir sua conta. Tente novamente.',
      );
    }
  };

  return (
    <ProtectedRoute>
      <DeleteOverlay
        isOpen={isDeleting}
        entityName="conta"
        title="Excluindo conta"
      />

      <PageHeader
        title="Perfil e configurações"
        description="Gerencie seus dados, preferências, exportação e segurança da conta em um só lugar."
        loading={loading}
      />

      {loading ? (
        <PageLoading type="details" />
      ) : !user ? (
        <PageEmpty title="Perfil não encontrado" />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <UserInfo user={user} isDeleting={isDeleting} />
            <Preferences user={user} onUserChange={setUser} />
          </div>

          <section className="ds-panel overflow-hidden" aria-labelledby="profile-edit-title">
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <h2 id="profile-edit-title" className="text-xl font-semibold text-[var(--foreground)]">
                  Dados pessoais e senha
                </h2>
                <p className="mt-1 text-base leading-relaxed text-[var(--text-muted)]">
                  Altere seu nome ou defina uma nova senha usando sua senha atual.
                </p>
              </div>

              <Button
                as="a"
                href={`/usuario/alterar/${id}`}
                variant="outline"
                icon={<FaEdit />}
                className="w-full sm:w-auto"
              >
                Editar perfil
              </Button>
            </div>
          </section>

          <ExportData />

          <section className="ds-panel overflow-hidden" aria-labelledby="profile-session-title">
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <h2 id="profile-session-title" className="text-xl font-semibold text-[var(--foreground)]">
                  Sessão
                </h2>
                <p className="mt-1 text-base leading-relaxed text-[var(--text-muted)]">
                  Encerre a sessão atual neste dispositivo. Seus dados permanecem salvos.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                icon={<FaSignOutAlt />}
                onClick={() => void logout()}
                className="w-full sm:w-auto"
              >
                Sair da conta
              </Button>
            </div>
          </section>

          <section
            className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--danger)]/45 bg-[var(--danger-subtle)]/35"
            aria-labelledby="danger-zone-title"
          >
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--expense)]">
                  Zona de risco
                </p>
                <h2 id="danger-zone-title" className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                  Excluir conta permanentemente
                </h2>
                <p className="mt-1 text-base leading-relaxed text-[var(--text-muted)]">
                  Remove sua conta e os dados associados. Esta ação é irreversível e exige confirmação explícita.
                </p>
              </div>

              <Button
                type="button"
                variant="danger"
                icon={<FaTrash />}
                onClick={() => {
                  setDeleteError(null);
                  setIsDeleteModalOpen(true);
                }}
                disabled={isDeleting}
                className="w-full sm:w-auto"
              >
                Excluir minha conta
              </Button>
            </div>

            {deleteError && (
              <p
                role="alert"
                className="border-t border-[var(--danger)]/35 px-4 py-3 text-sm leading-relaxed text-[var(--expense)] sm:px-5"
              >
                {deleteError}
              </p>
            )}
          </section>

          <ConfirmationModal
            isOpen={isDeleteModalOpen}
            onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
            onConfirm={() => void handleAccountDelete()}
            title="Excluir sua conta"
            message={`Tem certeza que deseja excluir a conta de ${user.name}? Todos os dados associados serão removidos permanentemente.`}
            confirmText="Excluir conta"
            cancelText="Manter minha conta"
            variant="danger"
            isLoading={isDeleting}
          />
        </div>
      )}
    </ProtectedRoute>
  );
}
