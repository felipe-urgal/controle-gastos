'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { FaArrowLeft } from 'react-icons/fa';

import { appBarTitleClassName } from '@/app/components/base-pages/page-title';
import { IconButton, IconLink } from '@/app/components/ui';

/**
 * Barra superior das telas de detalhe e formulário no mobile: fica fixa no topo (o conteúdo rola
 * entre ela e a barra inferior) com voltar, título e uma ação opcional. Use dentro do
 * contêiner da página, abaixo do breakpoint `lg`. Com `animated="trail"` (telas de criação) o voltar desliza da
 * esquerda e o título é digitado com um cursor, o mesmo preset do breadcrumb do desktop.
 */
export default function MobileAppBar({
  title,
  backHref,
  onBack,
  backLabel = 'Voltar',
  backDisabled = false,
  action,
  animated = false,
}: {
  title: string;
  /** Voltar como link; ou `onBack` quando a navegação precisa de lógica. */
  backHref?: string;
  onBack?: () => void;
  backLabel?: string;
  backDisabled?: boolean;
  /** Ação à direita (ex.: editar); sem ela o título continua centralizado. */
  action?: ReactNode;
  animated?: boolean | 'trail' | 'focus';
}) {
  const reduce = useReducedMotion();
  const trail = animated === 'trail';
  const focus = animated === 'focus';
  const backIcon = <FaArrowLeft />;
  const backClassName = 'rounded-full text-lg text-[var(--foreground)]';

  return (
    <header className="orbit-navigation-surface sticky top-0 z-[var(--z-header)] -mx-[var(--orbit-page-padding-inline)] -mt-[var(--orbit-page-padding-block)] grid grid-cols-[44px_minmax(0,1fr)_minmax(44px,auto)] items-center gap-2 border-b border-[var(--border)] px-[calc(var(--orbit-page-padding-inline)-0.25rem)] pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
      <motion.div
        initial={trail ? { x: -18, opacity: 0 } : false}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28, delay: 0.05 }}
        className="flex"
      >
        {backHref ? (
          <IconLink label={backLabel} href={backHref} icon={backIcon} className={backClassName} />
        ) : (
          <IconButton label={backLabel} icon={backIcon} onClick={onBack} disabled={backDisabled} className={backClassName} />
        )}
      </motion.div>
      {trail ? (
        // O título é revelado da esquerda para a direita, com o cursor acompanhando a borda.
        <span className="relative mx-auto inline-block max-w-full">
          <motion.h1
            className={`text-center ${appBarTitleClassName}`}
            initial={{ clipPath: 'inset(0 100% 0 0)' }}
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            transition={reduce ? { duration: 0 } : { duration: 0.7, ease: [0.65, 0, 0.35, 1], delay: 0.3 }}
          >
            {title}
          </motion.h1>
          {!reduce && (
            <motion.span
              aria-hidden="true"
              className="absolute inset-y-1 w-0.5 rounded-full bg-[var(--primary)]"
              initial={{ left: '0%', opacity: 1 }}
              animate={{ left: '100%', opacity: [1, 1, 0, 1, 0] }}
              transition={{ left: { duration: 0.7, ease: [0.65, 0, 0.35, 1], delay: 0.3 }, opacity: { duration: 1.5, delay: 0.3, times: [0, 0.45, 0.6, 0.8, 1] } }}
            />
          )}
        </span>
      ) : focus ? (
        // O título entra desfocado e as letras se fecham até ficarem nítidas.
        <motion.h1
          className={`text-center ${appBarTitleClassName}`}
          initial={reduce ? false : { opacity: 0, filter: 'blur(8px)', letterSpacing: '0.12em' }}
          animate={{ opacity: 1, filter: 'blur(0px)', letterSpacing: '-0.025em' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        >
          {title}
        </motion.h1>
      ) : (
        <h1 className={`text-center ${appBarTitleClassName}`}>{title}</h1>
      )}
      <div className="flex justify-end">{action}</div>
    </header>
  );
}
