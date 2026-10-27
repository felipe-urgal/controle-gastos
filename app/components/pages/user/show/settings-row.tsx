'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';

import { CARD_EASE } from '@/app/components/ui/motion';

/** Painel de uma seção: título, descrição opcional e linhas de configuração (que entram em sequência). */
export function SettingsPanel({
  id,
  title,
  description,
  action,
  children,
  busy,
}: {
  id: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  busy?: boolean;
}) {
  const reduce = useReducedMotion();
  // Cada `SettingsRow` recebe a sua posição para entrar um depois do outro.
  let rowIndex = 0;
  const content = Children.map(children, (child) =>
    isValidElement(child) && child.type === SettingsRow ? cloneElement(child as ReactElement<{ index?: number }>, { index: rowIndex++ }) : child,
  );

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: CARD_EASE }}
      className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-surface)]"
      aria-labelledby={id}
      aria-busy={busy || undefined}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 id={id} className="text-lg font-bold text-[var(--foreground)]">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-[var(--text-muted)]">{description}</p>}
        </div>
        {action}
      </header>
      {content}
    </motion.section>
  );
}

/**
 * Linha de configuração: ícone, título e descrição à esquerda; controle à direita. Com `inlineControl` o controle (botão curto,
 * interruptor) fica ao lado do texto também no celular; sem ele (seletores largos) desce para baixo no celular.
 */
export function SettingsRow({
  icon,
  title,
  description,
  control,
  inlineControl = false,
  index = 0,
}: {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  control?: ReactNode;
  inlineControl?: boolean;
  /** Preenchido pelo `SettingsPanel`: ordem de entrada da linha. */
  index?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.1 + index * 0.07 }}
      whileHover="hover"
      className={`grid items-center gap-x-4 gap-y-3 border-t border-[var(--border)] px-4 py-4 first:border-t-0 sm:px-5 ${inlineControl ? 'grid-cols-[auto_minmax(0,1fr)_auto]' : 'grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(0,1fr)_auto]'}`}
    >
      {/* No hover (ou toque) o ícone balança e o texto anda 3px. */}
      <motion.span
        className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] bg-[var(--surface-raised)] text-[var(--text-muted)]"
        aria-hidden="true"
        variants={{ hover: { rotate: [0, -12, 10, 0], scale: 1.08, transition: { duration: 0.5 } } }}
      >
        {icon}
      </motion.span>
      <motion.div className="min-w-0" variants={{ hover: { x: 3, transition: { type: 'spring', stiffness: 400, damping: 22 } } }}>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
        {description && <p className="mt-0.5 text-sm leading-relaxed text-[var(--text-muted)]">{description}</p>}
      </motion.div>
      {control && <div className={inlineControl ? '' : 'col-span-full justify-self-start sm:col-span-1 sm:justify-self-end'}>{control}</div>}
    </motion.div>
  );
}
