'use client';

import { FaArrowLeft } from 'react-icons/fa';

import { appBarTitleClassName } from '@/app/components/base-pages/page-title';
import { FormActions, FormContainer } from '@/app/components/forms';
import { AccountFormCard } from '@/app/components/pages/account/form/account-form-card';
import {
  accountNameSuggestions,
  accountStructureLock,
  accountTypeCards,
} from '@/app/components/pages/account/form/account-form-model';
import { ActiveToggle, Chip, IconButton, Input, ShowBelow } from '@/app/components/ui';
import { useAccountForm } from '@/app/hooks/accounts/use-account-form';
import { ACCOUNT_DESCRIPTION_MAX_LENGTH } from '@/app/lib/constants/account.constants';
import { AccountFormProps } from '@/app/lib/interface/accounts.interface';
import type { AccountType } from '@/app/types/account';

const orbitSelectionTokens =
  '[--focus:var(--orbit-focus)] [--on-primary:var(--orbit-on-primary)] [--primary-hover:var(--orbit-primary-hover)] [--primary-subtle:var(--orbit-primary-subtle)] [--primary:var(--orbit-primary)]';

export default function AccountForm({ account, isEditing }: AccountFormProps) {
  const { formData, setFormData, submitError, setSubmitError, isSubmitting, handleSubmit, handleRedirect } =
    useAccountForm({ account, isEditing });
  const lock = accountStructureLock(isEditing, account);
  const loading = isSubmitting;

  function chooseType(type: AccountType) {
    if (lock.typeAndCurrency || type === formData.type) return;
    setFormData({
      ...formData,
      type,
      icon: type === 'CREDIT_CARD' && formData.icon === 'wallet' ? 'credit-card' : formData.icon,
    });
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
          <h1 className={`text-center ${appBarTitleClassName}`}>{isEditing ? 'Editar conta' : 'Nova conta'}</h1>
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
        <div role="group" aria-label="Tipo de conta" className="grid grid-cols-3 gap-2">
          {accountTypeCards.map((option) => (
            <Chip
              key={option.value}
              selected={formData.type === option.value}
              aria-label={option.label}
              title={option.description}
              onClick={() => chooseType(option.value)}
              disabled={loading || (lock.typeAndCurrency && formData.type !== option.value)}
              className="w-full px-2"
            >
              {option.short}
            </Chip>
          ))}
        </div>
        <p className="-mt-2 px-1 text-sm text-[var(--text-muted)]">
          {accountTypeCards.find((option) => option.value === formData.type)?.description}
        </p>

        {lock.typeAndCurrency && (
          <div role="note" className="flex items-start gap-2.5 rounded-[var(--radius-md)] bg-[var(--warning-subtle)] px-3.5 py-3 text-sm leading-relaxed text-[var(--warning)]">
            <span aria-hidden="true">🔒</span>
            <span>
              <strong className="text-[var(--foreground)]">Tipo, moeda{formData.type === 'CREDIT_CARD' ? ' e ciclo da fatura' : ''} estão travados</strong>{' '}
              porque a conta já tem movimentações, e mudar isso alteraria o histórico. Para trocar, crie uma nova conta e transfira o saldo.
            </span>
          </div>
        )}

        <AccountFormCard
          values={formData}
          onChange={(patch) => setFormData({ ...formData, ...patch })}
          loading={loading}
          lockStructure={lock.typeAndCurrency}
          lockCycle={lock.cardCycle}
          isEditing={isEditing}
          currentBalance={account?.balance}
        />

        {!isEditing && (
          <div className="-mt-1 flex flex-wrap items-center gap-2" aria-label="Sugestões de nome">
            <span className="text-sm text-[var(--text-muted)]">Sugestões:</span>
            {accountNameSuggestions(formData.type).map((name) => (
              <Chip key={name} onClick={() => setFormData({ ...formData, name })} disabled={loading} className="font-medium">
                {name}
              </Chip>
            ))}
          </div>
        )}

        <details className="group rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--radius-lg)] px-4 text-base font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] [&::-webkit-details-marker]:hidden">
            <span>Mais opções</span>
            <span className="text-sm font-normal text-[var(--text-muted)]">
              descrição{isEditing ? ' e status' : ''}
            </span>
          </summary>
          <div className="grid gap-4 px-4 pb-4">
            <Input
              label="Descrição (opcional)"
              maxLength={ACCOUNT_DESCRIPTION_MAX_LENGTH}
              value={formData.description}
              onChange={(event) => setFormData({ ...formData, description: event.target.value })}
              disabled={loading}
              multiline
              rows={3}
              placeholder="Algo para lembrar o que é esta conta"
            />
            {isEditing && (
              <div>
                <p className="mb-2 text-sm text-[var(--text-muted)]">
                  Inativar guarda o histórico e tira a conta dos lançamentos novos.
                </p>
                <ActiveToggle
                  isActive={formData.isActive}
                  onToggle={(isActive) => setFormData({ ...formData, isActive })}
                  disabled={loading}
                  label="Conta ativa"
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
            createLabel="Criar conta"
            submitLabel="Salvar alterações"
          />
        </div>
      </FormContainer>
    </div>
  );
}
