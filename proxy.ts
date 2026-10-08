import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAuthToken } from "@/app/lib/auth/auth-token";
import { isProtectedPath } from "@/app/lib/auth/protected-routes";

const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

const SAFE_REQUEST_ID = /^[a-zA-Z0-9._:-]{8,128}$/;

function getRequestId(request: NextRequest) {
  const incoming = request.headers.get("x-request-id")?.trim();
  return incoming && SAFE_REQUEST_ID.test(incoming)
    ? incoming
    : crypto.randomUUID();
}

function nextWithRequestId(request: NextRequest, requestId: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("x-request-id", requestId);
  return response;
}

// Fronteira de sessão: o proxy é um filtro barato (assinatura/expiração do JWT,
// sem consulta ao banco). A autoridade é getAuthenticatedUserId nas APIs, que
// revalida usuário ativo e authVersion e responde 401 para sessões revogadas.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = getRequestId(request);

  if (PUBLIC_ROUTES.has(pathname)) {
    return nextWithRequestId(request, requestId);
  }

  if (!isProtectedPath(pathname)) {
    return nextWithRequestId(request, requestId);
  }

  const token = request.cookies.get("token")?.value;

  try {
    if (!token) throw new Error("UNAUTHORIZED");
    verifyAuthToken(token);
    return nextWithRequestId(request, requestId);
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("x-request-id", requestId);
    response.cookies.delete("token");
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.ico$|sw.js|offline.html|offline-transacao.html|manifest.json).*)",
  ],
};
