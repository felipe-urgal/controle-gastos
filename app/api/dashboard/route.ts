// app/api/dashboard/route.ts
import { Prisma, PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!userId) {
      return new NextResponse('User ID is required', { status: 400 });
    }

    const where: Prisma.TransactionWhereInput = { userId };
    if (year) where.year = parseInt(year);
    if (month) where.month = parseInt(month);

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true, account: true },
      orderBy: { transactionDate: 'desc' }
    });

    // Analytics por conta
    const accountMap = new Map<string, {
      accountId: string;
      accountName: string;
      total: number;
      count: number;
      byType: { income: number; expense: number, investment: number; };
      byCategory: Map<string, {
        categoryId: string;
        categoryName: string;
        total: number;
      }>;
    }>();

    let total = 0;
    const byType = { expense: 0, income: 0, investment: 0 };

    transactions.forEach(transaction => {
      const amount = Number(transaction.amount);

      // Atualiza totais gerais
      switch(transaction.type) {
        case 'INCOME':
          byType.income += amount;
          total += amount;
          break;
        case 'INVESTMENT':
          byType.investment += amount;
          total -= amount; // Assuming investment decreases total
          break;
        case 'EXPENSE':
          byType.expense += amount;
          total -= amount;
          break;
      }

      // Processamento por conta
      const accountKey = transaction.accountId;
      const accountData = accountMap.get(accountKey) || {
        accountId: transaction.accountId,
        accountName: transaction.account.name,
        total: 0,
        count: 0,
        byType: { expense: 0, income: 0, investment: 0 },
        byCategory: new Map(),
      };

      const typeKey = transaction.type.toLowerCase() as keyof typeof accountData.byType;
      accountData.byType[typeKey] += amount;
      accountData.count += 1;

      switch(transaction.type) {
        case 'INCOME':
          accountData.total += amount;
          break;
        case 'INVESTMENT':
          accountData.total += amount; // Consistent with total calculation
          break;
        case 'EXPENSE':
          accountData.total -= amount;
          break;
      }

      // Atualiza por categoria dentro da conta
      if (transaction.category) {
        const categoryKey = transaction.categoryId;
        const categoryData = accountData.byCategory.get(categoryKey) || {
          categoryId: transaction.categoryId,
          categoryName: transaction.category.name,
          total: 0
        };

        switch(transaction.type) {
          case 'INCOME':
            categoryData.total += amount;
            break;
          case 'INVESTMENT':
            categoryData.total += amount; // Consistent with other calculations
            break;
          case 'EXPENSE':
            categoryData.total -= amount;
            break;
        }
        accountData.byCategory.set(categoryKey, categoryData);
      }
      
      accountMap.set(accountKey, accountData);
    });

    // Convert Maps to arrays for JSON serialization
    const accountsData = Array.from(accountMap.values()).map(account => ({
      ...account,
      byCategory: Array.from(account.byCategory.values())
    }));

    return NextResponse.json({
      transactions,
      analytics: {
        total,
        count: transactions.length,
        byAccount: accountsData,
        byType
      }
    });
  } catch (error) {
    console.error('[DASHBOARD_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}