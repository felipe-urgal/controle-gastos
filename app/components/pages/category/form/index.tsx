'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaInfoCircle, FaPalette } from 'react-icons/fa';

import { FormActions, FormContainer } from '@/app/components/forms';
import { ActiveToggle, ColorIconSelector, Input, RadioGroup } from '@/app/components/ui';
import {
  categoryTypeOptions,
  initialFormData,
} from '@/app/lib/constants/category.constants';
import { CategoryFormProps } from '@/app/lib/interface/category.interface';
import { categoryService } from '@/app/services/category-service';
import { CategoryType } from '@/app/types/category';

export default function CategoryForm({ category, isEditing }: CategoryFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState(() =>
    isEditing && category
      ? {
          name: category.name ?? '',
          type: category.type,
          color: category.color ?? '#3B82F6',
          icon: category.icon ?? 'tag',
          description: category.description ?? '',
          isActive: category.isActive,
        }
      : initialFormData,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleRedirect() {
    if (isEditing && category?.id) {
      router.replace(`/categorias/show/${category.id}`);
    } else {
      router.replace('/categorias');
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        ...formData,
        description: formData.description || null,
      };

      if (isEditing && category) {
        await categoryService.update(category.id, payload);
      } else {
        await categoryService.create(payload);
      }

      handleRedirect();
    } catch (error: any) {
      const apiMessage =
        error?.response?.data?.error?.message ||
        error?.data?.error?.message ||
        error?.message;

      setSubmitError(apiMessage || 'Erro ao salvar categoria');
    } finally {
      setIsSubmitting(false);
    }
  }

  const loading = isSubmitting;

  return (
    <FormContainer
      onSubmit={handleSubmit}
      error={submitError}
      onClearError={() => setSubmitError(null)}
      className="mt-2 gap-0"
    >
      <section className="space-y-4 pb-5" aria-labelledby="category-main-fields">
        <div>
          <h2 id="category-main-fields" className="text-xl font-semibold text-[var(--foreground)]">
            Dados da categoria
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
            O tipo é a referência financeira usada quando esta categoria participa da criação ou edição de uma transação.
          </p>
        </div>

        <Input
          label="Nome da categoria"
          value={formData.name}
          onChange={(event) => setFormData({ ...formData, name: event.target.value })}
          disabled={loading}
          required
          icon={<FaInfoCircle />}
          placeholder="Ex.: Alimentação, Salário, Transporte"
        />

        <RadioGroup
          required
          label="Tipo da categoria"
          name="categoryType"
          value={formData.type}
          onChange={(value) => setFormData({ ...formData, type: value as CategoryType })}
          options={categoryTypeOptions}
          disabled={loading}
        />
      </section>

      <section
        className="space-y-4 border-t border-[var(--border)] py-5"
        aria-labelledby="category-visual-identity"
      >
        <div>
          <h2 id="category-visual-identity" className="flex items-center gap-2 text-xl font-semibold text-[var(--foreground)]">
            <FaPalette className="text-[var(--primary)]" aria-hidden="true" />
            Identidade visual
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
            Escolha cor e ícone para reconhecimento rápido. Nome e tipo continuam sendo os sinais semânticos principais.
          </p>
        </div>

        <ColorIconSelector
          color={formData.color}
          icon={formData.icon}
          onColorChange={(color) => setFormData({ ...formData, color })}
          onIconChange={(icon) => setFormData({ ...formData, icon })}
          disabled={loading}
        />

        <Input
          label="Descrição"
          value={formData.description}
          onChange={(event) => setFormData({ ...formData, description: event.target.value })}
          disabled={loading}
          multiline
          rows={3}
          placeholder="Adicione um contexto opcional para esta categoria"
        />
      </section>

      {isEditing && (
        <section
          className="border-t border-[var(--border)] py-5"
          aria-labelledby="category-status-heading"
        >
          <div className="mb-4">
            <h2 id="category-status-heading" className="text-xl font-semibold text-[var(--foreground)]">
              Status da categoria
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
              Categorias inativas permanecem disponíveis no histórico, mas são diferenciadas nas listagens.
            </p>
          </div>

          <ActiveToggle
            isActive={formData.isActive}
            onToggle={(isActive) => setFormData({ ...formData, isActive })}
            disabled={loading}
            label="Categoria ativa"
          />
        </section>
      )}

      <FormActions
        isEditing={isEditing}
        loading={loading}
        onCancel={handleRedirect}
        createLabel="Criar categoria"
        submitLabel="Salvar alterações"
      />
    </FormContainer>
  );
}
