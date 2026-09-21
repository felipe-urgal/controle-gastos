'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaArrowDown,
  FaArrowLeft,
  FaArrowRight,
  FaArrowUp,
  FaInfoCircle,
  FaPalette,
} from 'react-icons/fa';

import { FormActions, FormContainer } from '@/app/components/forms';
import { ActiveToggle, ColorIconSelector, Input, RadioGroup } from '@/app/components/ui';
import IconRenderer from '@/app/components/ui/icon-renderer';
import {
  categoryTypeOptions,
  initialFormData,
} from '@/app/lib/constants/category.constants';
import { CategoryFormProps } from '@/app/lib/interface/category.interface';
import { categoryService } from '@/app/services/category-service';
import { CategoryType } from '@/app/types/category';

const orbitSelectionTokens =
  '[--focus:var(--orbit-focus)] [--on-primary:var(--orbit-on-primary)] [--primary-hover:var(--orbit-primary-hover)] [--primary-subtle:var(--orbit-primary-subtle)] [--primary:var(--orbit-primary)]';

const mobileColors = [
  '#EF4444',
  '#F97316',
  '#FBBF24',
  '#34D399',
  '#3B82F6',
  '#7C3AED',
  '#A855F7',
  '#EC4899',
];

const mobileIcons = [
  'food',
  'transport',
  'housing',
  'groceries',
  'games',
  'health',
  'travel',
  'education',
  'personal',
  'tag',
];

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
  const [mobileStep, setMobileStep] = useState<1 | 2>(1);
  const [mobileStepError, setMobileStepError] = useState<string | null>(null);

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
  const mobileColorOptions = Array.from(
    new Set([formData.color, ...mobileColors]),
  ).slice(0, 8);
  const mobileIconOptions = Array.from(
    new Set([formData.icon, ...mobileIcons]),
  ).slice(0, 10);

  function goToMobileStep2() {
    if (!formData.name.trim()) {
      setMobileStepError('Informe o nome da categoria.');
      return;
    }

    setMobileStepError(null);
    setMobileStep(2);
  }

  function goBackMobile() {
    setMobileStepError(null);

    if (mobileStep === 1) {
      handleRedirect();
      return;
    }

    setMobileStep(1);
  }

  const mobileWizard = (
    <form onSubmit={handleSubmit} className={orbitSelectionTokens + ' lg:hidden'}>
      <div className="mx-auto w-full max-w-[430px] pb-5">
        <header className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={goBackMobile}
            disabled={loading}
            aria-label="Voltar"
            className="grid h-11 w-11 place-items-center rounded-full text-lg text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-50"
          >
            <FaArrowLeft aria-hidden="true" />
          </button>
          <h1 className="truncate text-left text-[20px] font-bold tracking-tight text-[var(--foreground)]">
            {isEditing ? 'Editar categoria' : 'Nova categoria'}
          </h1>
        </header>

        <section
          className="relative mx-auto mt-8 max-w-[260px]"
          aria-label="Etapas do formulário da categoria"
        >
          <div
            className="absolute left-[22%] right-[22%] top-[18px] h-[2px] bg-[color-mix(in_srgb,var(--orbit-primary)_20%,var(--border-strong))]"
            aria-hidden="true"
          />
          <div
            className={`absolute left-[22%] top-[18px] h-[2px] bg-[var(--orbit-primary)] transition-[width] ${
              mobileStep === 2 ? 'w-[56%]' : 'w-0'
            }`}
            aria-hidden="true"
          />
          <div className="relative grid grid-cols-2">
            <div className="flex flex-col items-center">
              <span
                className={`grid h-9 w-9 place-items-center rounded-full border text-sm font-extrabold ${
                  mobileStep >= 1
                    ? 'border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)] shadow-[0_0_22px_color-mix(in_srgb,var(--orbit-primary)_34%,transparent)]'
                    : 'border-[var(--border-strong)] bg-[var(--background)] text-[var(--text-muted)]'
                }`}
              >
                1
              </span>
              <span
                className={`mt-2 text-sm font-semibold ${
                  mobileStep === 1
                    ? 'text-[var(--orbit-primary)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                Básico
              </span>
            </div>

            <div className="flex flex-col items-center">
              <span
                className={`grid h-9 w-9 place-items-center rounded-full border text-sm font-extrabold ${
                  mobileStep === 2
                    ? 'border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)] shadow-[0_0_22px_color-mix(in_srgb,var(--orbit-primary)_34%,transparent)]'
                    : 'border-[color-mix(in_srgb,var(--orbit-primary)_24%,var(--border-strong))] bg-[var(--background)] text-[var(--text-muted)]'
                }`}
              >
                2
              </span>
              <span
                className={`mt-2 text-sm font-semibold ${
                  mobileStep === 2
                    ? 'text-[var(--orbit-primary)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                Aparência
              </span>
            </div>
          </div>
        </section>

        {submitError && (
          <div
            role="alert"
            className="mt-5 rounded-[14px] border border-[var(--expense)]/35 bg-[var(--danger-subtle)] px-4 py-3 text-sm text-[var(--expense)]"
          >
            {submitError}
          </div>
        )}

        {mobileStep === 1 && (
          <section
            className="mt-8 flex min-h-[560px] flex-col"
            aria-labelledby="mobile-category-step-one"
          >
            <div>
              <h2
                id="mobile-category-step-one"
                className="text-[30px] font-extrabold leading-[1.12] tracking-tight text-[var(--foreground)]"
              >
                {isEditing ? 'Atualize sua categoria' : 'Vamos começar'}
              </h2>
              <p className="mt-2 max-w-[335px] text-[16px] leading-[1.5] text-[var(--text-muted)]">
                Dê um nome e escolha o tipo da categoria.
              </p>
            </div>

            <div className="mt-8">
              <Input
                label="Nome"
                value={formData.name}
                onChange={(event) => {
                  setFormData({ ...formData, name: event.target.value });
                  if (mobileStepError) setMobileStepError(null);
                }}
                disabled={loading}
                required
                error={mobileStepError ?? undefined}
                className="min-h-[52px] text-[16px]"
                placeholder="Ex: Alimentação"
              />
            </div>

            <fieldset className="mt-7">
              <legend className="mb-3 text-[16px] font-bold text-[var(--foreground)]">
                Tipo
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'EXPENSE' })}
                  disabled={loading}
                  aria-pressed={formData.type === 'EXPENSE'}
                  className={`min-h-[164px] rounded-[12px] border p-4 text-center transition-colors ${
                    formData.type === 'EXPENSE'
                      ? 'border-2 border-[var(--orbit-primary)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--orbit-primary)_34%,var(--surface))_0%,color-mix(in_srgb,var(--orbit-primary)_18%,var(--surface))_100%)] shadow-[0_12px_30px_color-mix(in_srgb,var(--orbit-primary)_18%,transparent)]'
                      : 'border-[var(--border)] bg-[var(--surface)]'
                  }`}
                >
                  <FaArrowDown
                    className={`mx-auto mt-1 text-[38px] ${
                      formData.type === 'EXPENSE'
                        ? 'text-[var(--orbit-primary)]'
                        : 'text-[var(--text-muted)]'
                    }`}
                    aria-hidden="true"
                  />
                  <strong className="mt-3 block text-[18px] font-extrabold text-[var(--foreground)]">
                    Despesa
                  </strong>
                  <span className="mt-1 block text-[13px] leading-[1.35] text-[var(--text-muted)]">
                    Gastos, contas
                    <br />
                    e despesas
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'INCOME' })}
                  disabled={loading}
                  aria-pressed={formData.type === 'INCOME'}
                  className={`min-h-[164px] rounded-[12px] border p-4 text-center transition-colors ${
                    formData.type === 'INCOME'
                      ? 'border-2 border-[var(--orbit-primary)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--orbit-primary)_34%,var(--surface))_0%,color-mix(in_srgb,var(--orbit-primary)_18%,var(--surface))_100%)] shadow-[0_12px_30px_color-mix(in_srgb,var(--orbit-primary)_18%,transparent)]'
                      : 'border-[var(--border)] bg-[var(--surface)]'
                  }`}
                >
                  <FaArrowUp
                    className={`mx-auto mt-1 text-[38px] ${
                      formData.type === 'INCOME'
                        ? 'text-[var(--orbit-primary)]'
                        : 'text-[var(--text-muted)]'
                    }`}
                    aria-hidden="true"
                  />
                  <strong className="mt-3 block text-[18px] font-extrabold text-[var(--foreground)]">
                    Receita
                  </strong>
                  <span className="mt-1 block text-[13px] leading-[1.35] text-[var(--text-muted)]">
                    Entradas
                    <br />
                    de dinheiro
                  </span>
                </button>
              </div>
            </fieldset>

            <div className="mt-auto pt-10">
              <button
                type="button"
                onClick={goToMobileStep2}
                disabled={loading}
                className="flex min-h-[55px] w-full items-center justify-center gap-3 rounded-[10px] bg-[linear-gradient(90deg,#6d28d9_0%,#8b5cf6_52%,#7c3aed_100%)] px-5 text-[18px] font-extrabold text-white shadow-[0_16px_36px_rgba(124,58,237,.30)] disabled:opacity-50"
              >
                Continuar
                <FaArrowRight aria-hidden="true" />
              </button>

              <div className="mt-12 flex items-center justify-center gap-3" aria-hidden="true">
                <span className="h-3.5 w-3.5 rounded-full bg-[var(--orbit-primary)]" />
                <span className="h-3.5 w-3.5 rounded-full bg-[color-mix(in_srgb,var(--orbit-primary)_22%,var(--surface-raised))]" />
              </div>
            </div>
          </section>
        )}

        {mobileStep === 2 && (
          <section
            className="mt-8 flex min-h-[560px] flex-col"
            aria-labelledby="mobile-category-step-two"
          >
            <div>
              <h2
                id="mobile-category-step-two"
                className="text-[30px] font-extrabold leading-[1.12] tracking-tight text-[var(--foreground)]"
              >
                Dê personalidade
              </h2>
              <p className="mt-2 max-w-[350px] text-[16px] leading-[1.5] text-[var(--text-muted)]">
                Escolha uma cor, um ícone e, se quiser, adicione uma descrição.
              </p>
            </div>

            <fieldset className="mt-8">
              <legend className="mb-3 text-[16px] font-bold text-[var(--foreground)]">
                Cor
              </legend>
              <div className="flex flex-wrap gap-3">
                {mobileColorOptions.map((color) => {
                  const selected = formData.color.toUpperCase() === color.toUpperCase();
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      disabled={loading}
                      aria-label={`Selecionar cor ${color}`}
                      aria-pressed={selected}
                      className={`grid h-10 w-10 place-items-center rounded-full border-2 transition-transform ${
                        selected
                          ? 'scale-110 border-[var(--foreground)]'
                          : 'border-transparent'
                      }`}
                    >
                      <span
                        className="h-8 w-8 rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)]"
                        style={{ backgroundColor: color }}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="mt-7">
              <legend className="mb-3 text-[16px] font-bold text-[var(--foreground)]">
                Ícone
              </legend>
              <div className="grid grid-cols-5 gap-2.5">
                {mobileIconOptions.map((icon) => {
                  const selected = formData.icon === icon;
                  return (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      disabled={loading}
                      aria-label={`Selecionar ícone ${icon}`}
                      aria-pressed={selected}
                      className={`grid h-[54px] place-items-center rounded-[12px] border text-[20px] transition-colors ${
                        selected
                          ? 'border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'
                          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]'
                      }`}
                    >
                      <IconRenderer iconName={icon} size={21} />
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-7">
              <Input
                label="Descrição (opcional)"
                value={formData.description}
                onChange={(event) =>
                  setFormData({ ...formData, description: event.target.value })
                }
                disabled={loading}
                className="min-h-[58px] text-[16px]"
                placeholder="Ex: Alimentação do dia a dia"
              />
            </div>

            {isEditing && (
              <div className="mt-7 rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4">
                <ActiveToggle
                  isActive={formData.isActive}
                  onToggle={(isActive) => setFormData({ ...formData, isActive })}
                  disabled={loading}
                  label="Categoria ativa"
                />
              </div>
            )}

            <div className="mt-auto pt-10">
              <div className="grid grid-cols-[.9fr_1.4fr] gap-3">
              <button
                type="button"
                onClick={() => setMobileStep(1)}
                disabled={loading}
                className="min-h-[58px] rounded-[12px] border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-[16px] font-bold text-[var(--text-muted)] disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="min-h-[58px] rounded-[12px] bg-[linear-gradient(90deg,#6d28d9_0%,#8b5cf6_52%,#7c3aed_100%)] px-4 text-[16px] font-extrabold text-white shadow-[0_16px_36px_rgba(124,58,237,.30)] disabled:opacity-50"
              >
                {loading
                  ? isEditing
                    ? 'Salvando...'
                    : 'Criando...'
                  : isEditing
                    ? 'Salvar alterações'
                    : 'Criar categoria'}
              </button>
              </div>

              <div className="mt-10 flex items-center justify-center gap-3" aria-hidden="true">
                <span className="h-3.5 w-3.5 rounded-full bg-[color-mix(in_srgb,var(--orbit-primary)_22%,var(--surface-raised))]" />
                <span className="h-3.5 w-3.5 rounded-full bg-[var(--orbit-primary)]" />
              </div>
            </div>
          </section>
        )}
      </div>
    </form>
  );

  return (
    <>
      {mobileWizard}

      <div className="hidden lg:block">
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
      </div>
    </>
  );
}
