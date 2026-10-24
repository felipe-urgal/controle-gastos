'use client';

import { FaEdit } from 'react-icons/fa';

import { accountStatus, formatDate, securityTip, userInitial, type SettingsSection } from '@/app/components/pages/user/show/settings-model';
import { Button } from '@/app/components/ui';
import type { User } from '@/app/types/user';

const dotTone = {
  ok: 'bg-[var(--income)]',
  attention: 'bg-[var(--warning)]',
  neutral: 'bg-[var(--border-strong)]',
} as const;

/** Perfil, situação da conta e sugestão de segurança no topo da central. */
export function SettingsHeader({ user, onGo }: { user: User; onGo: (section: SettingsSection) => void }) {
  const tip = securityTip(user);

  return (
    <div className="grid gap-4">
      <section aria-label="Seu perfil" className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:p-5">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--primary-subtle)] text-2xl font-bold text-[var(--primary)] sm:h-16 sm:w-16" aria-hidden="true">
          {userInitial(user.name)}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold tracking-tight">{user.name}</h2>
          <p className="truncate text-sm text-[var(--text-muted)]">{user.email} · conta criada em {formatDate(user.createdAt)}</p>
        </div>
        <Button as="a" href="/usuario/editar" variant="outline" pill icon={<FaEdit aria-hidden="true" />} className="col-span-full sm:col-span-1">
          Editar perfil
        </Button>
      </section>

      <ul className="grid gap-3 sm:grid-cols-3" aria-label="Situação da conta">
        {accountStatus(user).map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-surface)] sm:grid sm:gap-0.5">
            <div className="min-w-0">
              <span className="block text-sm font-semibold text-[var(--text-muted)]">{item.label}</span>
              <strong className="flex items-center gap-2 text-sm">
                <span className={`h-2.5 w-2.5 rounded-full ${dotTone[item.tone]}`} aria-hidden="true" />
                {item.value}
              </strong>
            </div>
            <Button variant="link" size="xs" onClick={() => onGo(item.section)} aria-label={`Ajustar ${item.label.toLowerCase()}`}>
              Ajustar
            </Button>
          </li>
        ))}
      </ul>

      {tip && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] bg-[var(--warning-subtle)] px-4 py-3 text-sm">
          <p className="min-w-0 flex-1"><strong>Proteja sua conta.</strong> Ative a verificação em duas etapas para exigir um código além da senha.</p>
          <Button size="sm" pill onClick={() => onGo(tip.section)}>Ativar agora</Button>
        </div>
      )}
    </div>
  );
}
