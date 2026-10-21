'use client';

import { appBarTitleClassName } from '@/app/components/base-pages/page-title';
import { useAccountForm } from '@/app/hooks/accounts/use-account-form';
import { useMediaQuery } from '@/app/hooks/use-media-query';
import { useState } from 'react';
import { FaArrowLeft, FaArrowRight, FaChartLine, FaCheck, FaCreditCard, FaInfoCircle, FaPalette, FaTimes, FaWallet } from 'react-icons/fa';

import { FormActions, FormContainer } from '@/app/components/forms';
import { ActiveToggle, Button, ColorIconSelector, IconButton, IconRenderer, Input, RadioGroup } from '@/app/components/ui';
import {
  ACCOUNT_DESCRIPTION_MAX_LENGTH,
  ACCOUNT_NAME_MAX_LENGTH,
  accountTypeOptions,
  currencyOptions,
} from '@/app/lib/constants/account.constants';
import { AccountFormProps } from '@/app/lib/interface/accounts.interface';
import { AccountType } from '@/app/types/account';

const orbitSelectionTokens =
  '[--focus:var(--orbit-focus)] [--on-primary:var(--orbit-on-primary)] [--primary-hover:var(--orbit-primary-hover)] [--primary-subtle:var(--orbit-primary-subtle)] [--primary:var(--orbit-primary)]';

export default function AccountForm({ account, isEditing }: AccountFormProps) {
  const { formData, setFormData, submitError, setSubmitError, isSubmitting, handleSubmit, handleRedirect } =
    useAccountForm({ account, isEditing });
  const [mobileStep, setMobileStep] = useState<1 | 2 | 3>(1);
  const [mobileStepError, setMobileStepError] = useState<string | null>(null);
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const loading = isSubmitting;
  const mobileTypeLabel =
    formData.type === 'INVESTMENT'
      ? 'Investimentos'
      : formData.type === 'CREDIT_CARD'
        ? 'Cartão de crédito'
        : 'Conta corrente';

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
    <form onSubmit={handleSubmit} className={orbitSelectionTokens}>
      <div className="mx-auto w-full max-w-3xl pb-4">
        <header className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 pt-1">
          <IconButton
            label="Voltar"
            icon={<FaArrowLeft />}
            onClick={goBackMobile}
            disabled={loading}
            className="rounded-full text-lg text-[var(--foreground)]"
          />
          <h1 className={`text-center ${appBarTitleClassName}`}>
            {isEditing ? 'Editar conta' : 'Nova conta'}
          </h1>
          <span className="text-right text-base font-extrabold text-[var(--orbit-primary)] min-[360px]:text-lg">
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
              <span className="mt-2 text-xs font-bold text-[var(--orbit-primary)] min-[360px]:text-sm">
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
                    ? 'mt-2 text-xs font-bold text-[var(--orbit-primary)] min-[360px]:text-sm'
                    : 'mt-2 text-xs font-semibold text-[var(--text-muted)] min-[360px]:text-sm'
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
                    ? 'mt-2 text-xs font-bold text-[var(--orbit-primary)] min-[360px]:text-sm'
                    : 'mt-2 text-xs font-semibold text-[var(--text-muted)] min-[360px]:text-sm'
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
                className="text-[30px] font-extrabold leading-[1.12] tracking-tight text-[var(--foreground)] min-[360px]:text-[32px]"
              >
                {isEditing ? 'Atualize sua conta' : 'Vamos criar sua conta'}
              </h2>
              <p className="mt-2 max-w-[330px] text-[16px] leading-[1.45] text-[var(--text-muted)]">
                Primeiro, escolha as informações básicas da sua conta.
              </p>
            </div>

            <Input
              label="Nome"
              maxLength={ACCOUNT_NAME_MAX_LENGTH}
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
                  <IconButton
                    label="Limpar nome"
                    icon={<FaTimes />}
                    onClick={() => {
                      setFormData({ ...formData, name: '' });
                      setMobileStepError(null);
                    }}
                    disabled={loading}
                  />
                ) : undefined
              }
            />

            <fieldset>
              <legend className="mb-3 text-[16px] font-bold text-[var(--text-muted)]">
                Tipo de conta
              </legend>
              <div className="grid gap-3 sm:grid-cols-3">
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
                  <span className="mt-5 block text-[17px] font-extrabold leading-tight text-[var(--foreground)] min-[360px]:text-lg">
                    Conta corrente
                  </span>
                  <span className="mt-1.5 block text-[13px] leading-[1.45] text-[var(--text-muted)] min-[360px]:text-sm">
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
                  <span className="mt-5 block text-[17px] font-extrabold leading-tight text-[var(--foreground)] min-[360px]:text-lg">
                    Investimentos
                  </span>
                  <span className="mt-1.5 block text-[13px] leading-[1.45] text-[var(--text-muted)] min-[360px]:text-sm">
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

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'CREDIT_CARD', icon: formData.icon === 'wallet' ? 'credit-card' : formData.icon })}
                  disabled={loading}
                  aria-pressed={formData.type === 'CREDIT_CARD'}
                  className={
                    formData.type === 'CREDIT_CARD'
                      ? 'relative min-h-[188px] rounded-[18px] border-2 border-[var(--orbit-primary)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--orbit-primary)_22%,var(--surface))_0%,var(--surface)_100%)] p-4 text-left shadow-[0_14px_30px_color-mix(in_srgb,var(--orbit-primary)_14%,transparent)]'
                      : 'relative min-h-[188px] rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 text-left'
                  }
                >
                  <span
                    className={
                      formData.type === 'CREDIT_CARD'
                        ? 'grid h-[54px] w-[54px] place-items-center rounded-[14px] bg-[var(--orbit-primary-subtle)] text-[22px] text-[var(--orbit-primary)]'
                        : 'grid h-[54px] w-[54px] place-items-center rounded-[14px] bg-[var(--surface-raised)] text-[22px] text-[var(--text-muted)]'
                    }
                  >
                    <FaCreditCard aria-hidden="true" />
                  </span>
                  <span className="mt-5 block text-[17px] font-extrabold leading-tight text-[var(--foreground)] min-[360px]:text-lg">
                    Cartão
                  </span>
                  <span className="mt-1.5 block text-[13px] leading-[1.45] text-[var(--text-muted)] min-[360px]:text-sm">
                    Compras, limite e faturas em um único ciclo.
                  </span>
                  <span
                    className={
                      formData.type === 'CREDIT_CARD'
                        ? 'absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full border-2 border-[var(--orbit-primary)]'
                        : 'absolute right-3 top-3 h-7 w-7 rounded-full border-2 border-[var(--border-strong)]'
                    }
                    aria-hidden="true"
                  >
                    {formData.type === 'CREDIT_CARD' && (
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
              <div className="grid grid-cols-3 gap-2.5 min-[360px]:gap-3">
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
              <p className="mt-4 flex items-start gap-2 text-[13px] leading-relaxed text-[var(--text-muted)] min-[360px]:text-sm">
                <FaInfoCircle className="mt-0.5 shrink-0" aria-hidden="true" />
                Você poderá alterar a moeda depois, se necessário.
              </p>
            </fieldset>

            {formData.type === 'CREDIT_CARD' && (
              <div className="grid gap-4 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4">
                <div>
                  <h3 className="text-base font-extrabold text-[var(--foreground)]">Ciclo do cartão</h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Esses dados definem as faturas e o limite disponível.
                  </p>
                </div>
                <Input
                  label="Limite"
                  value={formData.creditLimit}
                  onChange={(event) => setFormData({ ...formData, creditLimit: event.target.value })}
                  disabled={loading}
                  inputMode="decimal"
                  placeholder="5000,00"
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Fechamento"
                    type="number"
                    min={1}
                    max={31}
                    value={formData.statementClosingDay}
                    onChange={(event) => setFormData({ ...formData, statementClosingDay: event.target.value })}
                    disabled={loading}
                    required
                  />
                  <Input
                    label="Vencimento"
                    type="number"
                    min={1}
                    max={31}
                    value={formData.statementDueDay}
                    onChange={(event) => setFormData({ ...formData, statementDueDay: event.target.value })}
                    disabled={loading}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-4 pb-2 pt-1">
              <Button
                size="cta"
                pill
                fullWidth
                onClick={goToMobileStep2}
                disabled={loading}
                icon={<FaArrowRight />}
                iconPosition="right"
              >
                Continuar
              </Button>
              <Button variant="ghost" size="lg" fullWidth onClick={handleRedirect} disabled={loading}>
                Cancelar
              </Button>
            </div>
          </section>
        )}

        {mobileStep === 2 && (
          <section className="mt-9 space-y-7" aria-labelledby="mobile-account-step-two">
            <div>
              <h2
                id="mobile-account-step-two"
                className="text-3xl font-extrabold leading-tight tracking-tight text-[var(--foreground)]"
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
              label="Descrição (opcional)"
              maxLength={ACCOUNT_DESCRIPTION_MAX_LENGTH}
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
              <Button variant="outline" pill size="cta" onClick={() => setMobileStep(1)} disabled={loading}>
                Voltar
              </Button>
              <Button
                pill
                size="cta"
                onClick={() => setMobileStep(3)}
                disabled={loading}
                icon={<FaArrowRight />}
                iconPosition="right"
              >
                Continuar
              </Button>
            </div>
          </section>
        )}

        {mobileStep === 3 && (
          <section className="mt-9 space-y-7" aria-labelledby="mobile-account-step-three">
            <div>
              <h2
                id="mobile-account-step-three"
                className="text-3xl font-extrabold leading-tight tracking-tight text-[var(--foreground)]"
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
                  '66 0%, color-mix(in srgb, var(--orbit-primary) 20%, black) 48%, color-mix(in srgb, var(--surface) 40%, black) 100%)',
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
              {formData.type === 'CREDIT_CARD' && (
                <>
                  <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-4">
                    <span className="text-sm text-[var(--text-muted)]">Limite</span>
                    <strong className="text-right text-sm text-[var(--foreground)]">
                      {formData.creditLimit || '—'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-4">
                    <span className="text-sm text-[var(--text-muted)]">Fechamento / vencimento</span>
                    <strong className="text-right text-sm text-[var(--foreground)]">
                      {formData.statementClosingDay || '—'} / {formData.statementDueDay || '—'}
                    </strong>
                  </div>
                </>
              )}
              <div className="px-4 py-4">
                <span className="block text-sm text-[var(--text-muted)]">Descrição</span>
                <p className="mt-1 text-sm leading-relaxed text-[var(--foreground)]">
                  {formData.description || 'Sem descrição'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[.8fr_1.2fr] gap-3 pb-2">
              <Button variant="outline" pill size="cta" onClick={() => setMobileStep(2)} disabled={loading}>
                Voltar
              </Button>
              <Button type="submit" pill size="cta" disabled={loading}>
                {loading
                  ? isEditing
                    ? 'Salvando...'
                    : 'Criando...'
                  : isEditing
                    ? 'Salvar alterações'
                    : 'Criar conta'}
              </Button>
            </div>
          </section>
        )}
      </div>
    </form>
  );

  return (
    <>
      {!isDesktop && mobileWizard}
      {isDesktop && (
      <div>
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
          maxLength={ACCOUNT_NAME_MAX_LENGTH}
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

        {formData.type === 'CREDIT_CARD' && (
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <div className="mb-4">
              <h3 className="font-semibold text-[var(--foreground)]">Ciclo do cartão</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                O limite é armazenado em centavos e o fechamento/vencimento aceita dias de 1 a 31.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <Input
                label="Limite"
                value={formData.creditLimit}
                onChange={(event) => setFormData({ ...formData, creditLimit: event.target.value })}
                disabled={loading}
                inputMode="decimal"
                placeholder="5000,00"
                required
              />
              <Input
                label="Dia de fechamento"
                type="number"
                min={1}
                max={31}
                value={formData.statementClosingDay}
                onChange={(event) => setFormData({ ...formData, statementClosingDay: event.target.value })}
                disabled={loading}
                required
              />
              <Input
                label="Dia de vencimento"
                type="number"
                min={1}
                max={31}
                value={formData.statementDueDay}
                onChange={(event) => setFormData({ ...formData, statementDueDay: event.target.value })}
                disabled={loading}
                required
              />
            </div>
            {isEditing && account?.type === 'CREDIT_CARD' && (
              <p className="mt-3 text-xs leading-relaxed text-[var(--text-subtle)]">
                Tipo, moeda e ciclo ficam bloqueados após a primeira movimentação do cartão.
              </p>
            )}
          </div>
        )}
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
          maxLength={ACCOUNT_DESCRIPTION_MAX_LENGTH}
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
      )}
    </>
  );
}
