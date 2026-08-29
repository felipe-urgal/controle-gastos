'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { userService } from "@/app/services/user-service";
import { Input } from '@/app/components/ui';
import { FormContainer, FormActions } from '@/app/components/forms';

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

      if (name !== user.name) {
        payload.name = name;
      }

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
      <Input
        label="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        disabled={isSubmitting}
      />

      {newPassword && (
        <Input
          label="Senha Atual"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          autoComplete="current-password"
          disabled={isSubmitting}
        />
      )}

      <Input
        label="Nova Senha"
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
        label="Confirmar Nova Senha"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        autoComplete="new-password"
        disabled={isSubmitting}
      />

      <FormActions
        isEditing
        loading={isSubmitting}
        onCancel={() => router.back()}
        submitLabel="Salvar Alterações"
      />
    </FormContainer>
  );
}
