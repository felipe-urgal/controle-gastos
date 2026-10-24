'use client';

import { useState } from 'react';
import { FaCalendarAlt, FaEnvelope, FaKey, FaSignOutAlt, FaTrash, FaUser } from 'react-icons/fa';

import { PageHeader } from '@/app/components/base-pages';
import { PageEmpty, PageError, PageLoading } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import { ConfirmationModal, DeleteOverlay } from '@/app/components/overlays';
import { Button, Chip, ChipRow, Input, ShowBelow, ShowFrom } from '@/app/components/ui';
import ExportData from '@/app/components/pages/user/show/export-data';
import McpAccessPanel from '@/app/components/pages/user/show/mcp-access-panel';
import MfaSecurityPanel from '@/app/components/pages/user/show/mfa-security-panel';
import Preferences from '@/app/components/pages/user/show/preferences';
import { SettingsHeader } from '@/app/components/pages/user/show/settings-header';
import { SettingsPanel, SettingsRow } from '@/app/components/pages/user/show/settings-row';
import { formatDate, settingsSections, type SettingsSection } from '@/app/components/pages/user/show/settings-model';
import { useAuth } from '@/app/context';
import { clearOfflineTransactionLocalState, readOfflineTransactionDraft } from '@/app/lib/pwa/offline-transaction-draft';
import { readOfflineTransactionQueue } from '@/app/lib/pwa/offline-transaction-queue';
import { useUser } from '@/app/hooks/users/user-show';

export default function Show() {
  const { logout } = useAuth();
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const {
    user,
    setUser,
    loading,
    error,
    notFound,
    retry,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete,
  } = useUser();

  const resetDeleteStepUp = () => {
    setCurrentPassword('');
    setTotpCode('');
    setRecoveryCode('');
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setIsDeleteModalOpen(false);
    setDeleteError(null);
    resetDeleteStepUp();
  };

  const handleAccountDelete = async () => {
    setDeleteError(null);

    if (!currentPassword) {
      setDeleteError('Informe sua senha atual para excluir a conta.');
      return;
    }

    const token = totpCode.trim();
    const recovery = recoveryCode.trim();
    if (user?.totpEnabled && Boolean(token) === Boolean(recovery)) {
      setDeleteError('Informe apenas um código TOTP ou um recovery code.');
      return;
    }

    if (user?.id) {
      const hasDraft = Boolean(readOfflineTransactionDraft(user.id));
      const pendingCount = readOfflineTransactionQueue(user.id).length;
      if ((hasDraft || pendingCount > 0) && !window.confirm(
        'Existem rascunhos ou lançamentos aguardando sincronização. Excluir sua conta também apagará esses dados locais.\n\nCancelar: revisar ou sincronizar antes.\nOK: excluir e descartar.',
      )) return;
    }

    try {
      await handleDelete({
        currentPassword,
        token: token || undefined,
        recoveryCode: recovery || undefined,
      });
      resetDeleteStepUp();
      clearOfflineTransactionLocalState();
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
      ) : notFound ? (
        <PageEmpty title="Perfil não encontrado" />
      ) : error ? (
        <PageError
          message={error}
          buttonText="Tentar novamente"
          onRetry={retry}
        />
      ) : !user ? (
        <PageError
          message="Não foi possível carregar seu perfil."
          buttonText="Tentar novamente"
          onRetry={retry}
        />
      ) : (
        <div className="space-y-5">
          <SettingsHeader user={user} onGo={setActiveSection} />

          <div className="grid items-start gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
            <ShowFrom breakpoint="lg">
            <nav aria-label="Áreas de configuração" className="sticky top-3 grid gap-1">
              {settingsSections.map((section) => (
                <div key={section.id} className={section.danger ? 'mt-2 border-t border-[var(--border)] pt-3' : undefined}>
                  <Button
                    variant={activeSection === section.id ? 'secondary' : 'ghost'}
                    size="sm"
                    fullWidth
                    aria-current={activeSection === section.id ? 'page' : undefined}
                    onClick={() => setActiveSection(section.id)}
                    className={`[&>span]:w-full [&>span]:justify-start ${section.danger ? 'text-[var(--expense)]' : ''}`}
                  >
                    {section.label}
                  </Button>
                </div>
              ))}
            </nav>
            </ShowFrom>
            <ShowBelow breakpoint="lg">
              <ChipRow label="Áreas de configuração">
                {settingsSections.map((section) => (
                  <Chip key={section.id} selected={activeSection === section.id} onClick={() => setActiveSection(section.id)}>
                    {section.label}
                  </Chip>
                ))}
              </ChipRow>
            </ShowBelow>

            <div className="min-w-0 space-y-5">
              {activeSection === 'profile' && (
                <SettingsPanel id="profile-identity-title" title="Perfil" description="Dados básicos usados para identificar sua conta." busy={isDeleting}>
                  <SettingsRow icon={<FaUser />} title="Nome" description={user.name} control={<Button as="a" href="/usuario/editar" variant="outline" size="sm">Editar</Button>} />
                  <SettingsRow icon={<FaEnvelope />} title="E-mail" description={user.email} control={<Button as="a" href="/usuario/editar" variant="outline" size="sm">Editar</Button>} />
                  <SettingsRow icon={<FaKey />} title="Senha" description="Altere usando sua senha atual." control={<Button as="a" href="/usuario/editar" variant="outline" size="sm">Alterar senha</Button>} />
                  <SettingsRow icon={<FaCalendarAlt />} title="Conta criada em" description={`${formatDate(user.createdAt)} · última atualização em ${formatDate(user.updatedAt)}`} />
                </SettingsPanel>
              )}

              {activeSection === 'preferences' && <Preferences user={user} onUserChange={setUser} />}

              {activeSection === 'security' && (
                <MfaSecurityPanel
                  enabled={user.totpEnabled}
                  onEnabledChange={(enabled) => {
                    setUser((current) => current ? { ...current, totpEnabled: enabled } : current);
                  }}
                />
              )}

              {activeSection === 'integrations' && <McpAccessPanel totpEnabled={user.totpEnabled} />}

              {activeSection === 'data' && (
                <>
                  <ExportData />
                  <SettingsPanel id="profile-session-title" title="Sessão" description="Encerre a sessão deste dispositivo. Seus dados permanecem salvos.">
                    <SettingsRow
                      icon={<FaSignOutAlt />}
                      title="Sair da conta"
                      description="Você precisará entrar de novo neste dispositivo."
                      control={<Button type="button" variant="outline" icon={<FaSignOutAlt />} onClick={() => void logout()}>Sair da conta</Button>}
                    />
                  </SettingsPanel>
                </>
              )}

              {activeSection === 'risk' && (
                <section
                  className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--danger)]/45 bg-[var(--danger-subtle)]/35"
                  aria-labelledby="danger-zone-title"
                >
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="max-w-2xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--expense)]">Zona de risco</p>
                      <h2 id="danger-zone-title" className="mt-1 text-lg font-bold text-[var(--foreground)]">Excluir conta permanentemente</h2>
                      <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
                        Remove sua conta e os dados associados. Esta ação é irreversível e exige confirmação explícita
                        {user.totpEnabled ? ', com senha e código do autenticador' : ' com sua senha'}.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="danger"
                      icon={<FaTrash />}
                      onClick={() => {
                        setDeleteError(null);
                        resetDeleteStepUp();
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
            </div>
          </div>

          <ConfirmationModal
            isOpen={isDeleteModalOpen}
            onClose={closeDeleteModal}
            onConfirm={() => void handleAccountDelete()}
            title="Excluir sua conta"
            message={`Tem certeza que deseja excluir a conta de ${user.name}? Confirme sua identidade antes de continuar.`}
            confirmText="Excluir conta"
            cancelText="Manter minha conta"
            variant="danger"
            isLoading={isDeleting}
          >
            <Input
              label="Senha atual"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.currentTarget.value)}
              disabled={isDeleting}
              required
            />
            {user.totpEnabled && (
              <>
                <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                  Informe um código do autenticador ou um recovery code, mas não os dois.
                </p>
                <Input
                  label="Código do autenticador"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={totpCode}
                  onChange={(event) => setTotpCode(event.currentTarget.value)}
                  disabled={isDeleting}
                  placeholder="000000"
                />
                <Input
                  label="Recovery code"
                  value={recoveryCode}
                  onChange={(event) => setRecoveryCode(event.currentTarget.value)}
                  disabled={isDeleting}
                  placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                />
              </>
            )}
            {deleteError && (
              <p role="alert" className="text-sm leading-relaxed text-[var(--expense)]">
                {deleteError}
              </p>
            )}
          </ConfirmationModal>
        </div>
      )}
    </ProtectedRoute>
  );
}
