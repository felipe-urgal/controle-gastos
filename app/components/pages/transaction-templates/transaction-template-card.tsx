'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { FaArrowDown, FaArrowUp, FaPen, FaRegStar, FaStar, FaTrashAlt } from 'react-icons/fa';

import { templateTags, type TemplateTagTone } from '@/app/components/pages/transaction-templates/transaction-templates-model';
import { Button, IconButton } from '@/app/components/ui';
import { CARD_EASE } from '@/app/components/ui/motion';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { TransactionTemplateDTO } from '@/app/types/transaction-template';

const TAG_CLASS: Record<TemplateTagTone, string> = {
  filled: 'text-[var(--foreground)]',
  todo: 'italic text-[var(--text-muted)]',
  warn: 'font-semibold text-[var(--warning)]',
};

export default function TransactionTemplateCard({
  index = 0,
  item,
  showValues,
  favoriteBusy,
  deleting,
  onEdit,
  onToggleFavorite,
  onDelete,
}: {
  /** Posição na lista: define a ordem em que as cartas são "dadas". */
  index?: number;
  item: TransactionTemplateDTO;
  showValues: boolean;
  favoriteBusy: boolean;
  deleting: boolean;
  onEdit: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}) {
  const reduce = useReducedMotion();
  const income = item.type === 'INCOME';
  const amount = item.amount === null
    ? null
    : showValues
      ? formatCurrency(item.amount, item.account?.currency ?? 'BRL')
      : '••••';

  return (
    // A carta é "dada" na mesa (vem de cima, girada, e assenta); sair da lista a faz encolher e girar para o outro lado.
    <motion.article
      layout="position"
      initial={reduce ? false : { opacity: 0, y: -50, x: -24, rotate: -7, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, x: 0, rotate: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.1 }}
      exit={{ opacity: 0, scale: 0.8, rotate: 5, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 230, damping: 17, delay: Math.min(index, 8) * 0.07 }}
      whileHover="hover"
      whileTap={{ scale: 0.985, transition: { type: 'spring', stiffness: 500, damping: 20 } }}
      className="grid min-w-0 gap-2.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3.5 sm:p-4"
    >
      <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3">
        <motion.span
          className={`grid h-10 w-10 place-items-center overflow-hidden rounded-[var(--radius-md)] ${income ? 'bg-[color-mix(in_srgb,var(--income)_12%,transparent)] text-[var(--income)]' : 'bg-[var(--danger-subtle)] text-[var(--expense)]'}`}
          aria-hidden="true"
          // No hover (ou toque) a seta se move no sentido do dinheiro: receita desce para o saldo, despesa sobe e sai.
          variants={{ hover: { y: income ? [0, 7, 0] : [0, -7, 0], scale: [1, 1.12, 1], transition: { duration: 0.5 } } }}
        >
          {income ? <FaArrowDown /> : <FaArrowUp />}
        </motion.span>
        <motion.div className="min-w-0" variants={{ hover: { x: 4, transition: { type: 'spring', stiffness: 400, damping: 22 } } }}>
          <h3 className="break-words text-sm font-bold">{item.name}</h3>
          {item.description && <p className="break-words text-sm text-[var(--text-muted)]">{item.description}</p>}
        </motion.div>
        {amount === null ? (
          <span className="text-xs italic text-[var(--text-muted)]">Valor ao usar</span>
        ) : (
          <motion.span
            className={`money origin-right text-xl font-semibold ${income ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}
            variants={{ hover: { scale: 1.08, transition: { type: 'spring', stiffness: 400, damping: 16 } } }}
          >
            {income ? '+ ' : '− '}
            {amount}
          </motion.span>
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
          {/* Ao favoritar a estrela gira e "estoura"; ao desfavoritar ela só se acomoda. */}
          <motion.span
            className="flex"
            initial={false}
            animate={item.isFavorite && !reduce ? { scale: [1, 1.6, 1], rotate: [0, 144, 0] } : { scale: 1, rotate: 0 }}
            transition={{ duration: 0.55, ease: CARD_EASE }}
            whileTap={{ scale: 0.8 }}
          >
            <IconButton
              label={`${item.isFavorite ? 'Desfavoritar' : 'Favoritar'} ${item.name}`}
              icon={item.isFavorite ? <FaStar /> : <FaRegStar />}
              tone={item.isFavorite ? 'primary' : 'neutral'}
              disabled={favoriteBusy}
              onClick={onToggleFavorite}
            />
          </motion.span>
          <IconButton label={`Editar ${item.name}`} icon={<FaPen />} onClick={onEdit} />
          <IconButton label={`Excluir ${item.name}`} icon={<FaTrashAlt />} tone="danger" disabled={deleting} onClick={onDelete} />
        </span>
      </div>
    </motion.article>
  );
}
