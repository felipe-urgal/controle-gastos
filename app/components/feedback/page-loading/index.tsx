'use client';

interface PageLoadingProps {
  type?: 'form' | 'list' | 'details';
}

const Skeleton = ({ className }: { className: string }) => (
  <div className={`rounded-[var(--radius-md)] bg-[var(--skeleton)] ${className}`} />
);

export default function PageLoading({ type = 'form' }: PageLoadingProps) {
  return (
    <div className="ds-panel mt-4 p-4 sm:p-5" role="status" aria-live="polite">
      <span className="sr-only">Carregando conteúdo</span>
      <div className="animate-pulse space-y-4" aria-hidden="true">
        {type === 'form' && (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
            <Skeleton className="h-32" />
            <div className="flex justify-end gap-3">
              <Skeleton className="h-11 w-28" />
              <Skeleton className="h-11 w-36" />
            </div>
          </>
        )}

        {type === 'details' && (
          <>
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-24" />
          </>
        )}

        {type === 'list' && (
          <div className="space-y-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        )}
      </div>
    </div>
  );
}
