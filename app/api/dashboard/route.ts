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
      include: {
        category: true,
        account: true
      },
      orderBy: { transactionDate: 'desc' }
    });

    // Analytics por conta
    const accountMap = new Map<string, {
      accountId: string;
      accountName: string;
      total: number;
      count: number;
      byType: { income: number; expense: number, investment: number; };
    }>();

    // Analytics por categoria
    const categoryMap = new Map<string, {
      categoryId: string | null;
      categoryName: string | null;
      total: number;
      count: number;
      byAccount: Map<string, {
        accountId: string;
        accountName: string;
        total: number;
      }>;
      byType: { income: number; expense: number, investment: number; };
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
          total -= amount; // ou total += amount;
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
        byType: { expense: 0, income: 0, investment: 0 }
      };

      const typeKey = transaction.type.toLowerCase() as keyof typeof accountData.byType;
      accountData.byType[typeKey] += amount;
      accountData.count += 1;

      switch(transaction.type) {
        case 'INCOME':
          accountData.total += amount;
          break;
        case 'INVESTMENT':
          accountData.total -= amount; // ou += amount
          break;
        case 'EXPENSE':
          accountData.total -= amount;
          break;
      }
      
      accountMap.set(accountKey, accountData);

      // Processamento por categoria
      const categoryKey = transaction.categoryId || 'uncategorized';
      let categoryData = categoryMap.get(categoryKey);
      
      if (!categoryData) {
        categoryData = {
          categoryId: transaction.categoryId,
          categoryName: transaction.category?.name || null,
          total: 0,
          count: 0,
          byAccount: new Map(),
          byType: { expense: 0, income: 0, investment: 0 }
        };
        categoryMap.set(categoryKey, categoryData);
      }

      categoryData.count += 1;
      categoryData.byType[typeKey] += amount;

      // Atualiza totais da categoria conforme o tipo
      switch(transaction.type) {
        case 'INCOME':
          categoryData.total += amount;
          break;
        case 'INVESTMENT':
          // Define se investimento aumenta ou diminui o total da categoria
          categoryData.total -= amount; // ou += amount dependendo da sua regra
          break;
        case 'EXPENSE':
          categoryData.total -= amount;
          break;
      }

      // Atualiza por conta dentro da categoria
      const accountInCategory = categoryData.byAccount.get(accountKey) || {
        accountId: transaction.accountId,
        accountName: transaction.account.name,
        total: 0
      };

      // Atualiza o total por conta dentro da categoria
      switch(transaction.type) {
        case 'INCOME':
          accountInCategory.total += amount;
          break;
        case 'INVESTMENT':
          // Define se investimento aumenta ou diminui o total
          accountInCategory.total -= amount; // ou += amount
          break;
        case 'EXPENSE':
          accountInCategory.total -= amount;
          break;
      }
      categoryData.byAccount.set(accountKey, accountInCategory);
    });

    return NextResponse.json({
      transactions,
      analytics: {
        total,
        count: transactions.length,
        byAccount: Array.from(accountMap.values()),
        byCategory: Array.from(categoryMap.values()).map(cat => ({
          categoryId: cat.categoryId,
          categoryName: cat.categoryName,
          total: cat.total,
          count: cat.count,
          byType: cat.byType,
          byAccount: Array.from(cat.byAccount.values()) // Garantindo que byAccount está incluído
        })),
        byType
      }
    });
  } catch (error) {
    console.error('[DASHBOARD_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}