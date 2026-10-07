'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaEnvelope, FaLock, FaUser } from 'react-icons/fa';

import { FormActions, FormContainer } from '@/app/components/forms';
import { Button, Input } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import type { UpdateUserRequest } from '@/app/services/auth-service';

interface UserFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    pendingEmail?: string | null;
    pendingEmailExpiresAt?: string | null;
  };
}

type UserFieldErrors = {
  name: string;
  email: string;
  currentPassword: string;
  confirmPassword: string;
};

const emptyFieldErrors: UserFieldErrors = {
  name: '',
  email: '',
  currentPassword: '',
  confirmPassword: '',
};

export default function UserForm({ user }: UserFormProps) {
  const router = useRouter();
  const { updateUser } = useAuth();

  const [name, setName] = useState(user.name);
  const [newEmail, setNewEmail] = useState(user.pendingEmail ?? '');
  const [pendingEmail, setPendingEmail] = useState<string | null>(
    user.pendingEmail ?? null
  );
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<UserFieldErrors>(emptyFieldErrors);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedNewEmail = newEmail.trim().toLowerCase();
  const emailChanged = Boolean(normalizedNewEmail) &&
    normalizedNewEmail !== user.email.toLowerCase();
  const needsCurrentPassword = Boolean(emailChanged || newPassword);
  const isResend = Boolean(
    pendingEmail && normalizedNewEmail === pendingEmail && !newPassword
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setFieldErrors(emptyFieldErrors);

    if (normalizedNewEmail && !emailChanged) {
      setFieldErrors((previous) => ({
        ...previous,
        email: 'Informe um e-mail diferente do atual',
      }));
      return;
    }

    if ((emailChanged || newPassword) && !currentPassword) {
      setFieldErrors((previous) => ({
        ...previous,
        currentPassword: 'Informe a senha atual para alterar e-mail ou senha',
      }));
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setFieldErrors((previous) => ({
        ...previous,
        confirmPassword: 'As senhas não coincidem',
      }));
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: UpdateUserRequest = {};

      if (name !== user.name) payload.name = name;
      if (emailChanged) payload.email = normalizedNewEmail;

      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      } else if (emailChanged) {
        payload.currentPassword = currentPassword;
      }

      if (Object.keys(payload).length === 0) {
        setSubmitError('Nenhuma alteração realizada');
        return;
      }

      const result = await updateUser(payload);
      if (result.reauthRequired) return;

      if (emailChanged) {
        setPendingEmail(normalizedNewEmail);
        setCurrentPassword('');
        return;
      }

      router.replace('/usuario');
    } catch (err: unknown) {
      const apiMessage = err instanceof Error ? err.message : undefined;
      setSubmitError(apiMessage || 'Erro ao atualizar usuário');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancelPendingEmail() {
    setSubmitError(null);

    try {
      setIsSubmitting(true);
      const result = await updateUser({ cancelPendingEmail: true });
      if (result.reauthRequired) return;

      setPendingEmail(null);
      setNewEmail('');
      setCurrentPassword('');
    } catch (err: unknown) {
      const apiMessage = err instanceof Error ? err.message : undefined;
      setSubmitError(apiMessage || 'Erro ao cancelar alteração de e-mail');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FormContainer
      onSubmit={handleSubmit}
      error={submitError}
      onClearError={() => setSubmitError(null)}
      className="mt-4"
    >
      <section aria-labelledby="personal-data-title">
        <div className="mb-4 flex items-start gap-3 border-b border-[var(--border)] pb-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-raised)] text-[var(--text-muted)]" aria-hidden="true">
            <FaUser />
          </span>
          <div>
            <h2 id="personal-data-title" className="text-xl font-semibold text-[var(--foreground)]">
              Dados pessoais
            </h2>
            <p className="mt-1 text-base leading-relaxed text-[var(--text-muted)]">
              Atualize seu nome ou solicite a troca do e-mail da conta.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <Input
            label="Nome"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) {
                setFieldErrors((previous) => ({ ...previous, name: '' }));
              }
            }}
            onInvalid={(e) => {
              e.preventDefault();
              setFieldErrors((previous) => ({ ...previous, name: 'Nome é obrigatório' }));
            }}
            error={fieldErrors.name}
            required
            disabled={isSubmitting}
            autoComplete="name"
            enterKeyHint="next"
          />

          <div>
            <div className="mb-3 flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
              <span className="mt-0.5 text-[var(--text-muted)]" aria-hidden="true">
                <FaEnvelope />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-muted)]">E-mail atual</p>
                <p className="mt-1 break-all text-base text-[var(--foreground)]">{user.email}</p>
              </div>
            </div>

            <Input
              label="Novo e-mail"
              type="email"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                setSubmitError(null);
                if (!e.target.value.trim() && !newPassword) {
                  setCurrentPassword('');
                }
                if (fieldErrors.email) {
                  setFieldErrors((previous) => ({ ...previous, email: '' }));
                }
              }}
              error={fieldErrors.email}
              placeholder="novo@email.com"
              autoComplete="email"
              inputMode="email"
              enterKeyHint="next"
              autoCapitalize="none"
              spellCheck={false}
              disabled={isSubmitting}
            />
          </div>

          {pendingEmail && (
            <div
              role="status"
              className="rounded-[var(--radius-md)] border border-[var(--primary)]/35 bg-[var(--primary-subtle)] p-4 text-sm leading-relaxed text-[var(--foreground)]"
            >
              <p className="font-semibold">Aguardando confirmação</p>
              <p className="mt-1">
                E-mail atual: <strong>{user.email}</strong>. Novo endereço solicitado:{' '}
                <strong>{pendingEmail}</strong>.
              </p>
              <p className="mt-1 text-[var(--text-muted)]">
                Se o endereço puder ser usado, enviaremos um link para concluir a troca.
                Um novo envio invalida o link anterior.
              </p>
              <div className="mt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelPendingEmail}
                  disabled={isSubmitting}
                >
                  Cancelar solicitação
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-[var(--border)] pt-5" aria-labelledby="password-title">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-raised)] text-[var(--text-muted)]" aria-hidden="true">
            <FaLock />
          </span>
          <div>
            <h2 id="password-title" className="text-xl font-semibold text-[var(--foreground)]">
              Segurança
            </h2>
            <p className="mt-1 text-base leading-relaxed text-[var(--text-muted)]">
              Alterações de e-mail ou senha exigem sua senha atual.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Input
            label="Senha atual"
            type="password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              if (fieldErrors.currentPassword) {
                setFieldErrors((previous) => ({ ...previous, currentPassword: '' }));
              }
            }}
            onInvalid={(e) => {
              e.preventDefault();
              setFieldErrors((previous) => ({
                ...previous,
                currentPassword: 'Informe a senha atual para alterar e-mail ou senha',
              }));
            }}
            required={needsCurrentPassword}
            error={fieldErrors.currentPassword}
            autoComplete="current-password"
            enterKeyHint="next"
            autoCapitalize="none"
            spellCheck={false}
            disabled={isSubmitting}
          />

          <Input
            label="Nova senha"
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setSubmitError(null);
              if (!e.target.value) {
                setConfirmPassword('');
                if (!newEmail.trim()) {
                  setCurrentPassword('');
                }
                setFieldErrors((previous) => ({
                  ...previous,
                  currentPassword: '',
                  confirmPassword: '',
                }));
              }
            }}
            autoComplete="new-password"
            enterKeyHint="next"
            autoCapitalize="none"
            spellCheck={false}
            disabled={isSubmitting}
          />

          <Input
            label="Confirmar nova senha"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (fieldErrors.confirmPassword) {
                setFieldErrors((previous) => ({ ...previous, confirmPassword: '' }));
              }
            }}
            error={fieldErrors.confirmPassword}
            autoComplete="new-password"
            enterKeyHint="done"
            autoCapitalize="none"
            spellCheck={false}
            disabled={isSubmitting}
          />
        </div>
      </section>

      <FormActions
        isEditing
        loading={isSubmitting}
        onCancel={() => router.back()}
        submitLabel={isResend ? 'Reenviar confirmação' : 'Salvar alterações'}
      />
    </FormContainer>
  );
}
