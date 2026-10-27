'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { FormActions, FormContainer } from '@/app/components/forms';
import { AccountFormCard } from '@/app/components/pages/account/form/account-form-card';
import {
  accountNameSuggestions,
  accountStructureLock,
  accountTypeCards,
} from '@/app/components/pages/account/form/account-form-model';
import { ActiveToggle, Chip, Input } from '@/app/components/ui';
import { useAccountForm } from '@/app/hooks/accounts/use-account-form';
import { CARD_EASE, reducedTransition } from '@/app/components/ui/motion';
import { ACCOUNT_DESCRIPTION_MAX_LENGTH } from '@/app/lib/constants/account.constants';
import { AccountFormProps } from '@/app/lib/interface/accounts.interface';
import type { AccountType } from '@/app/types/account';

export default function AccountForm({ account, isEditing }: AccountFormProps) {
  const { formData, setFormData, submitError, setSubmitError, isSubmitting, handleSubmit, handleRedirect } =
    useAccountForm({ account, isEditing });
  const lock = accountStructureLock(isEditing, account);
  const loading = isSubmitting;
  const reduce = useReducedMotion();
  const isCard = formData.type === 'CREDIT_CARD';
  // O botão principal só "respira" quando o necessário para criar está preenchido.
  const ready =
    formData.name.trim() !== '' &&
    (!isCard || (formData.creditLimit !== '' && formData.statementClosingDay !== '' && formData.statementDueDay !== ''));

  function chooseType(type: AccountType) {
    if (lock.typeAndCurrency || type === formData.type) return;
    setFormData({
      ...formData,
      type,
      icon: type === 'CREDIT_CARD' && formData.icon === 'wallet' ? 'credit-card' : formData.icon,
    });
  }

  return (
    <div className="w-full">

      <FormContainer
        bare
        onSubmit={handleSubmit}
        error={submitError}
        onClearError={() => setSubmitError(null)}
        className="gap-5"
      >
        {!lock.typeAndCurrency && (
        <>
        <div role="group" aria-label="Tipo de conta" className="grid grid-cols-3 gap-2">
          {accountTypeCards.map((option, index) => (
            <motion.div
              key={option.value}
              className="flex"
              initial={reduce ? false : { opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={reducedTransition(reduce, { type: 'spring', stiffness: 380, damping: 18, delay: index * 0.08 })}
            >
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
            </motion.div>
          ))}
        </div>
        {/* A descrição do tipo escolhido troca deslizando para cima. */}
        <div className="-mt-2 overflow-hidden px-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={formData.type}
              className="text-sm text-[var(--text-muted)]"
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.2, ease: CARD_EASE }}
            >
              {accountTypeCards.find((option) => option.value === formData.type)?.description}
            </motion.p>
          </AnimatePresence>
        </div>
        </>
        )}

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
          <div key={formData.type} className="-mt-1 flex flex-wrap items-center gap-2" aria-label="Sugestões de nome">
            <span className="text-sm text-[var(--text-muted)]">Sugestões:</span>
            {accountNameSuggestions(formData.type).map((name, index) => (
              <motion.span
                key={name}
                className="inline-flex"
                initial={reduce ? false : { opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={reduce ? undefined : { y: [0, -5, 0, -2, 0], transition: { duration: 0.5 } }}
                transition={reducedTransition(reduce, { type: 'spring', stiffness: 300, damping: 22, delay: 0.3 + index * 0.07 })}
              >
                <Chip onClick={() => setFormData({ ...formData, name })} disabled={loading} className="font-medium">
                  {name}
                </Chip>
              </motion.span>
            ))}
          </div>
        )}

        <details className="group rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--radius-lg)] px-4 text-base font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] [&::-webkit-details-marker]:hidden">
            <span>Mais opções</span>
            {isEditing && !formData.isActive ? (
              <span className="text-sm font-semibold text-[var(--warning)]">Conta inativa</span>
            ) : (
              <span className="text-sm font-normal text-[var(--text-muted)]">
                descrição{isEditing ? ' e status' : ''}
              </span>
            )}
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

        <FormActions
          isEditing={isEditing}
          loading={loading}
          onCancel={handleRedirect}
          createLabel="Criar conta"
          submitLabel="Salvar alterações"
          iconsOnMobile
          hoverEffects
          ready={ready && !isEditing}
        />
      </FormContainer>
    </div>
  );
}
