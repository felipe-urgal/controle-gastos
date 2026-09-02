import { createConnection } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

const DEFAULT_POSTGRES_PORT = 5432;
const DEFAULT_WAIT_TIMEOUT_MS = 60_000;
const DEFAULT_RETRY_INTERVAL_MS = 500;
const DEFAULT_CONNECT_TIMEOUT_MS = 1_000;

function parseCheckDatabaseUrl(value) {
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

  return parsed;
}

function databaseEndpoint(databaseUrl) {
  const parsed = parseCheckDatabaseUrl(databaseUrl);
  const port = parsed.port
    ? Number.parseInt(parsed.port, 10)
    : DEFAULT_POSTGRES_PORT;

  return `${parsed.hostname}:${port}`;
}

export function resolveCheckDatabaseUrl(env = process.env) {
  const value = env.CHECK_DATABASE_URL?.trim();

  if (!value) {
    throw new Error(
      'prod:check exige CHECK_DATABASE_URL apontando para um banco de teste isolado.',
    );
  }

  parseCheckDatabaseUrl(value);
  return value;
}

export function probeCheckDatabase(
  databaseUrl,
  connectTimeoutMs = DEFAULT_CONNECT_TIMEOUT_MS,
) {
  const parsed = parseCheckDatabaseUrl(databaseUrl);
  const port = parsed.port
    ? Number.parseInt(parsed.port, 10)
    : DEFAULT_POSTGRES_PORT;

  return new Promise((resolve) => {
    const socket = createConnection({ host: parsed.hostname, port });
    let settled = false;

    const finish = (ready) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ready);
    };

    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(connectTimeoutMs, () => finish(false));
  });
}

export async function waitForCheckDatabase(
  databaseUrl,
  {
    timeoutMs = DEFAULT_WAIT_TIMEOUT_MS,
    retryIntervalMs = DEFAULT_RETRY_INTERVAL_MS,
    probe = probeCheckDatabase,
    sleep = delay,
  } = {},
) {
  const deadline = Date.now() + timeoutMs;

  while (true) {
    if (await probe(databaseUrl)) return;

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      const timeoutSeconds = Math.ceil(timeoutMs / 1000);
      throw new Error(
        `Banco isolado de check indisponível em ${databaseEndpoint(databaseUrl)} após ${timeoutSeconds}s. Inicie ou recupere o banco configurado em CHECK_DATABASE_URL e tente novamente.`,
      );
    }

    await sleep(Math.min(retryIntervalMs, remainingMs));
  }
}
