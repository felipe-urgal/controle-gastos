'use client';

import { Button } from '@/app/components/ui';

/** Estado vazio/erro de um card: mensagem única e, no erro, ação de nova tentativa. */
export function SectionMessage({
  tone,
  children,
  onRetry,
  retryLabel,
  className = 'py-4',
}: {
  tone: 'empty' | 'error';
  children: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className={`text-sm ${tone === 'error' ? 'text-[var(--expense)]' : 'text-[var(--text-muted)]'}`}>{children}</p>
      {tone === 'error' && onRetry && (
        <Button type="button" size="sm" variant="outline" className="mt-2" onClick={onRetry} aria-label={retryLabel}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
