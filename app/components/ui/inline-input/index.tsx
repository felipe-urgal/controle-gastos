'use client';

import type { InputHTMLAttributes } from 'react';

type InlineInputSize = 'title' | 'amount' | 'day';

const SIZE: Record<InlineInputSize, string> = {
  title: 'h-11 w-full text-xl font-semibold tracking-tight sm:text-2xl placeholder:font-medium',
  amount: 'money h-12 w-full text-3xl font-semibold tracking-tight',
  day: 'money h-11 w-[4.5ch] min-w-[4.5ch] text-2xl font-semibold',
};

/**
 * Campo editado "no lugar": sem caixa, só uma linha tracejada que vira sólida no foco.
 * Usado quando o próprio valor na tela é o formulário (ex.: o cartão da conta).
 * O nome acessível vem de `aria-label` ou de um `<label htmlFor>` do chamador.
 */
export default function InlineInput({
  size = 'title',
  className = '',
  ...props
}: { size?: InlineInputSize } & Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>) {
  return (
    <input
      className={`${SIZE[size]} border-b-2 border-dashed border-[var(--border-strong)] bg-transparent text-[var(--foreground)] outline-none placeholder:text-[var(--text-subtle)] focus:border-solid focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:border-transparent disabled:text-[var(--text-subtle)] ${className}`}
      {...props}
    />
  );
}
