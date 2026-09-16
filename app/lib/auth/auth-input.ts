export const AUTH_INPUT_LIMITS = {
  email: 120,
  name: 100,
  password: 100,
  resetToken: 64,
} as const;

export function asInputRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function stringInput(
  payload: Record<string, unknown> | null,
  field: string,
): string | undefined {
  const value = payload?.[field];
  return typeof value === "string" ? value : undefined;
}
