'use client';

import { Button } from '@/app/components/ui';

interface PageErrorProps {
  title?: string;
  message?: string;
  buttonText?: string;
  redirectTo?: string;
  onRetry?: () => void;
  fullScreen?: boolean;
}

export default function PageError({
  title = 'Erro ao carregar',
  message,
  buttonText,
  redirectTo,
  onRetry,
  fullScreen = false,
}: PageErrorProps) {
  return (
    <div
      className={`${fullScreen ? 'flex min-h-screen items-center justify-center' : 'mt-4'} ds-panel p-6 text-center sm:p-8`}
      role="alert"
    >
      <div className="w-full">
        <h2 className="text-xl font-semibold text-[var(--foreground)]">{title}</h2>

        {message && (
          <p className="mx-auto mt-2 max-w-xl text-base leading-relaxed text-[var(--text-muted)]">
            {message}
          </p>
        )}

        {buttonText && (redirectTo || onRetry) && (
          <div className="mt-5 flex justify-center">
            {onRetry ? (
              <Button type="button" variant="primary" onClick={onRetry}>
                {buttonText}
              </Button>
            ) : (
              <Button as="a" href={redirectTo!} variant="primary">
                {buttonText}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
