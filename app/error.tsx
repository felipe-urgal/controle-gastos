"use client";

import { useEffect } from "react";

export default function ErrorPage({
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
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-md rounded-2xl bg-white/10 p-8 text-center shadow-xl backdrop-blur">
        <h1 className="text-2xl font-semibold">Algo deu errado</h1>
        <p className="mt-3 text-sm opacity-80">
          Não foi possível concluir esta operação. Tente novamente.
        </p>
        {error.digest ? (
          <p className="mt-3 text-xs opacity-60">Código: {error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900"
        >
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
