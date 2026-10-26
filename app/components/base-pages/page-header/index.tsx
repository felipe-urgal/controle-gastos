'use client';

import type { ReactNode } from 'react';
import { FaArrowLeft, FaEdit, FaPlus, FaTrash } from 'react-icons/fa';

import PageBar, { pageBarButtonProps, type Crumb } from '@/app/components/base-pages/page-bar';
import { pageTitleClassName } from '@/app/components/base-pages/page-title-classes';
import { Button } from '@/app/components/ui';
import { DropIn } from '@/app/components/ui/motion';

interface PageHeaderProps {
  title?: string;
  description?: string;
  backUrl?: string;
  editUrl?: string;
  /** Recebe o clique, para o chamador saber de onde partiu (ex.: o diálogo de exclusão voa do botão). */
  onDelete?: (event: React.MouseEvent<HTMLElement>) => void;
  /** Exclusão indisponível (ex.: há histórico); `deleteHint` explica o motivo. */
  deleteDisabled?: boolean;
  deleteHint?: string;
  /** Ações próprias da página, entre Editar e Excluir. */
  actions?: ReactNode;
  createUrl?: string;
  createLabel?: string;
  loading?: boolean;
  isDeleting?: boolean;
  /** Faixa fixa encostada na sidebar (`PageBar`), com breadcrumb no lugar de voltar e título. */
  sidebarAligned?: boolean;
  /** Níveis do breadcrumb (o último é a página atual); sem isso, só o título. */
  breadcrumb?: Crumb[];
  /** Só com `sidebarAligned`: movimento da faixa (ver `PageBar`). */
  animated?: boolean | 'letters' | 'trail';
  /** Os botões de ação (Editar e Excluir) caem de cima, em sequência; as `actions` próprias usam `DropIn` por conta própria. */
  dropActions?: boolean;
}

export default function PageHeader({
  title,
  description,
  backUrl,
  editUrl,
  onDelete,
  deleteDisabled = false,
  deleteHint,
  actions,
  createUrl,
  createLabel = 'Adicionar',
  loading,
  isDeleting,
  sidebarAligned = false,
  breadcrumb,
  animated = false,
  dropActions = false,
}: PageHeaderProps) {
  const drop = (order: number, node: ReactNode, pulse = false) =>
    dropActions ? <DropIn order={order} pulse={pulse}>{node}</DropIn> : node;
  const buttonProps = sidebarAligned ? pageBarButtonProps : {};
  const actionButtons = (
    <>
      {createUrl && (
        <Button
          as="a"
          href={createUrl}
          variant="primary"
          {...buttonProps}
          icon={<FaPlus />}
          isLoading={loading}
        >
          {createLabel}
        </Button>
      )}

      {editUrl && drop(0, (
        <Button
          as="a"
          href={editUrl}
          variant="outline"
          {...buttonProps}
          icon={<FaEdit />}
          disabled={isDeleting}
          isLoading={loading}
        >
          Editar
        </Button>
      ))}

      {actions}

      {onDelete && drop(3, (
        <Button
          variant="danger"
          {...buttonProps}
          icon={<FaTrash />}
          onClick={onDelete}
          disabled={isDeleting || deleteDisabled}
          title={deleteDisabled ? deleteHint : undefined}
          isLoading={loading}
        >
          Excluir
        </Button>
      ), true)}
    </>
  );

  if (sidebarAligned) {
    return <PageBar crumbs={breadcrumb ?? [{ label: title ?? '' }]} actions={actionButtons} animated={animated} />;
  }

  return (
    <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3 sm:min-h-[46px]">
        {backUrl && (
          <Button
            as="a"
            href={backUrl}
            variant="ghost"
            size="sm"
            icon={<FaArrowLeft />}
            disabled={isDeleting}
            isLoading={loading}
            aria-label="Voltar"
          />
        )}

        <div className="min-w-0">
          {title && (
            <h1 className={`break-words ${pageTitleClassName}`}>
              {title}
            </h1>
          )}
          {description && (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {actionButtons}
      </div>
    </header>
  );
}
