import { Pool, type PoolClient } from "pg";

import {
  escapeCsvField,
  serializeTransactionCsvRow,
  TRANSACTION_CSV_HEADERS,
  type ExportTransaction,
} from "@/app/lib/export/user-data-export";

export type UserDataExportFormat = "csv" | "json";

const PAGE_SIZE = 500;
export const USER_DATA_EXPORT_FORMAT_VERSION = 5;

type Cursor = {
  year: number;
  month: number;
  day: number;
  createdAt: Date;
  id: string;
};

type SnapshotMetadata = {
  domainCount: number;
  transactionCount: number;
};

type ExportDomain = {
  key: string;
  table: string;
  userColumn?: string;
  omit?: string[];
  orderBy?: string;
};

export const USER_DATA_EXPORT_DOMAINS: readonly ExportDomain[] = [
  { key: "accounts", table: "accounts" },
  { key: "categories", table: "categories" },
  { key: "categoryMonthlyLimits", table: "category_monthly_limits" },
  { key: "importRules", table: "transaction_import_rules" },
  {
    key: "reconciliationEvents",
    table: "account_reconciliation_events",
    userColumn: "user_id",
  },
  { key: "transactions", table: "transactions" },
  { key: "merchants", table: "merchants" },
  { key: "merchantAliases", table: "merchant_aliases" },
  { key: "merchantAliasEvents", table: "merchant_alias_events" },
  { key: "transactionAllocations", table: "transaction_allocations" },
  { key: "tags", table: "tags" },
  {
    key: "transactionTags",
    table: "transaction_tags",
    orderBy:
      't."created_at" ASC, t."transaction_id" ASC, t."tag_id" ASC',
  },
  { key: "transactionTemplates", table: "transaction_templates" },
  { key: "transactionSeries", table: "transaction_series" },
  {
    key: "subscriptionReviews",
    table: "subscription_reviews",
    userColumn: "user_id",
  },
  {
    key: "recurrencePatternReviews",
    table: "recurrence_pattern_reviews",
    userColumn: "user_id",
  },
  {
    key: "transfers",
    table: "transfers",
    omit: ["idempotency_key_hash", "request_hash"],
  },
  {
    key: "creditCardPayments",
    table: "credit_card_payments",
    omit: ["idempotency_key_hash", "request_hash"],
  },
  { key: "financialGoals", table: "financial_goals" },
  {
    key: "financialGoalEntries",
    table: "financial_goal_entries",
    omit: ["idempotency_key_hash", "request_hash"],
  },
  {
    key: "periodicFinancialSummaries",
    table: "periodic_financial_summaries",
  },
  { key: "exchangeRates", table: "exchange_rates" },
  { key: "debts", table: "debts" },
  {
    key: "debtAdjustments",
    table: "debt_adjustments",
    omit: ["idempotency_key_hash", "request_hash"],
  },
  { key: "investmentAssets", table: "investment_assets" },
  { key: "investmentOperations", table: "investment_operations" },
  { key: "investmentIncomes", table: "investment_incomes" },
  { key: "investmentFiscalEvents", table: "investment_fiscal_events" },
  {
    key: "investmentFiscalCostAdjustments",
    table: "investment_fiscal_cost_adjustments",
  },
  {
    key: "investmentBrokerageTaxReviews",
    table: "investment_brokerage_tax_reviews",
  },
  {
    key: "investmentTaxLossAdjustments",
    table: "investment_tax_loss_adjustments",
  },
  {
    key: "investmentTaxWithholdings",
    table: "investment_tax_withholdings",
  },
  { key: "investmentTaxPayments", table: "investment_tax_payments" },
  {
    key: "investmentForeignTaxesPaid",
    table: "investment_foreign_taxes_paid",
  },
  {
    key: "investmentFiscalPendingResolutions",
    table: "investment_fiscal_pending_resolutions",
  },
  {
    key: "annualFinancialTaxStatements",
    table: "annual_financial_tax_statements",
  },
  { key: "payrollDocuments", table: "payroll_documents" },
  { key: "payrollAdvanceLinks", table: "payroll_advance_links" },
  { key: "payrollTransactionLinks", table: "payroll_transaction_links" },
  {
    key: "annualEmploymentIncomeStatements",
    table: "annual_employment_income_statements",
  },
  {
    key: "mcpAccessTokens",
    table: "mcp_access_tokens",
    omit: ["token_hash"],
  },
] as const;

const EXCLUDED_SECURITY_DATA = [
  "password hash",
  "TOTP secret",
  "MFA recovery-code hashes",
  "MFA login challenges",
  "password-reset tokens",
  "JWT/session tokens",
  "MCP token hash/full token",
  "authentication rate-limit state",
  "idempotency/request hashes",
] as const;

const exportPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  allowExitOnIdle: true,
});

function assertIdentifier(value: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error("INVALID_EXPORT_IDENTIFIER");
  }
  return value;
}

function sqlStringLiteral(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function transactionFromRow(row: Record<string, unknown>): ExportTransaction {
  return {
    id: row.id as string,
    amount: row.amount as number,
    year: row.year as number,
    month: row.month as number,
    day: row.day as number,
    type: row.type as string,
    kind: row.kind as string,
    status: row.status as string,
    description: row.description as string,
    transferId: (row.transferId as string | null) ?? null,
    transferRole: (row.transferRole as string | null) ?? null,
    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
    account: {
      id: row.accountId as string,
      name: row.accountName as string,
      currency: row.accountCurrency as string,
    },
    category:
      row.categoryId === null
        ? null
        : {
            id: row.categoryId as string,
            name: row.categoryName as string,
            type: row.categoryType as string,
          },
    tags: Array.isArray(row.tags)
      ? (row.tags as Array<{ id: string; name: string }>)
      : [],
  };
}

async function fetchTransactionPage(
  client: PoolClient,
  userId: string,
  cursor: Cursor | null,
) {
  const values: unknown[] = [userId];
  let cursorClause = "";

  if (cursor) {
    values.push(
      cursor.year,
      cursor.month,
      cursor.day,
      cursor.createdAt,
      cursor.id,
    );
    cursorClause = `
      AND (
        t."year",
        t."month",
        t."day",
        t."created_at",
        t."id"
      ) > ($2, $3, $4, $5, $6)
    `;
  }

  values.push(PAGE_SIZE);
  const limitParam = `$${values.length}`;

  const result = await client.query(
    `
      SELECT
        t."id",
        t."amount",
        t."year",
        t."month",
        t."day",
        t."type",
        t."kind",
        t."status",
        t."description",
        t."transfer_id" AS "transferId",
        t."transfer_role" AS "transferRole",
        t."created_at" AS "createdAt",
        t."updated_at" AS "updatedAt",
        a."id" AS "accountId",
        a."name" AS "accountName",
        a."currency" AS "accountCurrency",
        c."id" AS "categoryId",
        c."name" AS "categoryName",
        c."type" AS "categoryType",
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object('id', tg."id", 'name', tg."name") ORDER BY tt."created_at", tg."id")
          FROM "transaction_tags" tt
          INNER JOIN "tags" tg
            ON tg."id" = tt."tag_id"
            AND tg."userId" = tt."userId"
          WHERE tt."transaction_id" = t."id"
            AND tt."userId" = t."userId"
        ), '[]'::jsonb) AS "tags"
      FROM "transactions" t
      INNER JOIN "accounts" a
        ON a."id" = t."accountId"
        AND a."userId" = t."userId"
      LEFT JOIN "categories" c
        ON c."id" = t."categoryId"
        AND c."userId" = t."userId"
      WHERE t."userId" = $1
      ${cursorClause}
      ORDER BY
        t."year" ASC,
        t."month" ASC,
        t."day" ASC,
        t."created_at" ASC,
        t."id" ASC
      LIMIT ${limitParam}
    `,
    values,
  );

  return result.rows.map(transactionFromRow);
}

async function fetchOwnedJsonPage(
  client: PoolClient,
  domain: ExportDomain,
  userId: string,
  offset: number,
) {
  const table = assertIdentifier(domain.table);
  const userColumn = assertIdentifier(domain.userColumn ?? "userId");
  const removedKeys = [userColumn, ...(domain.omit ?? [])];
  const removeExpression = removedKeys
    .map((value) => sqlStringLiteral(value))
    .join(", ");
  const orderBy =
    domain.orderBy ?? 't."created_at" ASC, t."id" ASC';

  const result = await client.query<{ data: string }>(
    `
      SELECT (
        to_jsonb(t) - ARRAY[${removeExpression}]::text[]
      )::text AS "data"
      FROM "${table}" t
      WHERE t."${userColumn}" = $1
      ORDER BY ${orderBy}
      LIMIT $2 OFFSET $3
    `,
    [userId, PAGE_SIZE, offset],
  );

  return result.rows.map((row) => row.data);
}

async function fetchSafeProfile(client: PoolClient, userId: string) {
  const result = await client.query<{ data: string }>(
    `
      SELECT jsonb_build_object(
        'id', "id",
        'name', "name",
        'email', "email",
        'emailVerifiedAt', "email_verified_at",
        'showValues', "showValues",
        'periodicSummaryEnabled', "periodic_summary_enabled",
        'periodicSummaryFrequency', "periodic_summary_frequency",
        'periodicSummaryLastProcessedAt', "periodic_summary_last_processed_at",
        'mfaEnabled', "totp_enabled",
        'createdAt', "created_at",
        'updatedAt', "updated_at"
      )::text AS "data"
      FROM "users"
      WHERE "id" = $1
    `,
    [userId],
  );

  const profile = result.rows[0]?.data;
  if (!profile) throw new Error("EXPORT_USER_NOT_FOUND");
  return profile;
}

async function transactionCount(client: PoolClient, userId: string) {
  const result = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS "count" FROM "transactions" WHERE "userId" = $1',
    [userId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

async function* createJsonChunks(
  client: PoolClient,
  userId: string,
  exportedAt: Date,
) {
  const profile = await fetchSafeProfile(client, userId);

  yield (
    `{"formatVersion":${USER_DATA_EXPORT_FORMAT_VERSION},` +
    `"kind":"logical-portability-snapshot",` +
    `"exportedAt":${JSON.stringify(exportedAt.toISOString())},` +
    `"profile":${profile},"data":{`
  );

  for (let domainIndex = 0; domainIndex < USER_DATA_EXPORT_DOMAINS.length; domainIndex += 1) {
    const domain = USER_DATA_EXPORT_DOMAINS[domainIndex]!;
    if (domainIndex > 0) yield ",";

    yield `${JSON.stringify(domain.key)}:[`;

    let offset = 0;
    let firstRow = true;

    while (true) {
      const page = await fetchOwnedJsonPage(client, domain, userId, offset);
      if (page.length === 0) break;

      for (const row of page) {
        if (!firstRow) yield ",";
        firstRow = false;
        yield row;
      }

      offset += page.length;
      if (page.length < PAGE_SIZE) break;
    }

    yield "]";
  }

  yield (
    `},"manifest":{"schema":"controle-gastos.user-data",` +
    `"domains":${JSON.stringify(USER_DATA_EXPORT_DOMAINS.map((domain) => domain.key))},` +
    `"excludedSecurityData":${JSON.stringify(EXCLUDED_SECURITY_DATA)}}}`
  );
}

async function* createCsvChunks(client: PoolClient, userId: string) {
  const header = TRANSACTION_CSV_HEADERS
    .map((value) => escapeCsvField(value))
    .join(",");
  yield `\uFEFF${header}`;

  let cursor: Cursor | null = null;

  while (true) {
    const page = await fetchTransactionPage(client, userId, cursor);
    if (page.length === 0) return;

    const last = page[page.length - 1]!;
    cursor = {
      year: last.year,
      month: last.month,
      day: last.day,
      createdAt: last.createdAt,
      id: last.id,
    };

    yield "\r\n" + page.map(serializeTransactionCsvRow).join("\r\n");
  }
}

async function rollbackAndRelease(client: PoolClient) {
  try {
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
}

export async function createUserDataExportStream(args: {
  userId: string;
  format: UserDataExportFormat;
  exportedAt: Date;
}): Promise<{ stream: ReadableStream<Uint8Array>; metadata: SnapshotMetadata }> {
  const client = await exportPool.connect();

  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");

    const metadata: SnapshotMetadata = {
      domainCount:
        args.format === "json" ? USER_DATA_EXPORT_DOMAINS.length : 1,
      transactionCount: await transactionCount(client, args.userId),
    };
    const encoder = new TextEncoder();
    const iterator =
      args.format === "json"
        ? createJsonChunks(client, args.userId, args.exportedAt)
        : createCsvChunks(client, args.userId);
    let finished = false;

    const finish = async (commit: boolean) => {
      if (finished) return;
      finished = true;
      try {
        await client.query(commit ? "COMMIT" : "ROLLBACK");
      } finally {
        client.release();
      }
    };

    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const next = await iterator.next();
          if (next.done) {
            await finish(true);
            controller.close();
            return;
          }
          controller.enqueue(encoder.encode(next.value));
        } catch (error) {
          await finish(false);
          controller.error(error);
        }
      },
      async cancel() {
        await iterator.return?.();
        await finish(false);
      },
    });

    return { stream, metadata };
  } catch (error) {
    await rollbackAndRelease(client);
    throw error;
  }
}
