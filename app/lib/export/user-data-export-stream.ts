import { Pool, type PoolClient } from "pg";
import {
  escapeCsvField,
  serializeExportAccount,
  serializeExportCategory,
  serializeExportDebt,
  serializeExportTransaction,
  serializeTransactionCsvRow,
  TRANSACTION_CSV_HEADERS,
  type ExportAccount,
  type ExportCategory,
  type ExportDebt,
  type ExportDebtAdjustment,
  type ExportTransaction,
} from "@/app/lib/export/user-data-export";

export type UserDataExportFormat = "csv" | "json";

const TRANSACTION_PAGE_SIZE = 500;

const exportPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  allowExitOnIdle: true,
});

type Cursor = {
  year: number;
  month: number;
  day: number;
  createdAt: Date;
  id: string;
};

type SnapshotMetadata = {
  accountCount: number;
  categoryCount: number;
  transactionCount: number;
  debtCount: number;
};

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

  values.push(TRANSACTION_PAGE_SIZE);
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

    const accountsResult = await client.query<ExportAccount>(
      `
        SELECT
          "id",
          "name",
          "type",
          "currency",
          "isActive",
          "color",
          "icon",
          "description",
          "created_at" AS "createdAt",
          "updated_at" AS "updatedAt"
        FROM "accounts"
        WHERE "userId" = $1
        ORDER BY "created_at" ASC, "id" ASC
      `,
      [args.userId],
    );
    const categoriesResult = await client.query<ExportCategory>(
      `
        SELECT
          "id",
          "name",
          "type",
          "isActive",
          "color",
          "icon",
          "description",
          "position",
          "created_at" AS "createdAt",
          "updated_at" AS "updatedAt"
        FROM "categories"
        WHERE "userId" = $1
        ORDER BY "position" ASC, "created_at" ASC, "id" ASC
      `,
      [args.userId],
    );
    const debtsResult = await client.query<Omit<ExportDebt, "adjustments">>(
      `
        SELECT
          "id",
          "name",
          "currency",
          "balance",
          "installment_amount" AS "installmentAmount",
          "due_year" AS "dueYear",
          "due_month" AS "dueMonth",
          "due_day" AS "dueDay",
          "remaining_installments" AS "remainingInstallments",
          "institution",
          "description",
          "status",
          "created_at" AS "createdAt",
          "updated_at" AS "updatedAt"
        FROM "debts"
        WHERE "userId" = $1
        ORDER BY "created_at" ASC, "id" ASC
      `,
      [args.userId],
    );
    const debtAdjustmentsResult = await client.query<
      ExportDebtAdjustment & { debtId: string }
    >(
      `
        SELECT
          "id",
          "debt_id" AS "debtId",
          "previous_balance" AS "previousBalance",
          "new_balance" AS "newBalance",
          "delta",
          "description",
          "created_at" AS "createdAt"
        FROM "debt_adjustments"
        WHERE "userId" = $1
        ORDER BY "created_at" ASC, "id" ASC
      `,
      [args.userId],
    );
    const transactionCountResult = await client.query<{ count: string }>(
      'SELECT COUNT(*)::text AS "count" FROM "transactions" WHERE "userId" = $1',
      [args.userId],
    );

    const accounts = accountsResult.rows;
    const categories = categoriesResult.rows;
    const adjustmentsByDebt = new Map<string, ExportDebtAdjustment[]>();
    for (const adjustment of debtAdjustmentsResult.rows) {
      const items = adjustmentsByDebt.get(adjustment.debtId) ?? [];
      items.push(adjustment);
      adjustmentsByDebt.set(adjustment.debtId, items);
    }
    const debts: ExportDebt[] = debtsResult.rows.map((debt) => ({
      ...debt,
      adjustments: adjustmentsByDebt.get(debt.id) ?? [],
    }));
    const transactionCount = Number(transactionCountResult.rows[0]?.count ?? 0);
    const encoder = new TextEncoder();

    let cursor: Cursor | null = null;
    let firstTransaction = true;
    let initialized = false;
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
          if (!initialized) {
            initialized = true;
            if (args.format === "csv") {
              const header = TRANSACTION_CSV_HEADERS
                .map((value) => escapeCsvField(value))
                .join(",");
              controller.enqueue(encoder.encode(`\uFEFF${header}`));
            } else {
              const prefix =
                `{"formatVersion":3,"exportedAt":${JSON.stringify(args.exportedAt.toISOString())},` +
                `"accounts":${JSON.stringify(accounts.map(serializeExportAccount))},` +
                `"categories":${JSON.stringify(categories.map(serializeExportCategory))},` +
                `"debts":${JSON.stringify(debts.map(serializeExportDebt))},` +
                '"transactions":[';
              controller.enqueue(encoder.encode(prefix));
            }
            return;
          }

          const page = await fetchTransactionPage(client, args.userId, cursor);
          if (page.length === 0) {
            if (args.format === "json") {
              controller.enqueue(encoder.encode("]}"));
            }
            await finish(true);
            controller.close();
            return;
          }

          const last = page[page.length - 1]!;
          cursor = {
            year: last.year,
            month: last.month,
            day: last.day,
            createdAt: last.createdAt,
            id: last.id,
          };

          if (args.format === "csv") {
            const chunk =
              "\r\n" + page.map(serializeTransactionCsvRow).join("\r\n");
            controller.enqueue(encoder.encode(chunk));
          } else {
            const serialized = page
              .map((transaction) =>
                JSON.stringify(serializeExportTransaction(transaction)),
              )
              .join(",");
            const prefix = firstTransaction ? "" : ",";
            firstTransaction = false;
            controller.enqueue(encoder.encode(prefix + serialized));
          }
        } catch (error) {
          await finish(false);
          controller.error(error);
        }
      },
      async cancel() {
        await finish(false);
      },
    });

    return {
      stream,
      metadata: {
        accountCount: accounts.length,
        categoryCount: categories.length,
        transactionCount,
        debtCount: debts.length,
      },
    };
  } catch (error) {
    await rollbackAndRelease(client);
    throw error;
  }
}
