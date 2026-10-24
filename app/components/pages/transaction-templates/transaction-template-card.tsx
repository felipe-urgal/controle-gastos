'use client';

import { FaArrowDown, FaArrowUp, FaPen, FaRegStar, FaStar, FaTrashAlt } from 'react-icons/fa';

import { templateTags, type TemplateTagTone } from '@/app/components/pages/transaction-templates/transaction-templates-model';
import { Button, IconButton } from '@/app/components/ui';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { TransactionTemplateDTO } from '@/app/types/transaction-template';

const TAG_CLASS: Record<TemplateTagTone, string> = {
  filled: 'bg-[var(--surface-subtle)] text-[var(--foreground)]',
  todo: 'border border-dashed border-[var(--border-strong)] font-medium text-[var(--text-muted)]',
  warn: 'bg-[var(--warning-subtle)] text-[var(--warning)]',
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
    <article className="grid min-w-0 gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3">
        <span
          className={`grid h-10 w-10 place-items-center rounded-[var(--radius-md)] ${income ? 'bg-[var(--primary-subtle)] text-[var(--income)]' : 'bg-[var(--danger-subtle)] text-[var(--expense)]'}`}
          aria-hidden="true"
        >
          {income ? <FaArrowDown /> : <FaArrowUp />}
        </span>
        <div className="min-w-0">
          <h3 className="break-words text-sm font-bold">{item.name}</h3>
          <p className="break-words text-sm text-[var(--text-muted)]">{item.description || 'Sem descrição fixa'}</p>
        </div>
        {amount === null ? (
          <span className="text-sm text-[var(--text-muted)]">valor ao usar</span>
        ) : (
          <span className={`money text-xl font-semibold ${income ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
            {income ? '+ ' : '− '}
            {amount}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {templateTags(item).map((tag) => (
          <span key={tag.label} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TAG_CLASS[tag.tone]}`}>
            {tag.label}
          </span>
        ))}
      </div>

      <div className="-mx-1 flex items-center justify-between gap-1 border-t border-[var(--border)] px-1 pt-2.5">
        <Button as="a" href={`/transacoes/nova?template=${encodeURIComponent(item.id)}`} size="sm" className="min-w-28">
          Usar
        </Button>
        <span className="flex">
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
