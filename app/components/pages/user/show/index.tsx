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

type SettingsSection = 'account' | 'preferences' | 'security' | 'export' | 'session' | 'risk';

const sections: Array<{ id: SettingsSection; label: string }> = [
  { id: 'account', label: 'Conta' },
  { id: 'preferences', label: 'Preferências' },
  { id: 'security', label: 'Segurança' },
  { id: 'export', label: 'Exportação' },
  { id: 'session', label: 'Sessão' },
  { id: 'risk', label: 'Risco' },
];

export default function Show({ id }: { id: string }) {
  const { logout } = useAuth();
  const [activeSection, setActiveSection] = useState<SettingsSection>('account');
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
      <DeleteOverlay isOpen={isDeleting} entityName="conta" title="Excluindo conta" />

      <PageHeader
        title="Central de configurações"
        description="Gerencie sua conta, preferências e segurança dos seus dados."
        loading={loading}
      />

      {loading ? (
        <PageLoading type="details" />
      ) : !user ? (
        <PageEmpty title="Perfil não encontrado" />
      ) : (
        <div className="space-y-5">
          <nav
            className="flex gap-2 overflow-x-auto rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-2"
            aria-label="Áreas de configuração"
          >
            {sections.map((section) => {
              const active = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveSection(section.id)}
                  className={`shrink-0 rounded-[var(--radius-lg)] px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${
                    active
                      ? 'bg-[var(--primary-subtle)] text-[var(--primary)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {section.label}
                </button>
              );
            })}
          </nav>

          {activeSection === 'account' && (
            <div className="grid gap-5 xl:grid-cols-2">
              <UserInfo user={user} isDeleting={isDeleting} />
              <section className="ds-panel p-4 sm:p-5" aria-labelledby="settings-summary-title">
                <h2 id="settings-summary-title" className="text-xl font-semibold text-[var(--foreground)]">
                  Resumo
                </h2>
                <p className="mt-1 text-base leading-relaxed text-[var(--text-muted)]">
                  As principais preferências da sua conta em um único ponto de entrada.
                </p>
                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4">
                    <dt className="text-sm text-[var(--text-muted)]">Valores financeiros</dt>
                    <dd className="mt-1 font-semibold text-[var(--foreground)]">
                      {user.showValues === false ? 'Ocultos' : 'Visíveis'}
                    </dd>
                  </div>
                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4">
                    <dt className="text-sm text-[var(--text-muted)]">Sessão</dt>
                    <dd className="mt-1 font-semibold text-[var(--foreground)]">Atual</dd>
                  </div>
                </dl>
              </section>
            </div>
          )}

          {activeSection === 'preferences' && (
            <Preferences user={user} onUserChange={setUser} />
          )}

          {activeSection === 'security' && (
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
                <Button as="a" href={`/usuario/alterar/${id}`} variant="outline" icon={<FaEdit />} className="w-full sm:w-auto">
                  Editar perfil
                </Button>
              </div>
            </section>
          )}

          {activeSection === 'export' && <ExportData />}

          {activeSection === 'session' && (
            <section className="ds-panel overflow-hidden" aria-labelledby="profile-session-title">
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div>
                  <h2 id="profile-session-title" className="text-xl font-semibold text-[var(--foreground)]">Sessão atual</h2>
                  <p className="mt-1 text-base leading-relaxed text-[var(--text-muted)]">
                    Encerre a sessão deste dispositivo. Seus dados permanecem salvos.
                  </p>
                </div>
                <Button type="button" variant="outline" icon={<FaSignOutAlt />} onClick={() => void logout()} className="w-full sm:w-auto">
                  Sair da conta
                </Button>
              </div>
            </section>
          )}

          {activeSection === 'risk' && (
            <section
              className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--danger)]/45 bg-[var(--danger-subtle)]/35"
              aria-labelledby="danger-zone-title"
            >
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--expense)]">Zona de risco</p>
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
                <p role="alert" className="border-t border-[var(--danger)]/35 px-4 py-3 text-sm leading-relaxed text-[var(--expense)] sm:px-5">
                  {deleteError}
                </p>
              )}
            </section>
          )}

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
