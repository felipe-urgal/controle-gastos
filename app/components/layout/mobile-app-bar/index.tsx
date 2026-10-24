'use client';

import type { ReactNode } from 'react';
import { FaArrowLeft } from 'react-icons/fa';

import { appBarTitleClassName } from '@/app/components/base-pages/page-title';
import { IconButton, IconLink } from '@/app/components/ui';

/**
 * Barra superior das telas de detalhe e formulário no mobile: fica fixa no topo (o conteúdo rola
 * entre ela e a barra inferior) com voltar, título e uma ação opcional. Use dentro do
 * contêiner da página, abaixo do breakpoint `lg`.
 */
export default function MobileAppBar({
  title,
  backHref,
  onBack,
  backLabel = 'Voltar',
  backDisabled = false,
  action,
}: {
  title: string;
  /** Voltar como link; ou `onBack` quando a navegação precisa de lógica. */
  backHref?: string;
  onBack?: () => void;
  backLabel?: string;
  backDisabled?: boolean;
  /** Ação à direita (ex.: editar); sem ela o título continua centralizado. */
  action?: ReactNode;
}) {
  const backIcon = <FaArrowLeft />;
  const backClassName = 'rounded-full text-lg text-[var(--foreground)]';

  return (
    <header className="orbit-navigation-surface sticky top-0 z-[var(--z-header)] -mx-[var(--orbit-page-padding-inline)] -mt-[var(--orbit-page-padding-block)] grid grid-cols-[44px_minmax(0,1fr)_minmax(44px,auto)] items-center gap-2 border-b border-[var(--border)] px-[calc(var(--orbit-page-padding-inline)-0.25rem)] pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
      {backHref ? (
        <IconLink label={backLabel} href={backHref} icon={backIcon} className={backClassName} />
      ) : (
        <IconButton label={backLabel} icon={backIcon} onClick={onBack} disabled={backDisabled} className={backClassName} />
      )}
      <h1 className={`text-center ${appBarTitleClassName}`}>{title}</h1>
      <div className="flex justify-end">{action}</div>
    </header>
  );
}
