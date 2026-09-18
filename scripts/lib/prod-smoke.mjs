import { randomUUID } from "node:crypto";

export const DEFAULT_PROD_SMOKE_BASE_URL =
  "https://controle-gastos-pessoal.vercel.app";
export const DEFAULT_PROD_SMOKE_TIMEOUT_MS = 10_000;

function normalizeBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("PROD_SMOKE_BASE_URL inválida");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("PROD_SMOKE_BASE_URL deve usar http ou https");
  }

  return url.toString().replace(/\/$/, "");
}

function createRequestId(factory) {
  return `prod-smoke-${factory()}`;
}

function safeStatusError(check, response, expected) {
  return new Error(
    `${check}: status ${response.status}; esperado ${expected}`,
  );
}

function assertRequestId(response, expected, check) {
  const actual = response.headers.get("x-request-id");
  if (actual !== expected) {
    throw new Error(`${check}: x-request-id ausente ou divergente`);
  }
}

async function request({
  fetchImpl,
  baseUrl,
  path,
  requestIdFactory,
  timeoutMs,
  init = {},
}) {
  const requestId = createRequestId(requestIdFactory);
  const headers = new Headers(init.headers);
  headers.set("x-request-id", requestId);

  const response = await fetchImpl(`${baseUrl}${path}`, {
    ...init,
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
  });

  return { response, requestId };
}

function extractSessionCookie(response) {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) return null;

  const match = /(?:^|,\s*)token=([^;]+)/.exec(setCookie);
  if (!match) return null;

  return `token=${match[1]}`;
}

function safeLog(log, label, response, requestId) {
  log(
    `[ok] ${label} status=${response.status} requestId=${requestId}`,
  );
}

export async function runProdSmoke({
  baseUrl = DEFAULT_PROD_SMOKE_BASE_URL,
  email,
  password,
  fetchImpl = fetch,
  requestIdFactory = randomUUID,
  timeoutMs = DEFAULT_PROD_SMOKE_TIMEOUT_MS,
  log = console.log,
} = {}) {
  const target = normalizeBaseUrl(baseUrl);
  const hasEmail = Boolean(email);
  const hasPassword = Boolean(password);

  if (hasEmail !== hasPassword) {
    throw new Error(
      "PROD_SMOKE_EMAIL e PROD_SMOKE_PASSWORD devem ser informados juntos",
    );
  }

  const health = await request({
    fetchImpl,
    baseUrl: target,
    path: "/api/health",
    requestIdFactory,
    timeoutMs,
  });
  if (health.response.status !== 200) {
    throw safeStatusError("health", health.response, "200");
  }
  assertRequestId(health.response, health.requestId, "health");

  let healthBody;
  try {
    healthBody = await health.response.json();
  } catch {
    throw new Error("health: resposta JSON inválida");
  }
  if (
    healthBody?.status !== "ok" ||
    healthBody?.checks?.application !== "ok" ||
    healthBody?.checks?.database !== "ok"
  ) {
    throw new Error("health: application/database não estão ok");
  }
  safeLog(log, "health", health.response, health.requestId);

  const publicRoute = await request({
    fetchImpl,
    baseUrl: target,
    path: "/login",
    requestIdFactory,
    timeoutMs,
  });
  if (publicRoute.response.status !== 200) {
    throw safeStatusError("public-login", publicRoute.response, "200");
  }
  assertRequestId(
    publicRoute.response,
    publicRoute.requestId,
    "public-login",
  );
  safeLog(
    log,
    "public-login",
    publicRoute.response,
    publicRoute.requestId,
  );

  const protectedRoute = await request({
    fetchImpl,
    baseUrl: target,
    path: "/dashboard",
    requestIdFactory,
    timeoutMs,
  });
  if (![301, 302, 303, 307, 308].includes(protectedRoute.response.status)) {
    throw safeStatusError(
      "protected-dashboard",
      protectedRoute.response,
      "redirect para /login",
    );
  }
  const location = protectedRoute.response.headers.get("location");
  if (!location || new URL(location, target).pathname !== "/login") {
    throw new Error("protected-dashboard: redirect não aponta para /login");
  }
  assertRequestId(
    protectedRoute.response,
    protectedRoute.requestId,
    "protected-dashboard",
  );
  safeLog(
    log,
    "protected-dashboard",
    protectedRoute.response,
    protectedRoute.requestId,
  );

  const privateApi = await request({
    fetchImpl,
    baseUrl: target,
    path: "/api/accounts?page=1&pageSize=1",
    requestIdFactory,
    timeoutMs,
  });
  if (privateApi.response.status !== 401) {
    throw safeStatusError("private-api-unauthenticated", privateApi.response, "401");
  }
  safeLog(
    log,
    "private-api-unauthenticated",
    privateApi.response,
    privateApi.requestId,
  );

  if (!hasEmail) {
    log("[skip] authenticated-read credencial de smoke não configurada");
    return { authenticated: false };
  }

  const login = await request({
    fetchImpl,
    baseUrl: target,
    path: "/api/auth/login",
    requestIdFactory,
    timeoutMs,
    init: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
  });
  if (login.response.status !== 200) {
    throw safeStatusError("authenticated-login", login.response, "200");
  }
  assertRequestId(login.response, login.requestId, "authenticated-login");

  let loginBody;
  try {
    loginBody = await login.response.json();
  } catch {
    throw new Error("authenticated-login: resposta JSON inválida");
  }
  if (loginBody?.mfaRequired) {
    throw new Error(
      "authenticated-login: conta de smoke exige MFA; use conta dedicada sem MFA",
    );
  }
  if (loginBody?.success !== true) {
    throw new Error("authenticated-login: login não confirmado");
  }

  const sessionCookie = extractSessionCookie(login.response);
  if (!sessionCookie) {
    throw new Error("authenticated-login: cookie de sessão não recebido");
  }
  safeLog(log, "authenticated-login", login.response, login.requestId);

  for (const [label, path] of [
    ["authenticated-accounts-read", "/api/accounts?page=1&pageSize=1"],
    ["authenticated-transactions-read", "/api/transactions?page=1&pageSize=1"],
  ]) {
    const read = await request({
      fetchImpl,
      baseUrl: target,
      path,
      requestIdFactory,
      timeoutMs,
      init: {
        headers: { cookie: sessionCookie },
      },
    });

    if (read.response.status !== 200) {
      throw safeStatusError(label, read.response, "200");
    }
    safeLog(log, label, read.response, read.requestId);
  }

  return { authenticated: true };
}
