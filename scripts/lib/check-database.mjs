export function resolveCheckDatabaseUrl(env = process.env) {
  const value = env.CHECK_DATABASE_URL?.trim();

  if (!value) {
    throw new Error(
      'prod:check exige CHECK_DATABASE_URL apontando para um banco de teste isolado.',
    );
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('CHECK_DATABASE_URL não é uma URL PostgreSQL válida.');
  }

  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error('CHECK_DATABASE_URL deve usar o protocolo PostgreSQL.');
  }

  if (!parsed.hostname || !parsed.pathname || parsed.pathname === '/') {
    throw new Error('CHECK_DATABASE_URL deve identificar host e database de teste.');
  }

  return value;
}
