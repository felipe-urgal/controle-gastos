'use client';

import type { ReactNode } from 'react';
import { FaPlus } from 'react-icons/fa';

import PageTitle from '@/app/components/base-pages/page-title';
import { pageBarButtonProps } from '@/app/components/base-pages/page-bar';
import { Button, ShowBelow, ShowFrom } from '@/app/components/ui';

/**
 * Cabeçalho padrão das listas (referência: Contas): `PageBar` com a ação de criar. No celular as
 * ações viram só ícones, na linha do título; a partir de `sm` mostram o texto.
 */
export default function ListPageHeader({
  title,
  createHref,
  onCreate,
  createLabel,
  secondary,
}: {
  title: string;
  /** Destino da ação principal; ou use `onCreate` quando ela abre um modal. */
  createHref?: string;
  onCreate?: () => void;
  /** Texto da ação principal (ex.: "Nova conta"); no celular vira o `aria-label` do ícone. */
  createLabel: string;
  /** Ação secundária opcional, antes da principal (ex.: Importar). */
  secondary?: { href: string; label: string; icon: ReactNode };
}) {
  const createProps = createHref ? { as: 'a' as const, href: createHref } : { onClick: onCreate };

  return (
    <PageTitle
      title={title}
      sidebarAligned
      actions={
        <>
          <ShowBelow breakpoint="sm">
            {secondary && (
              <Button as="a" href={secondary.href} variant="outline" size="compact" aria-label={secondary.label} icon={secondary.icon} />
            )}
            <Button {...createProps} size="compact" aria-label={createLabel} icon={<FaPlus aria-hidden="true" />} />
          </ShowBelow>
          <ShowFrom breakpoint="sm">
            {secondary && (
              <Button as="a" href={secondary.href} variant="outline" {...pageBarButtonProps} icon={secondary.icon}>
                {secondary.label}
              </Button>
            )}
            <Button {...createProps} {...pageBarButtonProps} icon={<FaPlus aria-hidden="true" />}>
              {createLabel}
            </Button>
          </ShowFrom>
        </>
      }
    />
  );
}
