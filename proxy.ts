import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAuthToken } from "@/app/lib/auth-token";

const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/calendario",
  "/categorias",
  "/contas",
  "/transacoes",
  "/usuario",
];

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = getRequestId(request);

  if (PUBLIC_ROUTES.has(pathname)) {
    return nextWithRequestId(request, requestId);
  }

  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!isProtectedRoute) {
    return nextWithRequestId(request, requestId);
  }

  const token = request.cookies.get("token")?.value;

  try {
    if (!token) throw new Error("UNAUTHORIZED");
    verifyAuthToken(token);
    return nextWithRequestId(request, requestId);
  } catch {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.headers.set("x-request-id", requestId);
    response.cookies.delete("token");
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.ico$|sw.js|manifest.json).*)",
  ],
};
