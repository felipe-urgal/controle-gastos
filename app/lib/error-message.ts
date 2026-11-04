/** Mensagem exibível de um erro desconhecido; usa `fallback` quando não há texto útil. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
