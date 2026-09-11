'use client';

import { FaShieldAlt } from 'react-icons/fa';

import MfaDisable from '@/app/components/pages/user/show/mfa-disable';
import MfaEnrollment from '@/app/components/pages/user/show/mfa-enrollment';

export default function MfaSecurityPanel({
  enabled,
  onEnabledChange,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}) {
  return (
    <section className="ds-panel overflow-hidden" aria-labelledby="mfa-security-title">
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FaShieldAlt className="text-[var(--primary)]" aria-hidden="true" />
              <h2 id="mfa-security-title" className="text-xl font-semibold text-[var(--foreground)]">Autenticação em duas etapas</h2>
            </div>
            <p className="mt-1 text-base leading-relaxed text-[var(--text-muted)]">
              {enabled ? '2FA está ativo para sua conta.' : 'Adicione um segundo fator usando um aplicativo autenticador.'}
            </p>
          </div>
          <span className="inline-flex w-fit rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-sm font-semibold text-[var(--foreground)]">
            {enabled ? 'Ativado' : 'Desativado'}
          </span>
        </div>

        {enabled ? (
          <MfaDisable onDisabled={() => onEnabledChange(false)} />
        ) : (
          <MfaEnrollment onActivated={() => onEnabledChange(true)} />
        )}
      </div>
    </section>
  );
}
