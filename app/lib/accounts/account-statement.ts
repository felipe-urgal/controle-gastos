import { z } from "zod";

import { apiFailureFromError } from "@/app/lib/api/api-error-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import {
  compareLogicalDates,
  parseIsoLogicalDate,
  type LogicalDate,
} from "@/app/lib/date/logical-date";
import { escapeCsvField, formatExportDate } from "@/app/lib/export/user-data-export";
import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";

export const MAX_STATEMENT_YEARS = 5;
export const MAX_STATEMENT_ROWS = 20_000;

export type StatementRow = {
  date: LogicalDate;
  description: string;
  category: string | null;
  /** Centavos com sinal: entrada positiva, saída negativa. */
  signedAmount: number;
};

/** 123456 → "1234.56"; negativos mantêm o sinal. Ponto decimal: não depende do idioma da planilha. */
export function formatStatementAmount(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/**
 * CSV do extrato: saldo inicial, uma linha por lançamento concluído com o saldo corrente e saldo final.
 * Só entra o que compõe o saldo realizado (concluídos); pendentes e cancelados ficam de fora.
 */
export function buildStatementCsv(input: {
  from: LogicalDate;
  to: LogicalDate;
  openingBalance: number;
  rows: StatementRow[];
}) {
  const header = ["data", "descricao", "categoria", "valor", "saldo"].map((value) => escapeCsvField(value)).join(",");
  // Textos passam pela proteção contra fórmulas de planilha; números saem crus (um "-45.90" não pode virar "'-45.90").
  const line = (date: string, description: string, category: string | null, amount: number | null, balance: number) =>
    [
      escapeCsvField(date),
      escapeCsvField(description),
      escapeCsvField(category),
      amount === null ? "" : formatStatementAmount(amount),
      formatStatementAmount(balance),
    ].join(",");

  let balance = input.openingBalance;
  const lines = [header, line(formatExportDate(input.from.year, input.from.month, input.from.day), "Saldo inicial", null, null, balance)];
  for (const row of input.rows) {
    balance += row.signedAmount;
    lines.push(
      line(formatExportDate(row.date.year, row.date.month, row.date.day), row.description, row.category, row.signedAmount, balance),
    );
  }
  lines.push(line(formatExportDate(input.to.year, input.to.month, input.to.day), "Saldo final", null, null, balance));
  // BOM para o Excel reconhecer UTF-8.
  return "﻿" + lines.join("\r\n") + "\r\n";
}

const querySchema = z.object({
  from: z.string().refine((value) => parseIsoLogicalDate(value) !== null, "Data inicial inválida"),
  to: z.string().refine((value) => parseIsoLogicalDate(value) !== null, "Data final inválida"),
});

function beforeFilter(date: LogicalDate) {
  return [
    { year: { lt: date.year } },
    { year: date.year, month: { lt: date.month } },
    { year: date.year, month: date.month, day: { lt: date.day } },
  ];
}

function rangeFilter(from: LogicalDate, to: LogicalDate) {
  return {
    AND: [
      { NOT: { OR: beforeFilter(from) } },
      {
        OR: [
          { year: { lt: to.year } },
          { year: to.year, month: { lt: to.month } },
          { year: to.year, month: to.month, day: { lte: to.day } },
        ],
      },
    ],
  };
}

export async function getAccountStatementCsv(
  userId: string,
  accountId: string,
  from: LogicalDate,
  to: LogicalDate,
) {
  if (compareLogicalDates(from, to) > 0) {
    throw new HttpError("A data inicial deve ser anterior à final", 400);
  }
  if (to.year - from.year > MAX_STATEMENT_YEARS) {
    throw new HttpError(`O período deve ter no máximo ${MAX_STATEMENT_YEARS} anos`, 400);
  }

  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
    select: { id: true, name: true, type: true },
  });
  if (!account) throw new HttpError("Conta não encontrada", 404);
  if (account.type === "CREDIT_CARD") {
    throw new HttpError("Cartões de crédito não têm extrato; use a fatura", 400);
  }

  const completed = { userId, accountId, status: "COMPLETED" as const };
  const [openingRows, count] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where: { ...completed, OR: beforeFilter(from) },
      _sum: { amount: true },
    }),
    prisma.transaction.count({ where: { ...completed, ...rangeFilter(from, to) } }),
  ]);
  if (count > MAX_STATEMENT_ROWS) {
    throw new HttpError("Período com lançamentos demais; escolha um intervalo menor", 400);
  }

  const openingBalance = openingRows.reduce(
    (sum, row) => sum + (row.type === "INCOME" ? 1 : -1) * (row._sum.amount ?? 0),
    0,
  );
  const transactions = await prisma.transaction.findMany({
    where: { ...completed, ...rangeFilter(from, to) },
    select: {
      year: true,
      month: true,
      day: true,
      type: true,
      amount: true,
      description: true,
      category: { select: { name: true } },
    },
    orderBy: [{ year: "asc" }, { month: "asc" }, { day: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });

  const csv = buildStatementCsv({
    from,
    to,
    openingBalance,
    rows: transactions.map((item) => ({
      date: { year: item.year, month: item.month, day: item.day },
      description: item.description,
      category: item.category?.name ?? null,
      signedAmount: item.type === "INCOME" ? item.amount : -item.amount,
    })),
  });
  return { csv, accountName: account.name };
}

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "conta";
}

/** `GET /api/accounts/{id}/statement?from=AAAA-MM-DD&to=AAAA-MM-DD` — extrato em CSV. */
export async function exportAccountStatement(
  request: Request,
  context?: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) throw new HttpError("Conta não encontrada", 404);
    const { id } = await context.params;
    const params = new URL(request.url).searchParams;
    const query = querySchema.parse({ from: params.get("from") ?? "", to: params.get("to") ?? "" });
    const from = parseIsoLogicalDate(query.from)!;
    const to = parseIsoLogicalDate(query.to)!;

    const { csv, accountName } = await getAccountStatementCsv(userId, id, from, to);
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="extrato-${slug(accountName)}-${query.from}-a-${query.to}.csv"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: "Erro ao exportar o extrato",
      zodMessage: "Período inválido",
    });
  }
}

