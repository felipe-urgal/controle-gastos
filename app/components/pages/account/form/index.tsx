'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaArrowRight, FaChartLine, FaCheck, FaInfoCircle, FaPalette, FaTimes, FaWallet } from 'react-icons/fa';

import { FormActions, FormContainer } from '@/app/components/forms';
import { ActiveToggle, ColorIconSelector, Input, RadioGroup } from '@/app/components/ui';
import IconRenderer, { ICON_MAP } from '@/app/components/ui/icon-renderer';
import {
  accountTypeOptions,
  currencyOptions,
  initialFormData,
} from '@/app/lib/constants/account.constants';
import { AccountFormProps } from '@/app/lib/interface/accounts.interface';
import { accountService } from '@/app/services/account-service';
import { AccountType } from '@/app/types/account';

const orbitSelectionTokens =
  '[--focus:var(--orbit-focus)] [--on-primary:var(--orbit-on-primary)] [--primary-hover:var(--orbit-primary-hover)] [--primary-subtle:var(--orbit-primary-subtle)] [--primary:var(--orbit-primary)]';

const mobileColors = [
  '#7C3AED',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#6B7280',
];

const mobilePrimaryIcons = [
  'wallet',
  'bank',
  'credit-card',
  'coins',
  'piggy-bank',
  'chart-line',
  'money-check',
  'university',
];

export default function AccountForm({ account, isEditing }: AccountFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState(() =>
    isEditing && account
      ? {
          name: account.name ?? '',
          type: account.type,
          currency: account.currency,
          color: account.color ?? '#7C3AED',
          icon: account.icon ?? 'wallet',
          description: account.description ?? '',
          isActive: account.isActive,
        }
      : initialFormData,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileStep, setMobileStep] = useState<1 | 2 | 3>(1);
  const [mobileStepError, setMobileStepError] = useState<string | null>(null);
  const [showAllMobileIcons, setShowAllMobileIcons] = useState(false);

  function handleRedirect() {
    if (isEditing && account?.id) {
      router.replace(`/contas/show/${account.id}`);
    } else {
      router.replace('/contas');
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

      if (isEditing && account) {
        await accountService.update(account.id, payload);
      } else {
        await accountService.create(payload);
      }

      handleRedirect();
    } catch (error: any) {
      const apiMessage =
        error?.response?.data?.error?.message ||
        error?.data?.error?.message ||
        error?.message;

      setSubmitError(apiMessage || 'Erro ao salvar conta');
    } finally {
      setIsSubmitting(false);
    }
  }

  const loading = isSubmitting;
  const allMobileIcons = Object.keys(ICON_MAP);
  const mobileIconOptions = showAllMobileIcons
    ? allMobileIcons
    : Array.from(new Set([formData.icon, ...mobilePrimaryIcons])).slice(0, 8);
  const mobileTypeLabel =
    formData.type === 'INVESTMENT' ? 'Investimentos' : 'Conta corrente';

  function goToMobileStep2() {
    if (!formData.name.trim()) {
      setMobileStepError('Informe o nome da conta.');
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

    setMobileStep((current) => (current - 1) as 1 | 2 | 3);
  }

  const mobileWizard = (
    <form onSubmit={handleSubmit} className={orbitSelectionTokens + ' lg:hidden'}>
      <div className="mx-auto w-full max-w-[430px] pb-4">
        <header className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 pt-1">
          <button
            type="button"
            onClick={goBackMobile}
            disabled={loading}
            aria-label="Voltar"
            className="grid h-11 w-11 place-items-center rounded-full text-lg text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-50"
          >
            <FaArrowLeft aria-hidden="true" />
          </button>
          <h1 className="truncate text-center text-[25px] font-extrabold tracking-tight text-[var(--foreground)] min-[390px]:text-[27px]">
            {isEditing ? 'Editar conta' : 'Nova conta'}
          </h1>
          <span className="text-right text-base font-extrabold text-[var(--orbit-primary)] min-[390px]:text-lg">
            {mobileStep}/3
          </span>
        </header>

        <section className="relative mt-7" aria-label="Etapas do formulário da conta">
          <div
            className="absolute left-[16.66%] right-[16.66%] top-[21px] h-[2px] bg-[color-mix(in_srgb,var(--orbit-primary)_26%,var(--border-strong))]"
            aria-hidden="true"
          />
          <div
            className="absolute left-[16.66%] top-[21px] h-[2px] bg-[var(--orbit-primary)] transition-[width]"
            style={{ width: mobileStep === 1 ? '0%' : mobileStep === 2 ? '33.34%' : '66.68%' }}
            aria-hidden="true"
          />
          <div className="relative grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center text-center">
              <span className="grid h-11 w-11 place-items-center rounded-full border border-[var(--orbit-primary)] bg-[var(--orbit-primary)] text-sm font-extrabold text-white shadow-[0_0_26px_color-mix(in_srgb,var(--orbit-primary)_42%,transparent)]">
                {mobileStep > 1 ? <FaCheck aria-hidden="true" /> : '1'}
              </span>
              <span className="mt-2 text-xs font-bold text-[var(--orbit-primary)] min-[390px]:text-sm">
                Dados da conta
              </span>
            </div>

            <div className="flex flex-col items-center text-center">
              <span
                className={
                  mobileStep >= 2
                    ? 'grid h-11 w-11 place-items-center rounded-full border border-[var(--orbit-primary)] bg-[var(--orbit-primary)] text-sm font-extrabold text-white'
                    : 'grid h-11 w-11 place-items-center rounded-full border-2 border-[color-mix(in_srgb,var(--orbit-primary)_28%,var(--border-strong))] bg-[var(--background)] text-sm font-bold text-[var(--text-muted)]'
                }
              >
                {mobileStep > 2 ? <FaCheck aria-hidden="true" /> : '2'}
              </span>
              <span
                className={
                  mobileStep >= 2
                    ? 'mt-2 text-xs font-bold text-[var(--orbit-primary)] min-[390px]:text-sm'
                    : 'mt-2 text-xs font-semibold text-[var(--text-muted)] min-[390px]:text-sm'
                }
              >
                Configurações
              </span>
            </div>

            <div className="flex flex-col items-center text-center">
              <span
                className={
                  mobileStep === 3
                    ? 'grid h-11 w-11 place-items-center rounded-full border border-[var(--orbit-primary)] bg-[var(--orbit-primary)] text-sm font-extrabold text-white'
                    : 'grid h-11 w-11 place-items-center rounded-full border-2 border-[color-mix(in_srgb,var(--orbit-primary)_28%,var(--border-strong))] bg-[var(--background)] text-sm font-bold text-[var(--text-muted)]'
                }
              >
                3
              </span>
              <span
                className={
                  mobileStep === 3
                    ? 'mt-2 text-xs font-bold text-[var(--orbit-primary)] min-[390px]:text-sm'
                    : 'mt-2 text-xs font-semibold text-[var(--text-muted)] min-[390px]:text-sm'
                }
              >
                Revisão
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
          <section className="mt-8 space-y-6" aria-labelledby="mobile-account-step-one">
            <div>
              <h2
                id="mobile-account-step-one"
                className="text-[30px] font-extrabold leading-[1.12] tracking-tight text-[var(--foreground)] min-[390px]:text-[32px]"
              >
                {isEditing ? 'Atualize sua conta' : 'Vamos criar sua conta'}
              </h2>
              <p className="mt-2 max-w-[330px] text-[16px] leading-[1.45] text-[var(--text-muted)]">
                Primeiro, escolha as informações básicas da sua conta.
              </p>
            </div>

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
              className="min-h-[58px] text-[16px]"
              placeholder="Minha conta"
              rightIcon={
                formData.name ? (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, name: '' });
                      setMobileStepError(null);
                    }}
                    disabled={loading}
                    aria-label="Limpar nome"
                    className="text-[var(--text-muted)]"
                  >
                    <FaTimes aria-hidden="true" />
                  </button>
                ) : undefined
              }
            />

            <fieldset>
              <legend className="mb-3 text-[16px] font-bold text-[var(--text-muted)]">
                Tipo de conta
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'CREDIT_DEBIT' })}
                  disabled={loading}
                  aria-pressed={formData.type === 'CREDIT_DEBIT'}
                  className={
                    formData.type === 'CREDIT_DEBIT'
                      ? 'relative min-h-[188px] rounded-[18px] border-2 border-[var(--orbit-primary)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--orbit-primary)_22%,var(--surface))_0%,var(--surface)_100%)] p-4 text-left shadow-[0_14px_30px_color-mix(in_srgb,var(--orbit-primary)_14%,transparent)]'
                      : 'relative min-h-[188px] rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 text-left'
                  }
                >
                  <span
                    className={
                      formData.type === 'CREDIT_DEBIT'
                        ? 'grid h-[54px] w-[54px] place-items-center rounded-[14px] bg-[var(--orbit-primary-subtle)] text-[22px] text-[var(--orbit-primary)]'
                        : 'grid h-[54px] w-[54px] place-items-center rounded-[14px] bg-[var(--surface-raised)] text-[22px] text-[var(--text-muted)]'
                    }
                  >
                    <FaWallet aria-hidden="true" />
                  </span>
                  <span className="mt-5 block text-[17px] font-extrabold leading-tight text-[var(--foreground)] min-[390px]:text-lg">
                    Conta corrente
                  </span>
                  <span className="mt-1.5 block text-[13px] leading-[1.45] text-[var(--text-muted)] min-[390px]:text-sm">
                    Para o seu dia a dia, com mais flexibilidade.
                  </span>
                  <span
                    className={
                      formData.type === 'CREDIT_DEBIT'
                        ? 'absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full border-2 border-[var(--orbit-primary)]'
                        : 'absolute right-3 top-3 h-7 w-7 rounded-full border-2 border-[var(--border-strong)]'
                    }
                    aria-hidden="true"
                  >
                    {formData.type === 'CREDIT_DEBIT' && (
                      <span className="h-3 w-3 rounded-full bg-[var(--orbit-primary)]" />
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'INVESTMENT' })}
                  disabled={loading}
                  aria-pressed={formData.type === 'INVESTMENT'}
                  className={
                    formData.type === 'INVESTMENT'
                      ? 'relative min-h-[188px] rounded-[18px] border-2 border-[var(--orbit-primary)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--orbit-primary)_22%,var(--surface))_0%,var(--surface)_100%)] p-4 text-left shadow-[0_14px_30px_color-mix(in_srgb,var(--orbit-primary)_14%,transparent)]'
                      : 'relative min-h-[188px] rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 text-left'
                  }
                >
                  <span
                    className={
                      formData.type === 'INVESTMENT'
                        ? 'grid h-[54px] w-[54px] place-items-center rounded-[14px] bg-[var(--orbit-primary-subtle)] text-[22px] text-[var(--orbit-primary)]'
                        : 'grid h-[54px] w-[54px] place-items-center rounded-[14px] bg-[var(--surface-raised)] text-[22px] text-[var(--text-muted)]'
                    }
                  >
                    <FaChartLine aria-hidden="true" />
                  </span>
                  <span className="mt-5 block text-[17px] font-extrabold leading-tight text-[var(--foreground)] min-[390px]:text-lg">
                    Investimentos
                  </span>
                  <span className="mt-1.5 block text-[13px] leading-[1.45] text-[var(--text-muted)] min-[390px]:text-sm">
                    Para fazer seu dinheiro crescer no longo prazo.
                  </span>
                  <span
                    className={
                      formData.type === 'INVESTMENT'
                        ? 'absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full border-2 border-[var(--orbit-primary)]'
                        : 'absolute right-3 top-3 h-7 w-7 rounded-full border-2 border-[var(--border-strong)]'
                    }
                    aria-hidden="true"
                  >
                    {formData.type === 'INVESTMENT' && (
                      <span className="h-3 w-3 rounded-full bg-[var(--orbit-primary)]" />
                    )}
                  </span>
                </button>
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-3 text-[16px] font-bold text-[var(--text-muted)]">
                Moeda da conta
              </legend>
              <div className="grid grid-cols-3 gap-2.5 min-[390px]:gap-3">
                {[
                  { value: 'BRL', symbol: '🇧🇷' },
                  { value: 'USD', symbol: '🇺🇸' },
                  { value: 'EUR', symbol: '🇪🇺' },
                ].map((currency) => (
                  <button
                    key={currency.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, currency: currency.value })}
                    disabled={loading}
                    aria-pressed={formData.currency === currency.value}
                    className={
                      formData.currency === currency.value
                        ? 'flex min-h-[68px] items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--orbit-primary)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--orbit-primary)_24%,var(--surface))_0%,var(--surface)_100%)] px-2 text-base font-extrabold text-[var(--foreground)]'
                        : 'flex min-h-[68px] items-center justify-center gap-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-2 text-base font-bold text-[var(--foreground)]'
                    }
                  >
                    <span className="grid h-8 w-8 place-items-center text-[22px] leading-none" aria-hidden="true">
                      {currency.symbol}
                    </span>
                    {currency.value}
                  </button>
                ))}
              </div>
              <p className="mt-4 flex items-start gap-2 text-[13px] leading-relaxed text-[var(--text-muted)] min-[390px]:text-sm">
                <FaInfoCircle className="mt-0.5 shrink-0" aria-hidden="true" />
                Você poderá alterar a moeda depois, se necessário.
              </p>
            </fieldset>

            <div className="space-y-4 pb-2 pt-1">
              <button
                type="button"
                onClick={goToMobileStep2}
                disabled={loading}
                className="flex min-h-[60px] w-full items-center justify-center gap-3 rounded-full bg-[linear-gradient(90deg,#7c3aed_0%,#8b5cf6_52%,#7c3aed_100%)] px-5 text-[18px] font-extrabold text-white shadow-[0_16px_36px_rgba(124,58,237,.32)] disabled:opacity-50"
              >
                Continuar
                <FaArrowRight aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleRedirect}
                disabled={loading}
                className="min-h-12 w-full text-[16px] font-semibold text-[var(--text-muted)]"
              >
                Cancelar
              </button>
            </div>
          </section>
        )}

        {mobileStep === 2 && (
          <section className="mt-9 space-y-7" aria-labelledby="mobile-account-step-two">
            <div>
              <h2
                id="mobile-account-step-two"
                className="text-[34px] font-extrabold leading-tight tracking-tight text-[var(--foreground)]"
              >
                Personalize sua conta
              </h2>
              <p className="mt-2 max-w-md text-base leading-relaxed text-[var(--text-muted)]">
                Escolha uma identidade visual e adicione um contexto, se quiser.
              </p>
            </div>

            <article
              className="flex items-center gap-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4"
              aria-label="Prévia da conta"
            >
              <span
                className="grid h-16 w-16 shrink-0 place-items-center rounded-[17px] text-2xl text-white"
                style={{ backgroundColor: formData.color }}
                aria-hidden="true"
              >
                <IconRenderer iconName={formData.icon} size={27} />
              </span>
              <div className="min-w-0">
                <strong className="block truncate text-xl font-extrabold text-[var(--foreground)]">
                  {formData.name || 'Minha conta'}
                </strong>
                <span className="mt-1 block truncate text-sm text-[var(--text-muted)]">
                  {mobileTypeLabel} · {formData.currency}
                </span>
              </div>
            </article>

            <fieldset>
              <legend className="mb-3 text-base font-bold text-[var(--text-muted)]">
                Cor da conta
              </legend>
              <div className="flex flex-wrap gap-3">
                {mobileColors.map((color) => {
                  const selected = formData.color.toUpperCase() === color.toUpperCase();
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      disabled={loading}
                      aria-label={'Selecionar cor ' + color}
                      aria-pressed={selected}
                      className={
                        selected
                          ? 'grid h-12 w-12 place-items-center rounded-full ring-2 ring-[var(--orbit-primary)] ring-offset-2 ring-offset-[var(--background)]'
                          : 'grid h-12 w-12 place-items-center rounded-full'
                      }
                      style={{ backgroundColor: color }}
                    >
                      {selected && <FaCheck className="text-white" aria-hidden="true" />}
                    </button>
                  );
                })}
                <label className="relative grid h-12 w-12 cursor-pointer place-items-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-muted)]">
                  <FaPalette aria-hidden="true" />
                  <span className="sr-only">Escolher cor personalizada</span>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(event) => setFormData({ ...formData, color: event.target.value })}
                    disabled={loading}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    aria-label="Escolher cor personalizada"
                  />
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-3 text-base font-bold text-[var(--text-muted)]">
                Ícone da conta
              </legend>
              <div className="grid grid-cols-4 gap-3">
                {mobileIconOptions.map((iconKey) => {
                  const selected = formData.icon === iconKey;
                  return (
                    <button
                      key={iconKey}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: iconKey })}
                      disabled={loading}
                      aria-label={'Selecionar ícone ' + (ICON_MAP[iconKey]?.label ?? iconKey)}
                      aria-pressed={selected}
                      className={
                        selected
                          ? 'relative grid aspect-square min-h-14 place-items-center rounded-[14px] border-2 border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] text-xl text-[var(--orbit-primary)]'
                          : 'grid aspect-square min-h-14 place-items-center rounded-[14px] border border-[var(--border)] bg-[var(--surface)] text-xl text-[var(--text-muted)]'
                      }
                    >
                      <IconRenderer iconName={iconKey} size={23} />
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setShowAllMobileIcons((current) => !current)}
                className="mt-3 min-h-11 text-sm font-bold text-[var(--orbit-primary)]"
              >
                {showAllMobileIcons ? 'Mostrar menos ícones' : 'Ver todos os ícones'}
              </button>
            </fieldset>

            <Input
              label="Descrição (opcional)"
              value={formData.description}
              onChange={(event) => setFormData({ ...formData, description: event.target.value })}
              disabled={loading}
              multiline
              rows={3}
              className="text-base"
              placeholder="Ex.: Minha conta principal, salário, etc."
            />

            {isEditing && (
              <div>
                <p className="mb-3 text-base font-bold text-[var(--text-muted)]">Status</p>
                <ActiveToggle
                  isActive={formData.isActive}
                  onToggle={(isActive) => setFormData({ ...formData, isActive })}
                  disabled={loading}
                  label="Conta ativa"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pb-2">
              <button
                type="button"
                onClick={() => setMobileStep(1)}
                disabled={loading}
                className="min-h-[54px] rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-base font-bold text-[var(--foreground)]"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => setMobileStep(3)}
                disabled={loading}
                className="flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-[var(--orbit-primary)] px-4 text-base font-extrabold text-white"
              >
                Continuar
                <FaArrowRight aria-hidden="true" />
              </button>
            </div>
          </section>
        )}

        {mobileStep === 3 && (
          <section className="mt-9 space-y-7" aria-labelledby="mobile-account-step-three">
            <div>
              <h2
                id="mobile-account-step-three"
                className="text-[34px] font-extrabold leading-tight tracking-tight text-[var(--foreground)]"
              >
                Revise sua conta
              </h2>
              <p className="mt-2 max-w-md text-base leading-relaxed text-[var(--text-muted)]">
                Confira os dados antes de {isEditing ? 'salvar as alterações' : 'criar a conta'}.
              </p>
            </div>

            <article
              className="relative overflow-hidden rounded-[24px] border border-[var(--orbit-primary)] p-5 shadow-[0_18px_38px_color-mix(in_srgb,var(--orbit-primary)_18%,transparent)]"
              style={{
                background:
                  'linear-gradient(135deg, ' +
                  formData.color +
                  '66 0%, #251744 48%, #10151b 100%)',
              }}
            >
              <div className="flex items-center gap-4">
                <span
                  className="grid h-[68px] w-[68px] shrink-0 place-items-center rounded-[18px] text-2xl text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]"
                  style={{ backgroundColor: formData.color }}
                  aria-hidden="true"
                >
                  <IconRenderer iconName={formData.icon} size={29} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-2xl font-extrabold text-white">
                    {formData.name || 'Minha conta'}
                  </h3>
                  <p className="mt-1 text-base text-white/70">{mobileTypeLabel}</p>
                </div>
                <strong className="text-base font-extrabold text-white/85">
                  {formData.currency}
                </strong>
              </div>
              {isEditing && (
                <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-bold text-white">
                  <span
                    className={
                      formData.isActive
                        ? 'h-2.5 w-2.5 rounded-full bg-[var(--income)]'
                        : 'h-2.5 w-2.5 rounded-full bg-white/35'
                    }
                    aria-hidden="true"
                  />
                  {formData.isActive ? 'Ativa' : 'Inativa'}
                </span>
              )}
            </article>

            <div className="overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-4">
                <span className="text-sm text-[var(--text-muted)]">Nome</span>
                <strong className="max-w-[65%] truncate text-right text-sm text-[var(--foreground)]">
                  {formData.name || '—'}
                </strong>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-4">
                <span className="text-sm text-[var(--text-muted)]">Tipo</span>
                <strong className="text-right text-sm text-[var(--foreground)]">
                  {mobileTypeLabel}
                </strong>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-4">
                <span className="text-sm text-[var(--text-muted)]">Moeda</span>
                <strong className="text-right text-sm text-[var(--foreground)]">
                  {formData.currency}
                </strong>
              </div>
              <div className="px-4 py-4">
                <span className="block text-sm text-[var(--text-muted)]">Descrição</span>
                <p className="mt-1 text-sm leading-relaxed text-[var(--foreground)]">
                  {formData.description || 'Sem descrição'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[.8fr_1.2fr] gap-3 pb-2">
              <button
                type="button"
                onClick={() => setMobileStep(2)}
                disabled={loading}
                className="min-h-[56px] rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-base font-bold text-[var(--foreground)]"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="min-h-[56px] rounded-full bg-[linear-gradient(90deg,#7c3aed_0%,#8b5cf6_50%,#7c3aed_100%)] px-4 text-base font-extrabold text-white shadow-[0_14px_32px_rgba(124,58,237,.28)] disabled:opacity-50"
              >
                {loading
                  ? isEditing
                    ? 'Salvando...'
                    : 'Criando...'
                  : isEditing
                    ? 'Salvar alterações'
                    : 'Criar conta'}
              </button>
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
      <section className="space-y-4 pb-5" aria-labelledby="account-main-fields">
        <div>
          <h2 id="account-main-fields" className="text-xl font-semibold text-[var(--foreground)]">
            Dados da conta
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
            Identifique a conta e defina como ela deve ser classificada. O saldo é calculado pelas movimentações concluídas.
          </p>
        </div>

        <Input
          label="Nome da conta"
          value={formData.name}
          onChange={(event) => setFormData({ ...formData, name: event.target.value })}
          disabled={loading}
          required
          icon={<FaInfoCircle />}
          placeholder="Ex.: Conta principal, Reserva, Investimentos"
        />

        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          <RadioGroup
            required
            label="Tipo de conta"
            name="accountType"
            value={formData.type}
            onChange={(value) => setFormData({ ...formData, type: value as AccountType })}
            options={accountTypeOptions}
            disabled={loading}
            className={orbitSelectionTokens}
          />

          <RadioGroup
            required
            label="Moeda"
            name="currency"
            value={formData.currency}
            onChange={(value) => setFormData({ ...formData, currency: String(value) })}
            options={currencyOptions}
            disabled={loading}
            className={orbitSelectionTokens}
          />
        </div>
      </section>

      <section
        className="space-y-4 border-t border-[var(--border)] py-5"
        aria-labelledby="account-visual-identity"
      >
        <div>
          <h2 id="account-visual-identity" className="flex items-center gap-2 text-xl font-semibold text-[var(--foreground)]">
            <FaPalette className="text-[var(--orbit-primary)]" aria-hidden="true" />
            Identidade visual
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
            Cor e ícone ajudam a reconhecer a conta rapidamente sem substituir nome, tipo ou status.
          </p>
        </div>

        <div className={orbitSelectionTokens}>
          <ColorIconSelector
            color={formData.color}
            icon={formData.icon}
            onColorChange={(color) => setFormData({ ...formData, color })}
            onIconChange={(icon) => setFormData({ ...formData, icon })}
            disabled={loading}
          />
        </div>

        <Input
          label="Descrição"
          value={formData.description}
          onChange={(event) => setFormData({ ...formData, description: event.target.value })}
          disabled={loading}
          multiline
          rows={3}
          placeholder="Adicione um contexto opcional para esta conta"
        />
      </section>

      {isEditing && (
        <section
          className="border-t border-[var(--border)] py-5"
          aria-labelledby="account-status-heading"
        >
          <div className="mb-4">
            <h2 id="account-status-heading" className="text-xl font-semibold text-[var(--foreground)]">
              Status da conta
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
              Contas inativas permanecem no histórico, mas ficam visualmente diferenciadas nas listagens.
            </p>
          </div>

          <ActiveToggle
            isActive={formData.isActive}
            onToggle={(isActive) => setFormData({ ...formData, isActive })}
            disabled={loading}
            label="Conta ativa"
          />
        </section>
      )}

      <div className={orbitSelectionTokens}>
        <FormActions
          isEditing={isEditing}
          loading={loading}
          onCancel={handleRedirect}
          createLabel="Criar conta"
          submitLabel="Salvar alterações"
        />
      </div>
        </FormContainer>
      </div>
    </>
  );
}
