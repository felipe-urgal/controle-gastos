'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { useState } from 'react';
import {
  FaArrowDown,
  FaArrowLeft,
  FaArrowUp,
  FaCalendarAlt,
  FaChevronRight,
  FaEllipsisV,
  FaPen,
  FaReceipt,
  FaTag,
  FaTrash,
} from 'react-icons/fa';

import { IconRenderer } from '@/app/components/ui';
import { typeConfig } from '@/app/lib/constants/category.constants';
import type { CategoryModel } from '@/app/types/category';

type CategoryMobileTab = 'overview' | 'usage' | 'about';

interface MobileCategoryShowProps {
  category: CategoryModel;
  backUrl: string;
  editUrl: string;
  isDeleting: boolean;
  onDeleteRequest: () => void;
}

export default function MobileCategoryShow({
  category,
  backUrl,
  editUrl,
  isDeleting,
  onDeleteRequest,
}: MobileCategoryShowProps) {
  const [tab, setTab] = useState<CategoryMobileTab>('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const type = typeConfig[category.type];
  const TypeIcon = category.type === 'INCOME' ? FaArrowUp : FaArrowDown;

  return (
    <div
      className={`mx-auto w-full max-w-[430px] pb-5 transition-opacity duration-150 ${
        isDeleting ? 'pointer-events-none opacity-50' : ''
      }`}
    >
      <header className="relative grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 pb-5">
        <Link
          href={backUrl}
          aria-label="Voltar para categorias"
          className="grid h-11 w-11 place-items-center rounded-full text-lg text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          <FaArrowLeft aria-hidden="true" />
        </Link>

        <h1 className="truncate text-center text-[22px] font-extrabold tracking-tight text-[var(--foreground)] min-[390px]:text-[24px]">
          {category.name}
        </h1>

        <div className="relative">
          <button
            type="button"
            aria-label="Mais ações"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
            className="grid h-11 w-11 place-items-center rounded-full text-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            <FaEllipsisV aria-hidden="true" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-12 z-30 w-48 overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-elevated)]">
              <Link
                href={editUrl}
                onClick={() => setMenuOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]"
              >
                <FaPen className="text-[var(--orbit-primary)]" aria-hidden="true" />
                Editar categoria
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDeleteRequest();
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-sm font-semibold text-[var(--expense)] transition-colors hover:bg-[var(--danger-subtle)]"
              >
                <FaTrash aria-hidden="true" />
                Excluir categoria
              </button>
            </div>
          )}
        </div>
      </header>

      <section
        className="relative overflow-hidden rounded-[24px] border border-[var(--border-strong)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--surface)_82%,var(--background))_0%,color-mix(in_srgb,var(--surface)_68%,var(--background))_100%)] p-5 shadow-[var(--shadow-soft)]"
        aria-label="Resumo da categoria"
      >
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full opacity-20 blur-2xl"
          style={{ backgroundColor: category.color || '#7C3AED' }}
          aria-hidden="true"
        />

        <div className="relative z-[1] flex items-start gap-4">
          <span
            className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-[20px] text-[29px] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]"
            style={{ backgroundColor: category.color || '#64748B' }}
            aria-hidden="true"
          >
            <IconRenderer iconName={category.icon || 'tag'} size={29} />
          </span>

          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="truncate text-[24px] font-extrabold tracking-tight text-[var(--foreground)]">
              {category.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-bold ${type.bgColor} ${type.color} ${type.borderColor}`}
              >
                <TypeIcon aria-hidden="true" />
                {type.label}
              </span>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-bold ${
                  category.isActive
                    ? 'border-[var(--income)]/30 bg-[color-mix(in_srgb,var(--income)_12%,transparent)] text-[var(--income)]'
                    : 'border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-muted)]'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    category.isActive ? 'bg-[var(--income)]' : 'bg-[var(--text-subtle)]'
                  }`}
                  aria-hidden="true"
                />
                {category.isActive ? 'Ativa' : 'Inativa'}
              </span>
            </div>
          </div>
        </div>

        <p className="relative z-[1] mt-5 text-[15px] leading-relaxed text-[var(--text-muted)]">
          {category.description || 'Sem descrição cadastrada.'}
        </p>
      </section>

      <nav
        className="mt-5 grid grid-cols-3 border-b border-[var(--border)]"
        aria-label="Seções da categoria"
      >
        {[
          { key: 'overview' as const, label: 'Visão geral' },
          { key: 'usage' as const, label: 'Uso' },
          { key: 'about' as const, label: 'Sobre' },
        ].map((item) => {
          const active = tab === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              aria-pressed={active}
              className={`relative min-h-[58px] px-1 text-[14px] font-bold transition-colors min-[390px]:text-[15px] ${
                active
                  ? 'text-[var(--orbit-primary)]'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              {item.label}
              {active && (
                <span
                  className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-[var(--orbit-primary)]"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </nav>

      {tab === 'overview' && (
        <div className="mt-7 space-y-7">
          <section aria-labelledby="category-financial-rule-mobile">
            <h2
              id="category-financial-rule-mobile"
              className="text-[24px] font-extrabold tracking-tight text-[var(--foreground)]"
            >
              Regra financeira
            </h2>

            <div className="mt-4 rounded-[18px] border border-[var(--border-strong)] bg-[var(--surface)] p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[var(--orbit-primary-subtle)] text-xl text-[var(--orbit-primary)]">
                  <TypeIcon aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <strong className="block text-[17px] font-extrabold text-[var(--foreground)]">
                    {category.type === 'INCOME' ? 'Receita' : 'Despesa'}
                  </strong>
                  <p className="mt-1 text-[14px] leading-relaxed text-[var(--text-muted)]">
                    Usada como referência ao criar ou editar transações.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby="category-activity-mobile">
            <h2
              id="category-activity-mobile"
              className="text-[24px] font-extrabold tracking-tight text-[var(--foreground)]"
            >
              Atividade
            </h2>

            <Link
              href={`/transacoes?categoryId=${encodeURIComponent(category.id)}`}
              className="mt-4 flex min-h-[76px] items-center gap-4 rounded-[18px] border border-[var(--border-strong)] bg-[var(--surface)] px-4 transition-colors hover:bg-[var(--surface-hover)]"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[var(--orbit-primary-subtle)] text-lg text-[var(--orbit-primary)]">
                <FaReceipt aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <strong className="block text-[20px] font-extrabold text-[var(--foreground)]">
                  {category.transactionsCount}
                </strong>
                <span className="mt-0.5 block text-sm text-[var(--text-muted)]">
                  {category.transactionsCount === 1 ? 'transação' : 'transações'}
                </span>
              </div>
              <FaChevronRight className="shrink-0 text-sm text-[var(--text-muted)]" aria-hidden="true" />
            </Link>
          </section>

          <Link
            href={editUrl}
            className="flex min-h-[60px] w-full items-center justify-center gap-3 rounded-full bg-[linear-gradient(90deg,#7c3aed_0%,#8b5cf6_52%,#7c3aed_100%)] px-5 text-[17px] font-extrabold text-white shadow-[0_16px_36px_rgba(124,58,237,.30)]"
          >
            <FaPen aria-hidden="true" />
            Editar categoria
          </Link>
        </div>
      )}

      {tab === 'usage' && (
        <section className="mt-7" aria-labelledby="category-usage-mobile">
          <h2
            id="category-usage-mobile"
            className="text-[24px] font-extrabold tracking-tight text-[var(--foreground)]"
          >
            Uso da categoria
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
            Veja quantas movimentações usam esta categoria.
          </p>

          <div className="mt-4 rounded-[22px] border border-[var(--border-strong)] bg-[var(--surface)] p-5">
            <span className="grid h-14 w-14 place-items-center rounded-[16px] bg-[var(--orbit-primary-subtle)] text-[22px] text-[var(--orbit-primary)]">
              <FaReceipt aria-hidden="true" />
            </span>
            <strong className="mt-6 block text-[42px] font-extrabold leading-none tracking-tight text-[var(--foreground)]">
              {category.transactionsCount}
            </strong>
            <span className="mt-2 block text-base text-[var(--text-muted)]">
              {category.transactionsCount === 1 ? 'transação vinculada' : 'transações vinculadas'}
            </span>

            <Link
              href={`/transacoes?categoryId=${encodeURIComponent(category.id)}`}
              className="mt-6 flex min-h-[54px] items-center justify-center gap-2 rounded-full border border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] px-4 text-base font-bold text-[var(--orbit-primary)]"
            >
              Ver movimentações
              <FaChevronRight aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}

      {tab === 'about' && (
        <section className="mt-7" aria-labelledby="category-about-mobile">
          <h2
            id="category-about-mobile"
            className="text-[24px] font-extrabold tracking-tight text-[var(--foreground)]"
          >
            Sobre
          </h2>

          <div className="mt-4 overflow-hidden rounded-[18px] border border-[var(--border-strong)] bg-[var(--surface)]">
            <div className="px-4 py-5">
              <div className="flex items-center gap-3">
                <FaTag className="text-[var(--text-muted)]" aria-hidden="true" />
                <span className="text-sm font-semibold text-[var(--text-muted)]">
                  Descrição
                </span>
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--foreground)]">
                {category.description || 'Sem descrição cadastrada.'}
              </p>
            </div>

            <div className="mx-4 border-t border-[var(--border)]" />

            <dl>
              <div className="flex min-h-[72px] items-center gap-3 px-4">
                <FaCalendarAlt className="shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
                <dt className="text-[15px] text-[var(--text-muted)]">Criada em</dt>
                <dd className="ml-auto text-right text-[15px] font-semibold text-[var(--foreground)]">
                  {format(new Date(category.createdAt), "dd 'de' MMM 'de' yyyy", {
                    locale: ptBR,
                  })}
                </dd>
              </div>
              <div className="mx-4 border-t border-[var(--border)]" />
              <div className="flex min-h-[72px] items-center gap-3 px-4">
                <FaCalendarAlt className="shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
                <dt className="text-[15px] text-[var(--text-muted)]">Atualizada</dt>
                <dd className="ml-auto text-right text-[15px] font-semibold text-[var(--foreground)]">
                  {format(new Date(category.updatedAt), "dd 'de' MMM 'de' yyyy", {
                    locale: ptBR,
                  })}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      )}
    </div>
  );
}
