"use client";

import { useEffect } from "react";

// Dentro de (home) a barra lateral e o cabeçalho continuam de pé: só o conteúdo da tela é trocado.
export default function HomeError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    void fetch("/api/observability/client-error", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        digest: error.digest,
        surface: "route",
        path: window.location.pathname,
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, [error.digest]);

  return (
    <section
      className="mx-auto mt-10 w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center"
      role="alert"
    >
      <h1 className="text-xl font-semibold text-[var(--foreground)]">Não foi possível carregar esta tela</h1>
      <p className="mt-3 text-base leading-relaxed text-[var(--text-muted)]">
        O restante do app continua disponível. Tente novamente ou volte para outra seção.
      </p>
      {error.digest ? (
        <p className="mt-3 break-all font-mono text-sm text-[var(--text-subtle)]">Código: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={retry}
        className="mt-6 min-h-11 rounded-full bg-[var(--primary)] px-5 py-2 text-base font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
      >
        Tentar novamente
      </button>
    </section>
  );
}
