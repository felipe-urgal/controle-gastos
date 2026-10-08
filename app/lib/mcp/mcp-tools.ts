import { z } from "zod";

import { withDerivedAccountBalances } from "@/app/lib/accounts/account-balance";
import { getMonthlyDashboardForUser } from "@/app/lib/dashboard/monthly-dashboard";
import { getForecastForUser } from "@/app/lib/forecast/forecast";
import { getNetWorthForUser } from "@/app/lib/net-worth/net-worth";
import { prisma } from "@/app/lib/prisma";

const currencySchema = z.enum(["BRL", "USD", "EUR"]);
const periodFields = {
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
} as const;

const MAX_TRANSACTION_PAGE = 20;

const toolSchemas = {
  get_accounts: z
    .object({
      currency: currencySchema.optional(),
      includeInactive: z.boolean().default(false),
      page: z.number().int().min(1).max(100).default(1),
      limit: z.number().int().min(1).max(100).default(100),
    })
    .strict(),
  get_monthly_summary: z
    .object({
      ...periodFields,
      currency: currencySchema.default("BRL"),
    })
    .strict(),
  search_transactions: z
    .object({
      ...periodFields,
      currency: currencySchema.optional(),
      query: z.string().trim().min(1).max(120).optional(),
      type: z.enum(["INCOME", "EXPENSE"]).optional(),
      status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]).optional(),
      page: z.number().int().min(1).max(MAX_TRANSACTION_PAGE).default(1),
      limit: z.number().int().min(1).max(50).default(20),
    })
    .strict(),
  get_forecast: z
    .object({
      currency: currencySchema.default("BRL"),
      days: z.union([z.literal(30), z.literal(60), z.literal(90)]).default(30),
    })
    .strict(),
  get_net_worth: z
    .object({
      ...periodFields,
      months: z.number().int().min(1).max(24).default(12),
    })
    .strict(),
} as const;

export type McpToolName = keyof typeof toolSchemas;

export const MCP_TOOL_DEFINITIONS = [
  {
    name: "get_accounts",
    description:
      "Lista contas do usuário e saldos realizados derivados de transações concluídas. Cartões não recebem saldo bancário artificial.",
    inputSchema: {
      type: "object",
      properties: {
        currency: { type: "string", enum: ["BRL", "USD", "EUR"] },
        includeInactive: { type: "boolean", default: false },
        page: { type: "integer", minimum: 1, maximum: 100, default: 1 },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 100 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_monthly_summary",
    description:
      "Retorna resumo financeiro mensal canônico em uma única moeda, incluindo receitas, despesas, saldo, comparação e principais categorias.",
    inputSchema: {
      type: "object",
      properties: {
        year: { type: "integer", minimum: 2000, maximum: 2100 },
        month: { type: "integer", minimum: 1, maximum: 12 },
        currency: {
          type: "string",
          enum: ["BRL", "USD", "EUR"],
          default: "BRL",
        },
      },
      required: ["year", "month"],
      additionalProperties: false,
    },
  },
  {
    name: "search_transactions",
    description:
      "Busca transações de um único mês por description, estabelecimento, categoria e tag (sem aliases; não equivale à Busca global), com paginação limitada a 20 páginas. hasMore indica página seguinte; truncated=true indica que o teto foi atingido e há mais resultados — refine com query/type/status/currency. Nunca retorna dados de outro usuário.",
    inputSchema: {
      type: "object",
      properties: {
        year: { type: "integer", minimum: 2000, maximum: 2100 },
        month: { type: "integer", minimum: 1, maximum: 12 },
        currency: { type: "string", enum: ["BRL", "USD", "EUR"] },
        query: { type: "string", minLength: 1, maxLength: 120 },
        type: { type: "string", enum: ["INCOME", "EXPENSE"] },
        status: {
          type: "string",
          enum: ["PENDING", "COMPLETED", "CANCELLED"],
        },
        page: { type: "integer", minimum: 1, maximum: MAX_TRANSACTION_PAGE, default: 1 },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
      },
      required: ["year", "month"],
      additionalProperties: false,
    },
  },
  {
    name: "get_forecast",
    description:
      "Retorna forecast financeiro determinístico de 30, 60 ou 90 dias e safe-to-spend calculado pelo domínio.",
    inputSchema: {
      type: "object",
      properties: {
        currency: {
          type: "string",
          enum: ["BRL", "USD", "EUR"],
          default: "BRL",
        },
        days: { type: "integer", enum: [30, 60, 90], default: 30 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_net_worth",
    description:
      "Retorna patrimônio líquido por moeda e histórico mensal sem conversão cambial silenciosa.",
    inputSchema: {
      type: "object",
      properties: {
        year: { type: "integer", minimum: 2000, maximum: 2100 },
        month: { type: "integer", minimum: 1, maximum: 12 },
        months: { type: "integer", minimum: 1, maximum: 24, default: 12 },
      },
      required: ["year", "month"],
      additionalProperties: false,
    },
  },
].map((tool) => ({
  ...tool,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
}));

export function isMcpToolName(value: string): value is McpToolName {
  return Object.prototype.hasOwnProperty.call(toolSchemas, value);
}

export function parseMcpToolArguments(name: McpToolName, args: unknown) {
  return toolSchemas[name].parse(args ?? {});
}

async function getAccounts(
  userId: string,
  input: z.infer<typeof toolSchemas.get_accounts>,
) {
  let accounts = await prisma.account.findMany({
    where: {
      userId,
      ...(input.currency ? { currency: input.currency } : {}),
      ...(input.includeInactive ? {} : { isActive: true }),
    },
    select: {
      id: true,
      name: true,
      type: true,
      currency: true,
      isActive: true,
      creditLimit: true,
      statementClosingDay: true,
      statementDueDay: true,
    },
    orderBy: [
      { currency: "asc" },
      { type: "asc" },
      { isActive: "desc" },
      { name: "asc" },
    ],
    skip: (input.page - 1) * input.limit,
    take: input.limit + 1,
  });

  const hasMore = accounts.length > input.limit;
  accounts = accounts.slice(0, input.limit);

  const balanceEligible = accounts.filter(
    (account) => account.type !== "CREDIT_CARD",
  );
  const balances = await withDerivedAccountBalances(balanceEligible, userId);
  const balanceById = new Map(
    balances.map((account) => [account.id, account.balance]),
  );

  return {
    page: input.page,
    limit: input.limit,
    hasMore,
    items: accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      isActive: account.isActive,
      balance:
        account.type === "CREDIT_CARD"
          ? null
          : (balanceById.get(account.id) ?? 0),
      creditCard:
        account.type === "CREDIT_CARD"
          ? {
              creditLimit: account.creditLimit,
              statementClosingDay: account.statementClosingDay,
              statementDueDay: account.statementDueDay,
            }
          : null,
    })),
  };
}

async function getMonthlySummary(
  userId: string,
  input: z.infer<typeof toolSchemas.get_monthly_summary>,
) {
  const dashboard = await getMonthlyDashboardForUser(
    userId,
    { year: input.year, month: input.month },
    input.currency,
  );

  return {
    period: dashboard.period,
    currency: dashboard.currency,
    summary: dashboard.summary,
    comparison: dashboard.comparison,
    planning: dashboard.planning,
    topCategories: dashboard.categories
      .slice()
      .sort((left, right) => right.realized - left.realized)
      .slice(0, 10)
      .map((category) => ({
        id: category.id,
        name: category.name,
        realized: category.realized,
        sharePercentage: category.sharePercentage,
      })),
  };
}

async function searchTransactions(
  userId: string,
  input: z.infer<typeof toolSchemas.search_transactions>,
) {
  const skip = (input.page - 1) * input.limit;
  const query = input.query?.trim();

  const rows = await prisma.transaction.findMany({
    where: {
      userId,
      year: input.year,
      month: input.month,
      ...(input.type ? { type: input.type } : {}),
      ...(input.status ? { status: input.status } : {}),
      account: {
        is: {
          userId,
          ...(input.currency ? { currency: input.currency } : {}),
        },
      },
      ...(query
        ? {
            OR: [
              { description: { contains: query, mode: "insensitive" } },
              {
                merchant: {
                  is: {
                    userId,
                    name: { contains: query, mode: "insensitive" },
                  },
                },
              },
              {
                category: {
                  is: {
                    userId,
                    name: { contains: query, mode: "insensitive" },
                  },
                },
              },
              {
                tagLinks: {
                  some: {
                    userId,
                    tag: {
                      userId,
                      name: { contains: query, mode: "insensitive" },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      amount: true,
      year: true,
      month: true,
      day: true,
      type: true,
      kind: true,
      status: true,
      description: true,
      account: {
        select: {
          id: true,
          name: true,
          currency: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      merchant: {
        select: {
          id: true,
          name: true,
        },
      },
      tagLinks: {
        select: {
          tag: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: [
      { year: "desc" },
      { month: "desc" },
      { day: "desc" },
      { createdAt: "desc" },
      { id: "desc" },
    ],
    skip,
    take: input.limit + 1,
  });

  const hasNextRow = rows.length > input.limit;
  // A última página alcançável não tem continuação: sinaliza truncamento em
  // vez de prometer uma página que o schema rejeitaria.
  const truncated = hasNextRow && input.page >= MAX_TRANSACTION_PAGE;

  return {
    period: { year: input.year, month: input.month },
    page: input.page,
    limit: input.limit,
    hasMore: hasNextRow && !truncated,
    truncated,
    items: rows.slice(0, input.limit).map((row) => ({
      ...row,
      tags: row.tagLinks
        .map((link) => link.tag)
        .sort((left, right) => left.name.localeCompare(right.name)),
      tagLinks: undefined,
    })),
  };
}

async function getForecast(
  userId: string,
  input: z.infer<typeof toolSchemas.get_forecast>,
) {
  const forecast = await getForecastForUser(userId, input);

  return {
    currency: forecast.currency,
    asOf: forecast.asOf,
    horizonDays: forecast.horizonDays,
    horizonEnd: forecast.horizonEnd,
    safeToSpend: forecast.safeToSpend,
    overdue: forecast.overdue.slice(0, 20),
    upcoming: forecast.upcoming.slice(0, 30),
    cardCommitments: {
      overdue: forecast.cardCommitments.overdue.slice(0, 20),
      upcoming: forecast.cardCommitments.upcoming.slice(0, 20),
    },
    truncated:
      forecast.overdue.length > 20 ||
      forecast.upcoming.length > 30 ||
      forecast.cardCommitments.overdue.length > 20 ||
      forecast.cardCommitments.upcoming.length > 20,
  };
}

async function getNetWorth(
  userId: string,
  input: z.infer<typeof toolSchemas.get_net_worth>,
) {
  const netWorth = await getNetWorthForUser(userId, {
    year: input.year,
    month: input.month,
    months: input.months,
  });

  return {
    end: netWorth.end,
    months: netWorth.months,
    totals: netWorth.totals,
    byCurrency: netWorth.byCurrency.map((item) => ({
      currency: item.currency,
      assetsTotal: item.assetsTotal,
      liabilitiesTotal: item.liabilitiesTotal,
      total: item.total,
    })),
    history: netWorth.history,
  };
}

export async function executeMcpTool(
  userId: string,
  name: McpToolName,
  rawArguments: unknown,
) {
  switch (name) {
    case "get_accounts": {
      const input = toolSchemas.get_accounts.parse(rawArguments ?? {});
      return getAccounts(userId, input);
    }
    case "get_monthly_summary": {
      const input = toolSchemas.get_monthly_summary.parse(rawArguments ?? {});
      return getMonthlySummary(userId, input);
    }
    case "search_transactions": {
      const input = toolSchemas.search_transactions.parse(rawArguments ?? {});
      return searchTransactions(userId, input);
    }
    case "get_forecast": {
      const input = toolSchemas.get_forecast.parse(rawArguments ?? {});
      return getForecast(userId, input);
    }
    case "get_net_worth": {
      const input = toolSchemas.get_net_worth.parse(rawArguments ?? {});
      return getNetWorth(userId, input);
    }
  }
}
