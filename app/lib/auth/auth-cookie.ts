function firstForwardedProto(request: Request): string | null {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (!forwardedProto) return null;

  const [first] = forwardedProto.split(",");
  return first?.trim().toLowerCase() || null;
}

export function shouldUseSecureAuthCookie(request: Request): boolean {
  const protocol = new URL(request.url).protocol;

  if (protocol === "https:") return true;

  return firstForwardedProto(request) === "https";
}

// Em HTTPS usamos o prefixo __Host- (Secure, Path=/, sem Domain), o que impede
// que subdomínios/caminhos sobrescrevam a sessão. Em HTTP (dev/E2E local) o
// prefixo é inválido, então mantemos o nome legado.
export const LEGACY_AUTH_COOKIE_NAME = "token";
export const HOST_AUTH_COOKIE_NAME = "__Host-token";
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

type CookieWriter = {
  cookies: {
    set(name: string, value: string, options: Record<string, unknown>): unknown;
  };
};

function baseAuthCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    priority: "high" as const,
  };
}

/** Lê o token preferindo __Host-; o nome legado cobre sessões já emitidas. */
export function readAuthCookie(store: CookieReader): string | undefined {
  return (
    store.get(HOST_AUTH_COOKIE_NAME)?.value ??
    store.get(LEGACY_AUTH_COOKIE_NAME)?.value
  );
}

export function setAuthCookie(
  response: CookieWriter,
  request: Request,
  token: string,
) {
  const secure = shouldUseSecureAuthCookie(request);

  // Evita um cookie legado antigo coexistir com o novo.
  if (secure) {
    response.cookies.set(LEGACY_AUTH_COOKIE_NAME, "", {
      ...baseAuthCookieOptions(true),
      maxAge: 0,
    });
  }

  response.cookies.set(
    secure ? HOST_AUTH_COOKIE_NAME : LEGACY_AUTH_COOKIE_NAME,
    token,
    { ...baseAuthCookieOptions(secure), maxAge: AUTH_COOKIE_MAX_AGE_SECONDS },
  );
}

/** Expira os dois nomes; remover __Host- exige Secure + Path=/. */
export function clearAuthCookies(response: CookieWriter, secure: boolean) {
  response.cookies.set(LEGACY_AUTH_COOKIE_NAME, "", {
    ...baseAuthCookieOptions(secure),
    maxAge: 0,
  });
  response.cookies.set(HOST_AUTH_COOKIE_NAME, "", {
    ...baseAuthCookieOptions(true),
    maxAge: 0,
  });
}
