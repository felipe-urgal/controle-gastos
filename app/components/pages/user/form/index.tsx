"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/app/services/auth-service";

import { Input } from "@/app/components/ui";
import { FormContainer, FormActions } from "@/app/components/forms";

interface UserFormProps {
  user: {
    id: string;
    name: string;
    email?: string;
    showValues?: boolean;
  };
}

export default function UserForm({ user }: UserFormProps) {
  const router = useRouter();

  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSubmitError(null);

    if (newPassword && newPassword !== confirmPassword) {
      setSubmitError("As senhas não coincidem");
      return;
    }

    if (newPassword && !currentPassword) {
      setSubmitError("Informe a senha atual para alterar a senha");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: any = {};

      if (name.trim() !== user.name) {
        payload.name = name.trim();
      }

      if (newPassword) {
        payload.password = newPassword;
        payload.currentPassword = currentPassword;
      }

      if (Object.keys(payload).length === 0) {
        setSubmitError("Nenhuma alteração realizada");
        return;
      }

      await authService.updateUser(payload);

      router.replace(`/usuario/show/${user.id}`);
      router.refresh();
    } catch (err: any) {
      const apiMessage =
        err?.data?.message ||
        err?.message;

      setSubmitError(apiMessage || "Erro ao atualizar usuário");
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

      <Input
        label="Senha Atual"
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        disabled={isSubmitting}
      />

      <Input
        label="Nova Senha"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        disabled={isSubmitting}
      />

      <Input
        label="Confirmar Nova Senha"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
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
};
