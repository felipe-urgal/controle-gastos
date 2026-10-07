import { z } from "zod";

export const payrollPageSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export function payrollSearchParams(request: Request) {
  return Object.fromEntries(new URL(request.url).searchParams.entries());
}

export function pageInfo(args: {
  page: number;
  limit: number;
  fetched: number;
}) {
  return {
    page: args.page,
    limit: args.limit,
    hasMore: args.fetched > args.limit,
  };
}
