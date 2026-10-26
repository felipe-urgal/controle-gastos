'use client';

import { FaArrowDown, FaArrowUp, FaPen, FaRegStar, FaStar, FaTrashAlt } from 'react-icons/fa';

import { templateTags, type TemplateTagTone } from '@/app/components/pages/transaction-templates/transaction-templates-model';
import { Button, IconButton } from '@/app/components/ui';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { TransactionTemplateDTO } from '@/app/types/transaction-template';

const TAG_CLASS: Record<TemplateTagTone, string> = {
  filled: 'text-[var(--foreground)]',
  todo: 'italic text-[var(--text-muted)]',
  warn: 'font-semibold text-[var(--warning)]',
};

export default function TransactionTemplateCard({
  item,
  showValues,
  favoriteBusy,
  deleting,
  onEdit,
  onToggleFavorite,
  onDelete,
}: {
  item: TransactionTemplateDTO;
  showValues: boolean;
  favoriteBusy: boolean;
  deleting: boolean;
  onEdit: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}) {
  const income = item.type === 'INCOME';
  const amount = item.amount === null
    ? null
    : showValues
      ? formatCurrency(item.amount, item.account?.currency ?? 'BRL')
      : '••••';

  return (
    <article className="grid min-w-0 gap-2.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3.5 sm:p-4">
      <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3">
        <span
          className={`grid h-10 w-10 place-items-center rounded-[var(--radius-md)] ${income ? 'bg-[color-mix(in_srgb,var(--income)_12%,transparent)] text-[var(--income)]' : 'bg-[var(--danger-subtle)] text-[var(--expense)]'}`}
          aria-hidden="true"
        >
          {income ? <FaArrowDown /> : <FaArrowUp />}
        </span>
        <div className="min-w-0">
          <h3 className="break-words text-sm font-bold">{item.name}</h3>
          {item.description && <p className="break-words text-sm text-[var(--text-muted)]">{item.description}</p>}
        </div>
        {amount === null ? (
          <span className="text-xs italic text-[var(--text-muted)]">Valor ao usar</span>
        ) : (
          <span className={`money text-xl font-semibold ${income ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
            {income ? '+ ' : '− '}
            {amount}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-xs">
          {templateTags(item).map((tag, index) => (
            <span key={tag.label}>
              {index > 0 && <span className="text-[var(--text-muted)]"> · </span>}
              <span className={TAG_CLASS[tag.tone]}>{tag.label}</span>
            </span>
          ))}
        </p>
        <span className="flex shrink-0 items-center">
          <Button as="a" href={`/transacoes/nova?template=${encodeURIComponent(item.id)}`} size="sm" className="mr-1 min-w-20">
            Usar
          </Button>
          <IconButton
            label={`${item.isFavorite ? 'Desfavoritar' : 'Favoritar'} ${item.name}`}
            icon={item.isFavorite ? <FaStar /> : <FaRegStar />}
            tone={item.isFavorite ? 'primary' : 'neutral'}
            disabled={favoriteBusy}
            onClick={onToggleFavorite}
          />
          <IconButton label={`Editar ${item.name}`} icon={<FaPen />} onClick={onEdit} />
          <IconButton label={`Excluir ${item.name}`} icon={<FaTrashAlt />} tone="danger" disabled={deleting} onClick={onDelete} />
        </span>
      </div>
    </article>
  );
}
