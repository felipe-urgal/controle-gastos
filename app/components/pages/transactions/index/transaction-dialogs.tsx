'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { ModalShell } from '@/app/components/overlays/modal-shell';
import { useEffect, useRef, useState } from 'react';
import { FaFileImport, FaSearch } from 'react-icons/fa';
import { FilterField } from '@/app/components/navigation/dynamic-filters';
import { Button, Input, Select } from '@/app/components/ui';
import { statusConfig } from '@/app/lib/constants/transaction.constants';
import { normalizeTagDisplayName } from '@/app/lib/tags/tag-name';
import { tagService } from '@/app/services/tag-service';
import { TransactionDTO } from '@/app/types/transaction';
import { TagDTO } from '@/app/types/tag';

export function FilterDialog({ fields, values, loading, total, origin = null, onApply, onClose }: { fields: FilterField[]; values: Record<string, any>; loading: boolean; total?: number; /** Centro do botão Filtros, de onde o diálogo voa e para onde volta. */ origin?: { x: number; y: number } | null; onApply: (values: Record<string, any>) => void; onClose: () => void }) {
  const [draftValues, setDraftValues] = useState<Record<string, any>>(() => ({ ...values }));
  const activeCount = Object.values(draftValues).filter((value) => value !== undefined && value !== null && value !== '').length;

  return (
    <ModalShell
      variant="fullscreen-sheet"
      animated
      origin={origin}
      title="Filtros"
      description={`${activeCount} filtro${activeCount === 1 ? '' : 's'} selecionado${activeCount === 1 ? '' : 's'}${total !== undefined ? ` · ${total} resultado${total === 1 ? '' : 's'}` : ''}`}
      closeLabel="Fechar filtros"
      maxWidthClass="sm:max-w-[720px]"
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button size="sm" variant="ghost" onClick={() => setDraftValues({})} disabled={activeCount === 0}>Limpar filtros</Button>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" onClick={() => { onApply(draftValues); onClose(); }}>Aplicar filtros</Button>
          </div>
        </div>
      }
    >
      <TransactionFilterFields fields={fields} values={draftValues} loading={loading} onChange={(key, value) => setDraftValues((previous) => ({ ...previous, [key]: value }))} />
      <Link
        href="/transacoes/importar"
        className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] sm:hidden"
      >
        <FaFileImport aria-hidden="true" /> Importar CSV/OFX/QFX/QIF/XLSX
      </Link>
    </ModalShell>
  );
}

export function TagFilterField({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Array<Pick<TagDTO, 'id' | 'name' | 'isActive'>>>([]);
  const [selected, setSelected] = useState<Pick<TagDTO, 'id' | 'name' | 'isActive'> | null>(null);
  const [searching, setSearching] = useState(false);
  const requestSequence = useRef(0);

  useEffect(() => {
    if (!value) return;

    let active = true;
    tagService
      .getById(value)
      .then((response) => {
        if (!active) return;
        setSelected(response.data);
      })
      .catch(() => {
        if (active) setSelected(null);
      });

    return () => {
      active = false;
    };
  }, [value]);

  const selectedTag = selected?.id === value ? selected : null;

  useEffect(() => {
    const requestId = ++requestSequence.current;
    const timeout = window.setTimeout(() => {
      setSearching(true);
      tagService
        .getActiveOptions(normalizeTagDisplayName(query))
        .then((response) => {
          if (requestId !== requestSequence.current) return;
          setOptions(response.data.items ?? []);
        })
        .catch(() => {
          if (requestId === requestSequence.current) setOptions([]);
        })
        .finally(() => {
          if (requestId === requestSequence.current) setSearching(false);
        });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [query]);

  return (
    <div className="min-w-0">
      <Input
        label="Tag"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar tag"
      />

      {selectedTag ? (
        <div className="mt-2 flex min-h-11 items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3">
          <span className="min-w-0 truncate text-sm font-semibold">
            #{selectedTag.name}{!selectedTag.isActive ? ' · arquivada' : ''}
          </span>
          <Button variant="ghost" size="xs" onClick={() => onChange('')}>
            Limpar
          </Button>
        </div>
      ) : null}

      <div className="mt-2 max-h-40 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
        {searching ? (
          <p className="p-3 text-xs text-[var(--text-muted)]">Buscando tags…</p>
        ) : options.length === 0 ? (
          <p className="p-3 text-xs text-[var(--text-muted)]">Nenhuma tag encontrada.</p>
        ) : (
          options.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => {
                setSelected(tag);
                setQuery('');
                onChange(tag.id);
              }}
              className="flex min-h-11 w-full items-center px-3 text-left text-sm hover:bg-[var(--surface-subtle)]"
            >
              #{tag.name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/** Cada campo sobe e aparece em sequência; a busca vem primeiro. */
const fieldRise = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
};

export function TransactionFilterFields({ fields, values, loading, onChange }: { fields: FilterField[]; values: Record<string, any>; loading: boolean; onChange: (key: string, value: any) => void }) {
  const reduce = useReducedMotion();
  const searchField = fields.find((field) => field.type === 'search');
  const otherFields = fields.filter((field) => field.type !== 'search');

  return (
    <motion.div
      className="space-y-5"
      initial={reduce ? false : 'hidden'}
      animate="shown"
      variants={{ shown: { transition: { delayChildren: 0.2, staggerChildren: 0.045 } } }}
    >
      {searchField?.type === 'search' && (
        <motion.div variants={fieldRise}>
        <Input value={values[searchField.key] || ''} onChange={(event) => onChange(searchField.key, event.target.value)} placeholder={searchField.placeholder} aria-label={searchField.placeholder ?? 'Pesquisar'} icon={<FaSearch />} disabled={loading} />
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {otherFields.map((field) => {
          if (field.type === 'select') {
            const grouped = Array.isArray(field.options) && field.options.length > 0 && 'options' in field.options[0];
            return (
              <motion.div key={field.key} variants={fieldRise}>
                <Select label={field.label} value={values[field.key]} onChange={(value) => onChange(field.key, value)} options={field.options} placeholder="Todos" grouped={grouped} disabled={loading} />
              </motion.div>
            );
          }

          if (field.type === 'custom') {
            return <motion.div key={field.key} variants={fieldRise}>{field.render(values[field.key], (value) => onChange(field.key, value))}</motion.div>;
          }

          return null;
        })}
      </div>
    </motion.div>
  );
}

export function StatusPill({ status }: { status: TransactionDTO['status'] }) {
  const label = statusConfig[status as keyof typeof statusConfig]?.label ?? status;
  const tone = status === 'COMPLETED'
    ? 'border-[var(--income)]/30 bg-[var(--primary-subtle)] text-[var(--income)]'
    : status === 'PENDING'
      ? 'border-[var(--warning)]/35 bg-[var(--warning-subtle)] text-[var(--pending)]'
      : 'border-[var(--border-strong)] bg-[var(--surface-subtle)] text-[var(--text-muted)]';

  return <span className={`inline-flex min-h-6 items-center rounded-full border px-2 text-xs font-bold ${tone}`}>{label}</span>;
}
