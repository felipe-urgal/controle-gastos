'use client';

import { FaArrowLeft } from 'react-icons/fa';

import { appBarTitleClassName } from '@/app/components/base-pages/page-title';
import { FormActions, FormContainer } from '@/app/components/forms';
import { CategoryFormCard } from '@/app/components/pages/category/form/category-form-card';
import {
  categoryNameSuggestions,
  categoryTypeCards,
  categoryTypeLocked,
} from '@/app/components/pages/category/form/category-form-model';
import { ActiveToggle, Chip, IconButton, Input, ShowBelow } from '@/app/components/ui';
import { useCategoryForm } from '@/app/hooks/categories/use-category-form';
import { CATEGORY_DESCRIPTION_MAX_LENGTH } from '@/app/lib/categories/category-limits';
import { CategoryFormProps } from '@/app/lib/interface/category.interface';
import type { CategoryType } from '@/app/types/category';

const orbitSelectionTokens =
  '[--focus:var(--orbit-focus)] [--on-primary:var(--orbit-on-primary)] [--primary-hover:var(--orbit-primary-hover)] [--primary-subtle:var(--orbit-primary-subtle)] [--primary:var(--orbit-primary)]';

export default function CategoryForm({ category, isEditing }: CategoryFormProps) {
  const {
    formData,
    setFormData,
    monthlyLimit,
    setMonthlyLimit,
    limitCurrency,
    setLimitCurrency,
    submitError,
    setSubmitError,
    isSubmitting,
    handleSubmit,
    handleRedirect,
  } = useCategoryForm({ category, isEditing });
  const typeLocked = categoryTypeLocked(isEditing);
  const loading = isSubmitting;

  function chooseType(type: CategoryType) {
    if (typeLocked || type === formData.type) return;
    setFormData({ ...formData, type });
  }

  return (
    <div className={`w-full ${orbitSelectionTokens}`}>
      <ShowBelow breakpoint="lg">
        <header className="mb-4 grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
          <IconButton
            label="Voltar"
            icon={<FaArrowLeft />}
            onClick={handleRedirect}
            disabled={loading}
            className="rounded-full text-lg text-[var(--foreground)]"
          />
          <h1 className={`text-center ${appBarTitleClassName}`}>{isEditing ? 'Editar categoria' : 'Nova categoria'}</h1>
          <span aria-hidden="true" />
        </header>
      </ShowBelow>

      <FormContainer
        bare
        onSubmit={handleSubmit}
        error={submitError}
        onClearError={() => setSubmitError(null)}
        className="gap-5"
      >
        <div role="group" aria-label="Tipo de categoria" className="grid grid-cols-2 gap-2">
          {categoryTypeCards.map((option) => (
            <Chip
              key={option.value}
              selected={formData.type === option.value}
              onClick={() => chooseType(option.value)}
              disabled={loading || typeLocked}
              className="w-full px-2"
            >
              {option.label}
            </Chip>
          ))}
        </div>
        <p className="-mt-2 px-1 text-sm text-[var(--text-muted)]">
          {categoryTypeCards.find((option) => option.value === formData.type)?.description}
        </p>

        {typeLocked && (
          <div role="note" className="flex items-start gap-2.5 rounded-[var(--radius-md)] bg-[var(--warning-subtle)] px-3.5 py-3 text-sm leading-relaxed text-[var(--warning)]">
            <span aria-hidden="true">🔒</span>
            <span>
              <strong className="text-[var(--foreground)]">O tipo não muda depois de criada.</strong>{' '}
              Para trocar, crie outra categoria e mova as transações.
            </span>
          </div>
        )}

        <CategoryFormCard
          values={formData}
          onChange={(patch) => setFormData({ ...formData, ...patch })}
          loading={loading}
          isEditing={isEditing}
          monthlyLimit={monthlyLimit}
          onMonthlyLimitChange={setMonthlyLimit}
          limitCurrency={limitCurrency}
          onLimitCurrencyChange={setLimitCurrency}
        />

        {!isEditing && (
          <div className="-mt-1 flex flex-wrap items-center gap-2" aria-label="Sugestões de nome">
            <span className="text-sm text-[var(--text-muted)]">Sugestões:</span>
            {categoryNameSuggestions(formData.type).map((name) => (
              <Chip key={name} onClick={() => setFormData({ ...formData, name })} disabled={loading} className="font-medium">
                {name}
              </Chip>
            ))}
          </div>
        )}

        <details className="group rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--radius-lg)] px-4 text-base font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] [&::-webkit-details-marker]:hidden">
            <span>Mais opções</span>
            <span className="text-sm font-normal text-[var(--text-muted)]">descrição{isEditing ? ' e status' : ''}</span>
          </summary>
          <div className="grid gap-4 px-4 pb-4">
            <Input
              label="Descrição"
              maxLength={CATEGORY_DESCRIPTION_MAX_LENGTH}
              value={formData.description}
              onChange={(event) => setFormData({ ...formData, description: event.target.value })}
              disabled={loading}
              multiline
              rows={3}
              placeholder="Algo para lembrar o que entra nesta categoria"
            />
            {isEditing && (
              <div>
                <p className="mb-2 text-sm text-[var(--text-muted)]">
                  Inativar guarda o histórico e tira a categoria dos lançamentos novos.
                </p>
                <ActiveToggle
                  isActive={formData.isActive}
                  onToggle={(isActive) => setFormData({ ...formData, isActive })}
                  disabled={loading}
                  label="Categoria ativa"
                />
              </div>
            )}
          </div>
        </details>

        <div className="max-lg:sticky max-lg:bottom-0 max-lg:-mx-1 max-lg:bg-[var(--background)] max-lg:px-1 max-lg:pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <FormActions
            isEditing={isEditing}
            loading={loading}
            onCancel={handleRedirect}
            createLabel="Criar categoria"
            submitLabel="Salvar alterações"
          />
        </div>
      </FormContainer>
    </div>
  );
}
