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
      <body>
        <main className="flex min-h-screen items-center justify-center px-6">
          <section className="w-full max-w-md rounded-2xl p-8 text-center">
            <h1 className="text-2xl font-semibold">Algo deu errado</h1>
            <p className="mt-3 text-sm">
              Não foi possível carregar a aplicação. Tente novamente.
            </p>
            {error.digest ? (
              <p className="mt-3 text-xs">Código: {error.digest}</p>
            ) : null}
            <button
              type="button"
              onClick={reset}
              className="mt-6 rounded-lg border px-4 py-2 text-sm font-semibold"
            >
              Tentar novamente
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
