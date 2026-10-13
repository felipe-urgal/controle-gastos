import pg from "pg";

/**
 * Mede o custo de uma operação em statements SQL reais enviados ao Postgres
 * (inclui BEGIN/COMMIT) e em tempo de parede. Instrumenta apenas o cliente `pg`
 * durante a chamada; não depende de logs do Prisma nem altera código de produção.
 *
 * Use para budgets de regressão de custo: a contagem de statements deve ser
 * independente do volume de dados (sem N+1) e ficar abaixo de um teto absoluto.
 */
export async function measureSql<T>(operation: () => Promise<T>) {
  const prototype = pg.Client.prototype as unknown as {
    query: (...args: unknown[]) => unknown;
  };
  const original = prototype.query;
  let statements = 0;

  prototype.query = function patched(this: unknown, ...args: unknown[]) {
    statements += 1;
    return original.apply(this, args);
  };

  const startedAt = performance.now();
  try {
    const result = await operation();
    return {
      result,
      statements,
      durationMs: Math.round(performance.now() - startedAt),
    };
  } finally {
    prototype.query = original;
  }
}
