"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch("/api/observability/client-error", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ digest: error.digest }),
      keepalive: true,
    }).catch(() => undefined);
  }, [error.digest]);

  return (
    <html lang="pt-BR">
      <body className="bg-[var(--background)] text-[var(--foreground)]">
        <main className="flex min-h-screen items-center justify-center px-6 py-10">
          <section
            className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[var(--shadow-surface)]"
            role="alert"
          >
            <h1 className="text-2xl font-semibold">Algo deu errado</h1>
            <p className="mt-3 text-base leading-relaxed text-[var(--text-muted)]">
              Não foi possível carregar a aplicação. Tente novamente.
            </p>
            {error.digest ? (
              <p className="mt-3 break-all font-mono text-sm text-[var(--text-subtle)]">
                Código: {error.digest}
              </p>
            ) : null}
            <button
              type="button"
              onClick={reset}
              className="mt-6 min-h-11 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 text-base font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            >
              Tentar novamente
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
