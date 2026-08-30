'use client';

import Link from 'next/link';

import { ViewCard, ViewList } from '@/app/components/pages/account';
import { AccountCardProps } from '@/app/lib/interface/accounts.interface';

export default function AccountCard({
  account,
  viewMode = 'list',
  searchTerm = '',
}: AccountCardProps) {
  return (
    <Link
      href={`/contas/show/${account.id}`}
      aria-label={`Abrir detalhes da conta ${account.name}`}
      className="block overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--border-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
    >
      <div className="p-4 sm:p-5">
        {viewMode === 'list' ? (
          <ViewList account={account} searchTerm={searchTerm} />
        ) : (
          <ViewCard account={account} searchTerm={searchTerm} />
        )}
      </div>
    </Link>
  );
}
