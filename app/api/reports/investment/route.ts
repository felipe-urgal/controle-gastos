// src/app/api/reports/investment/route.ts
import { NextResponse } from 'next/server';
import { InvestmentReport } from '@/app/types/reports'
import { prisma } from '@/app/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

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
          accounts: [],
          totalInvested: 0,
          totalCurrentValue: 0,
          totalReturn: { absolute: 0, percentage: 0 }
        }
      });
    }

    const accountIds = investmentAccounts.map(account => account.id);

    // 2. Obter todos os investimentos (compras, vendas e dividendos)
    const investments = await prisma.investment.findMany({
      where: {
        userId,
        accountId: { in: accountIds },
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

    // 3. Estrutura para agrupar por conta, ticker e tipo
    const accountsData = investmentAccounts.map(account => {
      const accountInvestments = investments.filter(i => i.accountId === account.id);
      
      // Agrupar por ticker e tipo
      const investmentsByTicker = accountInvestments.reduce((acc, investment) => {
        const ticker = investment.ticker || 'Outros';
        if (!acc[ticker]) {
          acc[ticker] = {
            BUY: [],
            SELL: [],
            DIVIDEND: [],
            OTHER: []
          };
        }
        
        // Agrupa por tipo (BUY, SELL, DIVIDEND, etc.)
        const type = investment.type as 'BUY' | 'SELL' | 'DIVIDEND' | 'OTHER';
        acc[ticker][type].push(investment);
        
        return acc;
      }, {} as Record<string, {
        BUY: typeof investments;
        SELL: typeof investments;
        DIVIDEND: typeof investments;
        OTHER: typeof investments;
      }>);

      // Calcular totais por ticker
      const tickersData = Object.entries(investmentsByTicker).map(([ticker, operations]) => {
        const totalBuy = operations.BUY.reduce((sum, inv) => sum + Number(inv.amount), 0);
        const totalSell = operations.SELL.reduce((sum, inv) => sum + Number(inv.amount), 0);
        const totalDividends = operations.DIVIDEND.reduce((sum, inv) => sum + Number(inv.amount), 0);
        const totalQuantityBuy = operations.BUY.reduce((sum, inv) => sum + Number(inv.quantity), 0);
        const totalQuantitySell = operations.SELL.reduce((sum, inv) => sum + Number(inv.quantity), 0);
        
        // Simulação de cotação atual (substituir por API real)
        const avgBuyPrice = totalQuantityBuy > 0 ? totalBuy / totalQuantityBuy : 0;
        const currentPrice = avgBuyPrice * (1 + (Math.random() * 0.2 - 0.1)); // +/- 10% variação
        
        return {
          ticker,
          totalInvested: totalBuy - totalSell,
          totalDividends,
          currentValue: (totalQuantityBuy - totalQuantitySell) * currentPrice,
          quantity: totalQuantityBuy - totalQuantitySell,
          avgPrice: avgBuyPrice,
          currentPrice,
          operations: {
            BUY: operations.BUY.map(i => ({
              date: i.investmentDate.toISOString(),
              quantity: Number(i.quantity),
              unitPrice: Number(i.unitPrice),
              totalAmount: Number(i.amount),
              type: i.type
            })),
            SELL: operations.SELL.map(i => ({
              date: i.investmentDate.toISOString(),
              quantity: Number(i.quantity),
              unitPrice: Number(i.unitPrice),
              totalAmount: Number(i.amount),
              type: i.type
            })),
            DIVIDEND: operations.DIVIDEND.map(i => ({
              date: i.investmentDate.toISOString(),
              quantity: Number(i.quantity),
              unitPrice: Number(i.unitPrice),
              totalAmount: Number(i.amount),
              type: i.type
            })),
            OTHER: operations.OTHER.map(i => ({
              date: i.investmentDate.toISOString(),
              quantity: Number(i.quantity),
              unitPrice: Number(i.unitPrice),
              totalAmount: Number(i.amount),
              type: i.type
            }))
          }
        };
      });

      const accountInvested = tickersData.reduce((sum, ticker) => sum + ticker.totalInvested, 0);
      const accountCurrentValue = tickersData.reduce((sum, ticker) => sum + ticker.currentValue, 0);
      const accountDividends = tickersData.reduce((sum, ticker) => sum + ticker.totalDividends, 0);

      return {
        accountId: account.id,
        accountName: account.name,
        balance: Number(account.balance),
        currency: account.currency,
        totalInvested: accountInvested,
        currentValue: accountCurrentValue,
        totalDividends: accountDividends,
        return: {
          absolute: (accountCurrentValue + accountDividends) - accountInvested,
          percentage: accountInvested > 0 ? 
            ((accountCurrentValue + accountDividends - accountInvested) / accountInvested) * 100 : 0
        },
        tickers: tickersData
      };
    });

    // 5. Calcular totais gerais
    const totalInvested = accountsData.reduce((sum, account) => sum + account.totalInvested, 0);
    const calculatedTotalCurrentValue = accountsData.reduce((sum, account) => sum + account.currentValue, 0);
    const totalDividends = accountsData.reduce((sum, account) => sum + account.totalDividends, 0);

    // 6. Montar o relatório final
    const report: InvestmentReport = {
      data: {
        accounts: accountsData,
        totalInvested,
        totalCurrentValue: calculatedTotalCurrentValue,
        totalDividends,
        totalReturn: {
          absolute: (calculatedTotalCurrentValue + totalDividends) - totalInvested,
          percentage: totalInvested > 0 ? 
            ((calculatedTotalCurrentValue + totalDividends - totalInvested) / totalInvested) * 100 : 0
        }
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