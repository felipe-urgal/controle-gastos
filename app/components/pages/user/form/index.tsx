'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaLock, FaUser } from 'react-icons/fa';

import { FormActions, FormContainer } from '@/app/components/forms';
import { Input } from '@/app/components/ui';
import { userService } from '@/app/services/user-service';

interface UserFormProps {
  user: {
    id: string;
    name: string;
  };
}

export default function UserForm({ user }: UserFormProps) {
  const router = useRouter();

  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (newPassword && !currentPassword) {
      setSubmitError('Informe a senha atual para definir uma nova senha');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setSubmitError('As senhas não coincidem');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: Record<string, string> = {};

      if (name !== user.name) payload.name = name;

      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      if (Object.keys(payload).length === 0) {
        setSubmitError('Nenhuma alteração realizada');
        return;
      }

      await userService.update(user.id, payload);
      router.replace(`/usuario/show/${user.id}`);
    } catch (err: unknown) {
      const apiMessage = err instanceof Error ? err.message : undefined;
      setSubmitError(apiMessage || 'Erro ao atualizar usuário');
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
              O nome é exibido na sua área autenticada.
            </p>
          </div>
        </div>

        <Input
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isSubmitting}
          autoComplete="name"
        />
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
              Deixe os campos vazios para manter a senha atual.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {newPassword && (
            <Input
              label="Senha atual"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={isSubmitting}
            />
          )}

          <Input
            label="Nova senha"
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (!e.target.value) {
                setCurrentPassword('');
                setConfirmPassword('');
              }
            }}
            autoComplete="new-password"
            disabled={isSubmitting}
          />

          <Input
            label="Confirmar nova senha"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            disabled={isSubmitting}
          />
        </div>
      </section>

      <FormActions
        isEditing
        loading={isSubmitting}
        onCancel={() => router.back()}
        submitLabel="Salvar alterações"
      />
    </FormContainer>
  );
}
