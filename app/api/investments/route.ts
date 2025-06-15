import { NextResponse } from "next/server";
import { Prisma, PrismaClient, InvestmentType } from "@prisma/client";
import { InvestmentModel, InvestmentResponse } from '@/app/types/investment'
import { ErrorResponse } from '@/app/types/error'

const prisma = new PrismaClient();

export async function POST(req: Request): Promise<NextResponse<InvestmentModel | ErrorResponse>> {
  try {
    const body = await req.json();

    await prisma.investment.create({
      data: {
        ...body,
      },
      include: {
        account: { select: { name: true, currency: true } },
      }
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

    const updateData = {
      ...data,
      amount: new Prisma.Decimal(data.amount),
      unitPrice: data.unitPrice ? new Prisma.Decimal(data.unitPrice) : null,
    };

    await prisma.investment.update({
      where: { id },
      data: updateData,
      include: {
        account: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      { 
        success: true, 
        message: "Investimento atualizada com sucesso!" 
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
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID da Investimento é obrigatório" },
        { status: 400 }
      );
    }

    await prisma.investment.delete({ where: { id } });

    return NextResponse.json(
      { 
        success: true, 
        message: "Investimento deletada com sucesso!" 
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