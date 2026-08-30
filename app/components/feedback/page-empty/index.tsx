'use client';

import { Button } from '@/app/components/ui';

interface PageEmptyProps {
  title: string;
  description?: string;
  buttonText?: string;
  redirectTo?: string;
}

export default function PageEmpty({
  title,
  description,
  buttonText,
  redirectTo,
}: PageEmptyProps) {
  return (
    <div className="ds-panel p-6 text-center sm:p-8">
      <h2 className="text-xl font-semibold text-[var(--foreground)]">{title}</h2>

      {description && (
        <p className="mx-auto mt-2 max-w-xl text-base leading-relaxed text-[var(--text-muted)]">
          {description}
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
  );
}
