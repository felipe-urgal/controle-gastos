/** Os crons da Vercel chamam a rota com `Authorization: Bearer <CRON_SECRET>`; sem segredo configurado, nada roda. */
export function isCronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
