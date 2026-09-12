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
