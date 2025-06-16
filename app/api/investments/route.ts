import { NextResponse } from "next/server";
import { Prisma, PrismaClient, InvestmentType } from "@prisma/client";
import { InvestmentModel, InvestmentResponse } from '@/app/types/investment'
import { ErrorResponse } from '@/app/types/error'

const prisma = new PrismaClient();

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
      const balanceChange = body.type === "BUY" ? amount : amount.negated();
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

    const [investments, total] = await Promise.all([
      prisma.investment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { investmentDate: "desc" },
        include: {
          // account: { select: { id: true, name: true, currency: true } },
          // category: { select: { id: true, name: true } },
          account: true,
        }
      }),
      prisma.investment.count({ where }),
    ]);

    return NextResponse.json({
        success: true,
        data: { items: investments, total },
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
        const balanceAdjustment = existingInvestment.type === 'BUY' 
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
export async function DELETE(req: Request): Promise<NextResponse<{ success: boolean; message: string } | ErrorResponse>> {
  try {
    const { id } = await req.json();

    // Validate required field
    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID da Investimento é obrigatório" },
        { status: 400 }
      );
    }

    // Process in a investment to ensure data consistency
    await prisma.$transaction(async (prisma) => {
      // Get the investment with account info
      const investment = await prisma.investment.findUnique({
        where: { id },
        include: {
          account: { select: { id: true, balance: true } }
        }
      });

      if (!investment) {
        throw new Error("Investimento não encontrada");
      }

      // Calculate balance adjustment (reverse the original investment)
      const balanceAdjustment = investment.type === 'BUY'
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
    });

    return NextResponse.json(
      { 
        success: true, 
        message: "Investimento deletada e saldo ajustado com sucesso!" 
      },
      { status: 200 }
    );

  } catch(error) {
    console.error("investment deletion error:", error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Erro ao deletar Investimento";
    const statusCode = error instanceof Error && error.message.includes("não encontrada") 
      ? 404 
      : 500;
    
    return NextResponse.json(
      { 
        success: false, 
        message: errorMessage 
      },
      { status: statusCode }
    );
  }
}