import { Transaction, Prisma, TransactionType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

interface CategoryAnalytics {
  categoryId: string | null;
  categoryName: string | null;
  total: number;
  count: number;
}

interface TransactionAnalytics {
  total: number;
  count: number;
  byCategory: CategoryAnalytics[];
  byType: {
    income: number;
    expense: number;
  };
}

interface TransactionsResponse {
  transactions: Transaction[];
  analytics: TransactionAnalytics;
}

interface TransactionsResponse {
  transactions: Transaction[];
  analytics: TransactionAnalytics;
}

interface ErrorResponse {
  success: boolean;
  error: string;
  details?: Record<string, unknown>;
}

export async function GET(request: Request): Promise<NextResponse<TransactionsResponse | ErrorResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId");
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const type = searchParams.get('type') as TransactionType | null
    const categoryId = searchParams.get('categoryId')

    if (!userId) {
      return new NextResponse('User ID is required', { status: 400 });
    }

    // Base query filters with proper typing
    const where: Prisma.TransactionWhereInput = {
      userId
    }

    if (year) where.year = parseInt(year)
    if (month) where.month = parseInt(month)
    if (type) where.type = type
    if (categoryId) where.categoryId = categoryId

    // Rest of your code remains the same...
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
        account: true
      },
      orderBy: {
        transactionDate: 'desc'
      }
    })

    // Type for analytics
    interface CategoryAnalytics {
      categoryId: string | null;
      categoryName: string | null;
      total: number;
      count: number;
    }

    interface TransactionAnalytics {
      total: number;
      count: number;
      byCategory: CategoryAnalytics[];
      byType: {
        income: number;
        expense: number;
      };
    }

    const analytics: TransactionAnalytics = {
      total: 0,
      count: transactions.length,
      byCategory: [],
      byType: {
        income: 0,
        expense: 0
      }
    }

    const categoryMap = new Map<string, CategoryAnalytics>()

    transactions.forEach(transaction => {
      const amount = Number(transaction.amount)
      
      if (transaction.type === 'INCOME') {
        analytics.byType.income += amount
        analytics.total += amount
      } else {
        analytics.byType.expense += amount
        analytics.total -= amount
      }

      const categoryKey = transaction.categoryId || 'uncategorized'
      const categoryData = categoryMap.get(categoryKey) || {
        categoryId: transaction.categoryId,
        categoryName: transaction.category?.name || null,
        total: 0,
        count: 0
      }

      if (transaction.type === 'INCOME') {
        categoryData.total += amount
      } else {
        categoryData.total -= amount
      }
      categoryData.count += 1

      categoryMap.set(categoryKey, categoryData)
    })

    analytics.byCategory = Array.from(categoryMap.values())

    return NextResponse.json({
      transactions,
      analytics
    })
  } catch (error) {
    console.error('[TRANSACTIONS_REPORTS_GET]', error)
    return new NextResponse('Internal error', { status: 500 })
  }
}