'use client';

import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

type IconButtonTone = 'neutral' | 'danger' | 'primary' | 'solid';
type IconButtonSize = 'md' | 'lg';

const TONE: Record<IconButtonTone, string> = {
  neutral: 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]',
  danger: 'text-[var(--expense)] hover:bg-[var(--danger-subtle)]',
  primary: 'text-[var(--primary)] hover:bg-[var(--primary-subtle)]',
  // Sobre um fundo colorido definido pelo chamador (ex.: cor da conta): só o texto branco.
  solid: 'text-white hover:brightness-110',
};

const SIZE: Record<IconButtonSize, string> = {
  md: 'h-11 w-11 rounded-[var(--radius-md)]',
  lg: 'h-14 w-14 rounded-[var(--radius-lg)]',
};

const BASE =
  'grid shrink-0 place-items-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-50';

interface CommonProps {
  /** Nome acessível: obrigatório, pois o botão não tem texto. */
  label: string;
  icon: ReactNode;
  tone?: IconButtonTone;
  size?: IconButtonSize;
  className?: string;
}

/** Botão só de ícone, 44×44, com `aria-label` obrigatório. */
export function IconButton({
  label,
  icon,
  tone = 'neutral',
  size = 'md',
  className = '',
  ...props
}: CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'>) {
  return (
    <button type="button" aria-label={label} className={`${BASE} ${SIZE[size]} ${TONE[tone]} ${className}`} {...props}>
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
  size = 'md',
  className = '',
  title,
  onClick,
}: CommonProps & { href: string } & Pick<AnchorHTMLAttributes<HTMLAnchorElement>, 'title' | 'onClick'>) {
  return (
    <Link href={href} aria-label={label} title={title} onClick={onClick} className={`${BASE} ${SIZE[size]} ${TONE[tone]} ${className}`}>
      <span aria-hidden="true">{icon}</span>
    </Link>
  );
}
