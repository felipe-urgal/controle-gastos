'use client';

import { FaCalendarAlt, FaEnvelope, FaUser } from 'react-icons/fa';

import type { User } from '@/app/types/user';

interface UserInfoProps {
  user: User;
  isDeleting: boolean;
}

export default function UserInfo({ user, isDeleting }: UserInfoProps) {
  const createdAt = new Date(user.createdAt).toLocaleDateString('pt-BR');
  const updatedAt = new Date(user.updatedAt).toLocaleDateString('pt-BR');
  const initial = user.name.trim().charAt(0).toUpperCase() || 'U';

  return (
    <section
      className="ds-panel overflow-hidden"
      aria-labelledby="profile-identity-title"
      aria-busy={isDeleting || undefined}
    >
      <div className="border-b border-[var(--border)] px-4 py-4 sm:px-5">
        <h2 id="profile-identity-title" className="text-xl font-semibold text-[var(--foreground)]">
          Conta
        </h2>
        <p className="mt-1 text-base leading-relaxed text-[var(--text-muted)]">
          Dados básicos usados para identificar sua conta.
        </p>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex min-w-0 items-center gap-4">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-xl font-bold text-[var(--primary)]"
            aria-hidden="true"
          >
            {initial}
          </span>

          <div className="min-w-0">
            <h3 className="truncate text-xl font-bold tracking-tight text-[var(--foreground)]">
              {user.name}
            </h3>
            <p className="mt-1 flex min-w-0 items-center gap-2 text-base text-[var(--text-muted)]">
              <FaEnvelope className="shrink-0 text-[var(--text-subtle)]" aria-hidden="true" />
              <span className="truncate">{user.email}</span>
            </p>
          </div>
        </div>

        <dl className="mt-5 grid gap-3 border-t border-[var(--border)] pt-5 sm:grid-cols-2">
          <div className="rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-3.5">
            <dt className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
              <FaUser aria-hidden="true" />
              Conta criada em
            </dt>
            <dd className="mt-1 text-base font-semibold text-[var(--foreground)]">{createdAt}</dd>
          </div>

          <div className="rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-3.5">
            <dt className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
              <FaCalendarAlt aria-hidden="true" />
              Última atualização
            </dt>
            <dd className="mt-1 text-base font-semibold text-[var(--foreground)]">{updatedAt}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
