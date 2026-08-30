'use client';

import Link from 'next/link';

import { ViewCard, ViewList } from '@/app/components/pages/category';
import { CategoryCardProps } from '@/app/lib/interface/category.interface';

export default function CategoryCard({
  category,
  viewMode = 'list',
  searchTerm = '',
}: CategoryCardProps) {
  return (
    <Link
      href={`/categorias/show/${category.id}`}
      aria-label={`Abrir detalhes da categoria ${category.name}`}
      className="block overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--border-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
    >
      <div className="p-4 sm:p-5">
        {viewMode === 'list' ? (
          <ViewList category={category} searchTerm={searchTerm} />
        ) : (
          <ViewCard category={category} searchTerm={searchTerm} />
        )}
      </div>
    </Link>
  );
}
