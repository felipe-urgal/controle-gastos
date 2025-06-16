// src/app/api/reports/investment/route.ts
import { NextResponse } from 'next/server';
import { InvestmentReport } from '@/app/types/reports'
import { prisma } from '@/app/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  // const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;
  // const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined;

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

    // 2. Obter todos os investimentos (compras e vendas)
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

    // 3. Calcular métricas básicas
    // const initialTotalCurrentValue = investmentAccounts.reduce((sum, account) => {
    //   return sum + Number(account.balance);
    // }, 0);

    // 4. Estrutura para agrupar por conta, ticker e tipo
    const accountsData = investmentAccounts.map(account => {
      const accountInvestments = investments.filter(i => i.accountId === account.id);
      
      // Agrupar por ticker
      const investmentsByTicker = accountInvestments.reduce((acc, investment) => {
        const ticker = investment.ticker || 'Outros';
        if (!acc[ticker]) {
          acc[ticker] = {
            buy: [],
            sell: [],
            other: []
          };
        }
        
        if (investment.type === 'BUY') {
          acc[ticker].buy.push(investment);
        } else if (investment.type === 'SELL') {
          acc[ticker].sell.push(investment);
        } else {
          acc[ticker].other.push(investment);
        }
        
        return acc;
      }, {} as Record<string, {
        buy: typeof investments;
        sell: typeof investments;
        other: typeof investments;
      }>);

      // Calcular totais por ticker
      const tickersData = Object.entries(investmentsByTicker).map(([ticker, operations]) => {
        const totalBuy = operations.buy.reduce((sum, inv) => sum + Number(inv.amount), 0);
        const totalSell = operations.sell.reduce((sum, inv) => sum + Number(inv.amount), 0);
        const totalQuantityBuy = operations.buy.reduce((sum, inv) => sum + Number(inv.quantity), 0);
        const totalQuantitySell = operations.sell.reduce((sum, inv) => sum + Number(inv.quantity), 0);
        
        // Simulação de cotação atual (substituir por API real)
        const avgBuyPrice = totalQuantityBuy > 0 ? totalBuy / totalQuantityBuy : 0;
        const currentPrice = avgBuyPrice * (1 + (Math.random() * 0.2 - 0.1)); // +/- 10% variação
        
        return {
          ticker,
          totalInvested: totalBuy - totalSell,
          currentValue: (totalQuantityBuy - totalQuantitySell) * currentPrice,
          quantity: totalQuantityBuy - totalQuantitySell,
          avgPrice: avgBuyPrice,
          currentPrice,
          operations: {
            buy: operations.buy.map(i => ({
              date: i.investmentDate.toISOString(),
              quantity: Number(i.quantity),
              unitPrice: Number(i.unitPrice),
              totalAmount: Number(i.amount)
            })),
            sell: operations.sell.map(i => ({
              date: i.investmentDate.toISOString(),
              quantity: Number(i.quantity),
              unitPrice: Number(i.unitPrice),
              totalAmount: Number(i.amount)
            })),
            other: operations.other.map(i => ({
              date: i.investmentDate.toISOString(),
              quantity: Number(i.quantity),
              unitPrice: Number(i.unitPrice),
              totalAmount: Number(i.amount)
            }))
          }
        };
      });

      const accountInvested = tickersData.reduce((sum, ticker) => sum + ticker.totalInvested, 0);
      const accountCurrentValue = tickersData.reduce((sum, ticker) => sum + ticker.currentValue, 0);

      return {
        accountId: account.id,
        accountName: account.name,
        balance: Number(account.balance),
        currency: account.currency,
        totalInvested: accountInvested,
        currentValue: accountCurrentValue,
        return: {
          absolute: accountCurrentValue - accountInvested,
          percentage: accountInvested > 0 ? 
            ((accountCurrentValue - accountInvested) / accountInvested) * 100 : 0
        },
        tickers: tickersData
      };
    });

    // 5. Calcular totais gerais
    const totalInvested = accountsData.reduce((sum, account) => sum + account.totalInvested, 0);
    const calculatedTotalCurrentValue = accountsData.reduce((sum, account) => sum + account.currentValue, 0);

    // 6. Montar o relatório final
    const report: InvestmentReport = {
      data: {
        accounts: accountsData,
        totalInvested,
        totalCurrentValue: calculatedTotalCurrentValue,
        totalReturn: {
          absolute: calculatedTotalCurrentValue - totalInvested,
          percentage: totalInvested > 0 ? 
            ((calculatedTotalCurrentValue - totalInvested) / totalInvested) * 100 : 0
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