'use client';

import { FaPen, FaPowerOff, FaTrash } from 'react-icons/fa';

import { IconButton, IconLink } from '@/app/components/ui';
import { DropIn } from '@/app/components/ui/motion';

export const DELETE_BLOCKED_HINT = 'Conta com histórico não pode ser excluída. Inative para guardá-la.';

/** Ações da conta na barra superior do mobile (só ícones, ao lado do voltar e do título). */
export default function AccountAppBarActions({
  editUrl,
  isActive,
  isDeletable,
  busy,
  onToggleActive,
  onDeleteRequest,
}: {
  editUrl: string;
  isActive: boolean;
  isDeletable: boolean;
  busy: boolean;
  onToggleActive: () => void;
  onDeleteRequest: () => void;
}) {
  return (
    <div className="flex">
      <DropIn order={0}>
        <IconLink label="Editar conta" href={editUrl} icon={<FaPen />} tone="primary" />
      </DropIn>
      <DropIn order={1}>
      <IconButton
        label={isActive ? 'Inativar conta' : 'Reativar conta'}
        title={isActive ? 'Inativar conta' : 'Reativar conta'}
        icon={<FaPowerOff />}
        onClick={onToggleActive}
        disabled={busy}
      />
      </DropIn>
      <DropIn order={2} pulse>
      <IconButton
        label="Excluir conta"
        title={isDeletable ? 'Excluir conta' : DELETE_BLOCKED_HINT}
        icon={<FaTrash />}
        tone="danger"
        onClick={onDeleteRequest}
        disabled={busy || !isDeletable}
      />
      </DropIn>
    </div>
  );
}
