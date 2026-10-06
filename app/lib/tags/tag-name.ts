export function normalizeTagDisplayName(value: string) {
  return value
    .normalize("NFC")
    .trim()
    .replace(/^#+\s*/u, "")
    .replace(/\s+/gu, " ");
}

export function normalizeTagNameKey(value: string) {
  return normalizeTagDisplayName(value).toLocaleLowerCase("pt-BR");
}
