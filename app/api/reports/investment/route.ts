// src/app/api/reports/investment/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { InvestmentReport } from '@/app/types/reports'

const prisma = new PrismaClient();

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
        data: {
          totalInvested: 0,
          totalCurrentValue: 0,
          totalReturn: { absolute: 0, percentage: 0 },
          assetAllocation: [],
          recentTransactions: [],
          assetTransactionHistory: []
        }
      });
    }

    const accountIds = investmentAccounts.map(account => account.id);

    // 2. Obter todos os investimentos (compras e vendas)
    const investments = await prisma.investment.findMany({
      where: {
        userId,
        accountId: { in: accountIds },
        ...(year && month ? {
          investmentDate: {
            gte: new Date(year, month - 1, 1),
            lt: new Date(year, month, 1)
          }
        } : {})
      },
      orderBy: {
        investmentDate: 'desc'
      },
      include: {
        account: {
          select: {
            name: true
          }
        }
      }
    });

    // 3. Calcular métricas básicas
    const totalCurrentValue = investmentAccounts.reduce((sum, account) => {
      return sum + Number(account.balance);
    }, 0);

    // 4. Calcular o total investido (soma de todas as compras)
    const buyInvestments = investments.filter(i => i.type === 'BUY');
    const totalInvested = buyInvestments.reduce((sum, investment) => {
      return sum + Number(investment.amount);
    }, 0);

    // 5. Calcular alocação por ativo (agrupando por ticker)
    const investmentsByAsset = investments.reduce((acc, investment) => {
      const asset = investment.ticker || 'Outros';
      if (!acc[asset]) {
        acc[asset] = {
          asset,
          totalAmount: 0,
          totalQuantity: 0,
          priceSum: 0,
          count: 0
        };
      }

      if (investment.type === 'BUY') {
        acc[asset].totalAmount += Number(investment.amount);
        acc[asset].totalQuantity += Number(investment.quantity);
      } else {
        acc[asset].totalAmount -= Number(investment.amount);
        acc[asset].totalQuantity -= Number(investment.quantity);
      }

      acc[asset].priceSum += Number(investment.unitPrice);
      acc[asset].count++;

      return acc;
    }, {} as Record<string, {
      asset: string;
      totalAmount: number;
      totalQuantity: number;
      priceSum: number;
      count: number;
    }>);

    const assetAllocation = await Promise.all(
      Object.values(investmentsByAsset).map(async (asset) => {
        const percentage = totalInvested > 0 ? (asset.totalAmount / totalInvested) * 100 : 0;
        const costBasis = asset.count > 0 ? asset.priceSum / asset.count : 0;

        // Simulação de cotação atual (substituir por API real)
        const currentPrice = costBasis * (1 + (Math.random() * 0.2 - 0.1)); // +/- 10% variação

        return {
          asset: asset.asset,
          totalAmount: asset.totalAmount,
          totalQuantity: asset.totalQuantity,
          percentage,
          costBasis,
          unrealizedGain: asset.totalQuantity * currentPrice
        };
      })
    );

    // 6. Preparar transações recentes (limitado a 10)
    const recentTransactions = investments
      .slice(0, 10)
      .map(investment => ({
        date: investment.investmentDate,
        asset: investment.ticker || investment.description || 'Outros',
        type: investment.type as 'BUY' | 'SELL',
        quantity: Number(investment.quantity),
        unitPrice: Number(investment.unitPrice),
        totalAmount: Number(investment.amount),
        accountName: investment.account.name
      }));

    // 7. Preparar histórico por ativo
    const assetTransactionHistory: Record<string, {
      asset: string;
      transactions: {
        date: Date;
        type: 'BUY' | 'SELL';
        quantity: number;
        unitPrice: number;
        totalAmount: number;
        accountName: string;
      }[];
    }> = {};

    investments.forEach(investment => {
      const asset = investment.ticker || investment.description || 'Outros';
      if (!assetTransactionHistory[asset]) {
        assetTransactionHistory[asset] = {
          asset,
          transactions: []
        };
      }

      assetTransactionHistory[asset].transactions.push({
        date: investment.investmentDate,
        type: investment.type as 'BUY' | 'SELL',
        quantity: Number(investment.quantity),
        unitPrice: Number(investment.unitPrice),
        totalAmount: Number(investment.amount),
        accountName: investment.account.name
      });
    });

    // 8. Montar o relatório final
    const report: InvestmentReport = {
      data: {
        totalInvested,
        totalCurrentValue,
        totalReturn: {
          absolute: totalCurrentValue - totalInvested,
          percentage: totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0
        },
        assetAllocation,
        recentTransactions,
        assetTransactionHistory: Object.values(assetTransactionHistory)
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