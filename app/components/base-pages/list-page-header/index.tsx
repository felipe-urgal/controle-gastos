'use client';

import { motion } from 'framer-motion';
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
  controls,
  animated = false,
  loading = false,
}: {
  title: string;
  /** Destino da ação principal; ou use `onCreate` quando ela abre um modal. */
  createHref?: string;
  onCreate?: () => void;
  /** Texto da ação principal (ex.: "Nova conta"); no celular vira o `aria-label` do ícone. */
  createLabel: string;
  /** Ação secundária opcional, antes da principal (ex.: Importar). */
  secondary?: { href: string; label: string; icon: ReactNode };
  /** Filtros de uma linha (ex.: um select): na barra a partir de `lg`, abaixo dela no mobile. */
  controls?: ReactNode;
  /** Liga o movimento da faixa (ver `PageBar`): o preset escolhido anima o título e os botões entram com mola. */
  animated?: boolean | 'letters' | 'focus' | 'deal' | 'spin' | 'climb';
  /** Com `animated`, mostra o indicador de carregamento da faixa. */
  loading?: boolean;
}) {
  const createProps = createHref ? { as: 'a' as const, href: createHref } : { onClick: onCreate };
  // O "+" gira ao entrar; sem animação é o ícone parado de sempre.
  const plusIcon = animated ? (
    <motion.span
      className="flex"
      initial={{ rotate: -180, scale: 0.5 }}
      animate={{ rotate: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.45 }}
    >
      {/* Ao passar o mouse no botão, o "+" gira 90°. */}
      <motion.span className="flex" variants={{ hover: { rotate: 90 } }} transition={{ type: 'spring', stiffness: 400, damping: 16 }}>
        <FaPlus aria-hidden="true" />
      </motion.span>
    </motion.span>
  ) : (
    <FaPlus aria-hidden="true" />
  );
  // O ícone da ação secundária (Importar) "cai" para dentro e quica ao passar o mouse no botão.
  const secondaryIcon = secondary && animated ? (
    <motion.span className="flex" variants={{ hover: { y: [0, 6, -3, 0], transition: { duration: 0.5 } } }}>
      {secondary.icon}
    </motion.span>
  ) : secondary?.icon;
  // Botões da faixa: entram crescendo, um depois do outro.
  const pop = (order: number, node: ReactNode, grow = false) =>
    animated ? (
      <motion.span
        className="inline-flex"
        whileHover="hover"
        variants={grow ? { hover: { scale: 1.05 } } : undefined}
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 20, delay: 0.2 + order * 0.1 }}
      >
        {node}
      </motion.span>
    ) : (
      node
    );

  return (
    <>
    <PageTitle
      title={title}
      sidebarAligned
      animated={animated}
      loading={loading}
      actions={
        <>
          {controls && <ShowFrom breakpoint="lg">{controls}</ShowFrom>}
          <ShowBelow breakpoint="sm">
            {secondary && pop(0, <Button as="a" href={secondary.href} variant="outline" size="compact" aria-label={secondary.label} icon={secondaryIcon} />)}
            {pop(1, <Button {...createProps} size="compact" aria-label={createLabel} icon={plusIcon} />, true)}
          </ShowBelow>
          <ShowFrom breakpoint="sm">
            {secondary && pop(0, (
              <Button as="a" href={secondary.href} variant="outline" {...pageBarButtonProps} icon={secondaryIcon}>
                {secondary.label}
              </Button>
            ))}
            {pop(1, (
              <Button {...createProps} {...pageBarButtonProps} icon={plusIcon}>
                {createLabel}
              </Button>
            ), true)}
          </ShowFrom>
        </>
      }
    />
    {controls && (
      <ShowBelow breakpoint="lg">
        <div className="mt-4">{controls}</div>
      </ShowBelow>
    )}
    </>
  );
}
