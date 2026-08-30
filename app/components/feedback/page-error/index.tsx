'use client';

import { Button } from '@/app/components/ui';

interface PageErrorProps {
  title?: string;
  message?: string;
  buttonText?: string;
  redirectTo?: string;
  fullScreen?: boolean;
}

export default function PageError({
  title = 'Erro ao carregar',
  message,
  buttonText,
  redirectTo,
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

        {buttonText && redirectTo && (
          <div className="mt-5 flex justify-center">
            <Button as="a" href={redirectTo} variant="primary">
              {buttonText}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
