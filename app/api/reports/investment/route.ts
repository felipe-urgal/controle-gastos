// src/app/api/reports/investment/route.ts

import { NextResponse } from 'next/server';
import { InvestimentReport } from '@/app/types/reports';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AssetTransactionHistory {
  asset: string;
  transactions: {
    date: Date;
    type: 'BUY' | 'SELL';
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    accountName: string;
  }[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const year = parseInt(searchParams.get('year') || '0');
  const month = parseInt(searchParams.get('month') || '0');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    // 1. Obter todas as contas de investimento do usuário
    const investmentAccounts = await prisma.account.findMany({
      where: {
        userId,
        type: 'INVESTMENT'
      },
      select: {
        id: true,
        name: true,
        balance: true,
        currency: true
      }
    });

    if (investmentAccounts.length === 0) {
      return NextResponse.json({
        totalInvested: 0,
        totalCurrentValue: 0,
        totalReturn: { absolute: 0, percentage: 0 },
        assetAllocation: [],
        performanceHistory: [],
        recentTransactions: []
      });
    }

    const accountIds = investmentAccounts.map(account => account.id);

    // 2. Obter todas as transações de investimento
    const investmentTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        accountId: { in: accountIds },
        type: 'INVESTMENT',
        ...(year && month ? {
          year,
          month
        } : {})
      },
      orderBy: {
        transactionDate: 'desc'
      },
      take: 10 // Limitar transações recentes
    });

    // 3. Calcular métricas básicas
    const totalCurrentValue = investmentAccounts.reduce((sum, account) => {
      return sum + Number(account.balance);
    }, 0);

    // 4. Calcular o total investido (soma de todas as compras)
    const buyTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        accountId: { in: accountIds },
        type: 'INVESTMENT',
        investmentType: 'BUY'
      },
      select: {
        amount: true,
        unitPrice: true,
        quantity: true
      }
    });

    const totalInvested = buyTransactions.reduce((sum, transaction) => {
      return sum + Number(transaction.amount);
    }, 0);

    // 5. Calcular alocação por ativo (agrupando por descrição)
    const transactionsByAsset = await prisma.transaction.groupBy({
      by: ['description'],
      where: {
        userId,
        accountId: { in: accountIds },
        type: 'INVESTMENT'
      },
      _sum: {
        amount: true,
        quantity: true
      },
      _avg: {
        unitPrice: true
      }
    });

    const assetAllocation = await Promise.all(
      transactionsByAsset.map(async (asset) => {
        const totalAmount = Number(asset._sum.amount || 0);
        const totalQuantity = Number(asset._sum.quantity || 0);
        const percentage = totalInvested > 0 ? (totalAmount / totalInvested) * 100 : 0;

        const token = 'dKXPa4UcHH6d85oVojJ7iT';

        const response = await fetch(
          `https://brapi.dev/api/quote/${asset.description}?token=${token}`,
        );
        const data = await response.json();

        const currentPrice = (data && data.results[0].regularMarketPrice) || 0;

        return {
          asset: asset.description,
          totalAmount,
          totalQuantity,
          percentage,
          costBasis: Number(asset._avg.unitPrice || 0),
          unrealizedGain: totalQuantity * currentPrice,
        };
      })
    );

    // 7. Preparar transações recentes
    const recentTransactions = investmentTransactions.map(transaction => ({
      date: transaction.transactionDate,
      asset: transaction.description,
      type: transaction.investmentType || 'BUY',
      quantity: transaction.quantity || 0,
      unitPrice: Number(transaction.unitPrice || 0),
      totalAmount: Number(transaction.amount)
    }));

    // 8. Obter histórico de compra e venda por ativo
    const allAssetTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        accountId: { in: accountIds },
        type: 'INVESTMENT',
        investmentType: { in: ['BUY', 'SELL'] }
      },
      select: {
        description: true,
        transactionDate: true,
        investmentType: true,
        quantity: true,
        unitPrice: true,
        amount: true,
        account: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        transactionDate: 'desc'
      }
    });

    const assetTransactionHistory: Record<string, AssetTransactionHistory> = {};

    allAssetTransactions.forEach(transaction => {
      const asset = transaction.description;
      if (!assetTransactionHistory[asset]) {
        assetTransactionHistory[asset] = {
          asset,
          transactions: []
        };
      }

      assetTransactionHistory[asset].transactions.push({
        date: transaction.transactionDate,
        type: transaction.investmentType as 'BUY' | 'SELL',
        quantity: transaction.quantity || 0,
        unitPrice: Number(transaction.unitPrice || 0),
        totalAmount: Number(transaction.amount),
        accountName: transaction.account.name
      });
    });

    // Converter para array
    const assetTransactionHistoryArray = Object.values(assetTransactionHistory);

    // 9. Montar o relatório final (incluindo o novo campo)
    const report: InvestimentReport = {
      data: {
        totalInvested,
        totalCurrentValue,
        totalReturn: {
          absolute: totalCurrentValue - totalInvested,
          percentage: totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0
        },
        assetAllocation,
        recentTransactions,
        assetTransactionHistory: assetTransactionHistoryArray // Adicionando o novo campo
      }
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error generating investment report:', error);
    return NextResponse.json(
      { error: 'Failed to generate investment report' },
      { status: 500 }
    );
  }
}