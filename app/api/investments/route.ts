import { NextResponse } from "next/server";
import { Prisma, InvestmentType } from "@prisma/client";
import { InvestmentModel, InvestmentResponse } from '@/app/types/investment'
import { ErrorResponse } from '@/app/types/error'
import { prisma } from '@/app/lib/prisma';

export async function POST(req: Request): Promise<NextResponse<InvestmentModel | ErrorResponse>> {
  try {
    const body = await req.json();

    await prisma.$transaction(async (prisma) => {
      // Verify account exists and get current balance
      const account = await prisma.account.findUnique({
        where: { id: body.accountId },
        select: { balance: true }
      });

      if (!account) {
        throw new Error("Account not found");
      }

      const amount = new Prisma.Decimal(body.amount).toDecimalPlaces(2);

      // Calculate new balance
      const balanceChange = body.type === "DIVIDEND"
        ? new Prisma.Decimal(0)
        : body.type === "BUY"
          ? amount
          : amount.negated();

      const newBalance = new Prisma.Decimal(account.balance).plus(balanceChange);

      // Create the investment
      const investment = await prisma.investment.create({
        data: {
          ...body,
        },
        include: {
          account: { select: { name: true, currency: true } },
        }
      });

      // Update account balance
      await prisma.account.update({
        where: { id: body.accountId },
        data: { balance: newBalance }
      });

      return investment;
    });

    return NextResponse.json({ success: true, message: "Investimento criada com sucesso!" }, { status: 200 });

  } catch(error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// Listar investimentos (GET)
export async function GET(request: Request): Promise<NextResponse<InvestmentResponse | ErrorResponse>> {
  const { searchParams } = new URL(request.url);
  
  // Parâmetros obrigatórios
  const userId = searchParams.get("userId");
  
  // Parâmetros opcionais
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 8;
  const type = searchParams.get("type") as InvestmentType | null;
  const accountId = searchParams.get("account");
  const search = searchParams.get("search");

  if (!userId) {
    return NextResponse.json(
      { 
        success: false, 
        message: "Usuário é obrigatório!" 
      },
      { status: 400 }
    );
  }

  try {
    const where: Prisma.InvestmentWhereInput = {
      userId,
      ...(type && { type }),
      ...(accountId && { accountId }),
      ...(search?.trim() && {
        description: {
          contains: search.trim(),
          mode: Prisma.QueryMode.insensitive
        }
      })
    };

    const [investments, total, buy, sell, dividend] = await Promise.all([
      prisma.investment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { investmentDate: "desc" },
        include: {
          account: true,
        }
      }),
      prisma.investment.count({ where }),
      prisma.investment.aggregate({
        where: { ...where, type: 'BUY' },
        _sum: { amount: true }
      }).then(res => Number(res._sum.amount) || 0),
      prisma.investment.aggregate({
        where: { ...where, type: 'SELL' }, // Corrigi o typo de 'SELL' (estava 'SELL')
        _sum: { amount: true }
      }).then(res => Number(res._sum.amount) || 0),
      prisma.investment.aggregate({
        where: { ...where, type: 'DIVIDEND' },
        _sum: { amount: true }
      }).then(res => Number(res._sum.amount) || 0)
    ]);
    
    const netInvestment = buy - sell;

    return NextResponse.json({
        success: true,
        data: { 
          items: investments, 
          total,
          additionalData: {
            buy: String(netInvestment),
            dividend: String(dividend),
          },
        },
        pagination: { currentPage: page, totalPages: Math.ceil(total / limit), totalItems: total, limit: limit }
      });
    } catch(error) {
      return NextResponse.json(
        { 
          success: false, 
          message: error instanceof Error ? error.message : String(error) 
        },
        { status: 500 }
      );
    }
}

// Atualizar Investimento (PUT)
export async function PUT(req: Request) {
  try {
    const { id, ...data } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID da Investimento é obrigatório" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (prisma) => {
      // Get existing investment with account info
      const existingInvestment = await prisma.investment.findUnique({
        where: { id },
        include: {
          account: { select: { id: true, balance: true } }
        }
      });

      if (!existingInvestment) {
        throw new Error("Investimento não encontrada");
      }

      // Prepare update data
      const updateData: Prisma.InvestmentUpdateInput = {
        amount: new Prisma.Decimal(data.amount),
        unitPrice: new Prisma.Decimal(data.unitPrice),
        quantity: data.quantity,
        description: data.description,
        investmentDate: data.investmentDate,
        account: { connect: { id: data.accountId } },
        ticker: data.ticker,
        type: data.type as InvestmentType, // Cast to the enum type
      };

      // Handle amount changes
      if (data.amount !== undefined) {
        const newAmount = new Prisma.Decimal(data.amount).toDecimalPlaces(2);
        const oldAmount = existingInvestment.amount;
        const amountDiff = newAmount.minus(oldAmount);

        // Calculate balance adjustment (consider investment type)
        const balanceAdjustment = existingInvestment.type === "DIVIDEND"
          ? new Prisma.Decimal(0)
          : existingInvestment.type === "BUY"
            ? amountDiff
            : amountDiff.negated();

        // Update account balance
        await prisma.account.update({
          where: { id: existingInvestment.account.id },
          data: {
            balance: { increment: balanceAdjustment }
          }
        });

        updateData.amount = new Prisma.Decimal(newAmount).toNumber();
      }

      const updatedInvestment = await prisma.investment.update({
        where: { id },
        data: updateData,
        include: {
          account: { select: { id: true, name: true, currency: true } },
        }
      });

      return updatedInvestment;
    });

    return NextResponse.json(
      { 
        success: true, 
        message: "Investimento atualizada com sucesso!",
        data: result 
      },
      { status: 200 }
    );

  } catch(error) {
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

// Deletar Investimento (DELETE)
export async function DELETE(req: Request): Promise<NextResponse<ErrorResponse | { success: true; message: string; count?: number }>> {
  try {
    const { id, ids } = await req.json();
    
    // Suporte para delete em lote
    if (ids && Array.isArray(ids)) {
      return await prisma.$transaction(async (prisma) => {
        // Buscar todos os investments com informações das contas
        const investments = await prisma.investment.findMany({
          where: { id: { in: ids } },
          include: {
            account: { select: { id: true, balance: true } }
          }
        });

        if (investments.length === 0) {
          return NextResponse.json(
            { 
              success: false,
              message: "Nenhum investimento encontrado com os IDs fornecidos",
            },
            { status: 404 }
          );
        }

        // Agrupar ajustes de saldo por conta
        const balanceAdjustmentsByAccount: { [accountId: string]: Prisma.Decimal } = {};

        for (const investment of investments) {
          const balanceAdjustment = investment.type === "DIVIDEND"
            ? new Prisma.Decimal(0)
            : investment.type === "BUY"
              ? new Prisma.Decimal(investment.amount).negated()
              : new Prisma.Decimal(investment.amount);

          if (balanceAdjustmentsByAccount[investment.account.id]) {
            balanceAdjustmentsByAccount[investment.account.id] = 
              balanceAdjustmentsByAccount[investment.account.id].add(balanceAdjustment);
          } else {
            balanceAdjustmentsByAccount[investment.account.id] = balanceAdjustment;
          }
        }

        // Atualizar saldos das contas
        for (const [accountId, adjustment] of Object.entries(balanceAdjustmentsByAccount)) {
          await prisma.account.update({
            where: { id: accountId },
            data: {
              balance: { increment: adjustment }
            }
          });
        }

        // Deletar os investments
        const { count } = await prisma.investment.deleteMany({
          where: { id: { in: ids } }
        });

        return NextResponse.json(
          { 
            success: true, 
            message: `${count} investimentos deletados e saldos ajustados com sucesso`,
            count
          },
          { status: 200 }
        );
      });
    }
    
    // Delete único
    if (id) {
      return await prisma.$transaction(async (prisma) => {
        // Get the investment with account info
        const investment = await prisma.investment.findUnique({
          where: { id },
          include: {
            account: { select: { id: true, balance: true } }
          }
        });

        if (!investment) {
          return NextResponse.json(
            { 
              success: false,
              message: "Investimento não encontrado",
            },
            { status: 404 }
          );
        }

        const balanceAdjustment = investment.type === "DIVIDEND"
          ? new Prisma.Decimal(0)
          : investment.type === "BUY"
            ? new Prisma.Decimal(investment.amount).negated()
            : new Prisma.Decimal(investment.amount);

        // Update account balance
        await prisma.account.update({
          where: { id: investment.account.id },
          data: {
            balance: { increment: balanceAdjustment }
          }
        });

        // Delete the investment
        await prisma.investment.delete({ where: { id } });

        return NextResponse.json(
          { 
            success: true, 
            message: "Investimento deletado e saldo ajustado com sucesso" 
          },
          { status: 200 }
        );
      });
    }

    return NextResponse.json(
      { 
        success: false, 
        message: "ID ou IDs são obrigatórios" 
      },
      { status: 400 }
    );
    
  } catch(error) {
    console.error("Investment deletion error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
