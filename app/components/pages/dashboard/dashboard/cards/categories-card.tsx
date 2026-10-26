'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { SectionMessage } from '@/app/components/pages/dashboard/dashboard/cards/section-message';
import Link from 'next/link';
import { IconRenderer } from '@/app/components/ui';
import { CategoryBudgetBar, FillBar } from '@/app/components/pages/dashboard/dashboard/cards/category-budget';
import { MonthlyDashboard } from '@/app/types/dashboard';
import { FaChevronRight } from 'react-icons/fa';
import { displayMoney, monthLabel } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';

const MotionLink = motion.create(Link);

type CategoryItem = MonthlyDashboard['categories'][number];

/** Linha de categoria: ao passar o mouse, a barra "recarrega" do zero com o brilho e o ícone gira. */
function CategoryRow({
  category,
  limit,
  index,
  showValues,
  currency,
}: {
  category: CategoryItem;
  limit: MonthlyDashboard['limits'][number] | undefined;
  index: number;
  showValues: boolean;
  currency: string;
}) {
  const [refill, setRefill] = useState(0);

  return (
    <MotionLink
      href={`/categorias/show/${encodeURIComponent(category.id)}`}
      whileHover="hover"
      whileTap={{ scale: 0.985 }}
      onHoverStart={() => setRefill((count) => count + 1)}
      className="block rounded-[var(--radius-md)] py-2 transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
    >
      <span className="flex min-h-8 items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5">
          <motion.span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white"
            style={{ backgroundColor: category.color }}
            variants={{ hover: { rotate: 360, transition: { duration: 0.6, ease: 'easeInOut' } } }}
          >
            <IconRenderer iconName={category.icon || 'tag'} size={14} />
          </motion.span>
          <span className="truncate text-sm font-semibold">{category.name}</span>
        </span>
        <strong className="text-right text-sm"><span className="money">{displayMoney(category.realized, showValues, currency)}</span></strong>
      </span>
      <span className="mt-1.5 block pl-[38px]">
        {limit ? (
          <CategoryBudgetBar limit={limit} showValues={showValues} currency={currency} delay={index * 0.1} refillKey={refill} />
        ) : (
          <span className="flex items-center gap-3">
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
              <FillBar key={refill} percent={category.sharePercentage} className="bg-[var(--primary)]" delay={index * 0.1} />
            </span>
            <span className="w-12 text-right text-xs font-semibold text-[var(--text-muted)]">{category.sharePercentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>
          </span>
        )}
      </span>
    </MotionLink>
  );
}

export function CategoriesCard({
  categories,
  limits,
  showValues,
  currency,
  period,
}: {
  categories: MonthlyDashboard['categories'];
  limits: MonthlyDashboard['limits'];
  showValues: boolean;
  currency: string;
  period: MonthlyDashboard['period'];
}) {
  return (
    <article className="h-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-[14px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Para onde foi o dinheiro</h2>
        <span className="text-xs font-semibold text-[var(--text-muted)]">{monthLabel(`${period.year}-${String(period.month).padStart(2, '0')}`)}</span>
      </div>
      <div className="mt-2 divide-y divide-[var(--border)]">
        {categories.length === 0 ? (
          <SectionMessage tone="empty">Nenhuma despesa categorizada neste período.</SectionMessage>
        ) : (
          categories.map((category, index) => {
            const limit = limits.find((item) => item.category.id === category.id);

            return (
              <CategoryRow
                key={category.id}
                category={category}
                limit={limit}
                index={index}
                showValues={showValues}
                currency={currency}
              />
            );
          })
        )}
      </div>
      <MotionLink href="/categorias" whileHover="hover" whileTap={{ scale: 0.98 }} className="mt-2 flex min-h-11 items-center justify-between rounded-[var(--radius-md)] border border-[var(--border-strong)] px-3 text-sm font-semibold">
        {/* O texto "abre" (espaçamento entre letras) e o chevron avança. */}
        <motion.span variants={{ hover: { letterSpacing: '0.05em' } }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          Ver todas as categorias
        </motion.span>
        <motion.span className="flex" variants={{ hover: { x: 5 } }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}>
          <FaChevronRight aria-hidden="true" />
        </motion.span>
      </MotionLink>
    </article>
  );
}
