export function normalizeTransactionTemplateName(name: string) {
  return name
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
}
