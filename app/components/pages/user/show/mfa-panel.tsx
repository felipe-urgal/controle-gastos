'use client';

import { FaShieldAlt } from 'react-icons/fa';

export default function MfaPanel({ enabled }: { enabled: boolean }) {
  return (
    <section className="ds-panel overflow-hidden" aria-labelledby="mfa-status-title">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <FaShieldAlt className="text-[var(--primary)]" aria-hidden="true" />
            <h2 id="mfa-status-title" className="text-xl font-semibold text-[var(--foreground)]">
              Autenticação em duas etapas
            </h2>
          </div>
          <p className="mt-1 text-base leading-relaxed text-[var(--text-muted)]">
            {enabled
              ? '2FA está ativo para sua conta e será solicitado no próximo login.'
              : '2FA está desativado para sua conta.'}
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-sm font-semibold text-[var(--foreground)]">
          {enabled ? 'Ativado' : 'Desativado'}
        </span>
      </div>
    </section>
  );
}
