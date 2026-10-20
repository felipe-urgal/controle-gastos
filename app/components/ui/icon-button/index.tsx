'use client';

import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type IconButtonTone = 'neutral' | 'danger' | 'primary';

const TONE: Record<IconButtonTone, string> = {
  neutral: 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]',
  danger: 'text-[var(--expense)] hover:bg-[var(--danger-subtle)]',
  primary: 'text-[var(--orbit-primary)] hover:bg-[var(--orbit-primary-subtle)]',
};

const BASE =
  'grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-md)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-50';

interface CommonProps {
  /** Nome acessível: obrigatório, pois o botão não tem texto. */
  label: string;
  icon: ReactNode;
  tone?: IconButtonTone;
  className?: string;
}

/** Botão só de ícone, 44×44, com `aria-label` obrigatório. */
export function IconButton({
  label,
  icon,
  tone = 'neutral',
  className = '',
  ...props
}: CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'>) {
  return (
    <button type="button" aria-label={label} className={`${BASE} ${TONE[tone]} ${className}`} {...props}>
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}

/** Variante em link (navegação) do `IconButton`. */
export function IconLink({
  label,
  icon,
  href,
  tone = 'neutral',
  className = '',
}: CommonProps & { href: string }) {
  return (
    <Link href={href} aria-label={label} className={`${BASE} ${TONE[tone]} ${className}`}>
      <span aria-hidden="true">{icon}</span>
    </Link>
  );
}
