'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import MfaDisable from '@/app/components/pages/user/show/mfa-disable';
import MfaEnrollment from '@/app/components/pages/user/show/mfa-enrollment';
import MfaRecoveryCodes from '@/app/components/pages/user/show/mfa-recovery-codes';
import { SettingsPanel } from '@/app/components/pages/user/show/settings-row';

export default function MfaSecurityPanel({
  enabled,
  onEnabledChange,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}) {
  const reduce = useReducedMotion();

  return (
    <SettingsPanel
      id="mfa-security-title"
      title="Autenticação em duas etapas"
      description={enabled ? '2FA está ativo para sua conta.' : 'Adicione um segundo fator usando um aplicativo autenticador.'}
      action={
        // O selo "carimba" a cada mudança de estado (ativou ou desativou).
        <motion.span
          key={String(enabled)}
          className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-sm font-semibold ${enabled ? 'border-[var(--income)]/40 bg-[var(--primary-subtle)] text-[var(--income)]' : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--foreground)]'}`}
          initial={reduce ? false : { scale: 1.8, rotate: -10, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 14 }}
        >
          {enabled ? 'Ativado' : 'Desativado'}
        </motion.span>
      }
    >
      <div className="p-4 sm:p-5">
        {/* Ativar e desativar trocam o conteúdo deslizando, em vez de piscar. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={String(enabled)}
            className="space-y-4"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {enabled ? (
              <>
                <MfaRecoveryCodes />
                <div className="border-t border-[var(--border)] pt-4">
                  <MfaDisable onDisabled={() => onEnabledChange(false)} />
                </div>
              </>
            ) : (
              <MfaEnrollment onActivated={() => onEnabledChange(true)} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </SettingsPanel>
  );
}
