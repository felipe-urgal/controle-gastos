import { prisma } from "@/app/lib/prisma";

type AccountLike = {
  id: string;
};

type BalanceRow = {
  accountId: string;
  type: "INCOME" | "EXPENSE";
  _sum: {
    amount: number | null;
  };
};

export function calculateAccountBalanceMap(
  accountIds: string[],
  rows: BalanceRow[]
) {
  const balances = new Map(accountIds.map((accountId) => [accountId, 0]));

  for (const row of rows) {
    const current = balances.get(row.accountId) ?? 0;
    const amount = row._sum.amount ?? 0;

    balances.set(
      row.accountId,
      row.type === "INCOME" ? current + amount : current - amount
    );
  }

  return balances;
}

export async function withDerivedAccountBalances<T extends AccountLike>(
  accounts: T[],
  userId: string
): Promise<Array<T & { balance: number }>> {
  if (accounts.length === 0) return [];

  const accountIds = accounts.map((account) => account.id);
  const rows = await prisma.transaction.groupBy({
    by: ["accountId", "type"],
    where: {
      userId,
      status: "COMPLETED",
      accountId: { in: accountIds },
    },
    _sum: { amount: true },
  });

  const balances = calculateAccountBalanceMap(accountIds, rows);

  return accounts.map((account) => ({
    ...account,
    balance: balances.get(account.id) ?? 0,
  }));
}

export async function withDerivedAccountBalance<T extends AccountLike>(
  account: T,
  userId: string
): Promise<T & { balance: number }> {
  const [enriched] = await withDerivedAccountBalances([account], userId);
  return enriched;
}
