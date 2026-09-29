import type { ZodType } from "zod";

export function parseQuery<T>(
  request: Request,
  schema: ZodType<T>,
  defaults: Readonly<Record<string, string | null | undefined>> = {},
): T {
  const values: Record<string, string | null | undefined> = { ...defaults };
  const seen = new Set<string>();
  const searchParams = new URL(request.url).searchParams;

  for (const [key, value] of searchParams) {
    if (seen.has(key)) continue;
    seen.add(key);
    values[key] = value;
  }

  return schema.parse(values);
}
