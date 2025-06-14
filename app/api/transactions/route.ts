import { NextResponse } from "next/server";
import { Prisma, PrismaClient, TransactionType } from "@prisma/client";
import { TransactionModel, TransactionResponse } from '@/app/types/transaction'
import { ErrorResponse } from '@/app/types/error'

const prisma = new PrismaClient();

export async function POST(req: Request): Promise<NextResponse<TransactionModel | ErrorResponse>> {
  try {
    const body = await req.json();

    await prisma.transaction.create({
      data: {
        ...body,
        year: new Date(body.transactionDate).getFullYear(),
        month: new Date(body.transactionDate).getMonth() + 1,
        day: new Date(body.transactionDate).getDate()
      },
      include: {
        account: { select: { name: true, currency: true } },
        category: { select: { name: true } }
      }
    });

    return NextResponse.json({ success: true, message: "Transação criada com sucesso!" }, { status: 200 });

  } catch(error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// Listar transações (GET)
export async function GET(request: Request): Promise<NextResponse<TransactionResponse | ErrorResponse>> {
  const { searchParams } = new URL(request.url);
  
  // Parâmetros obrigatórios
  const userId = searchParams.get("userId");
  
  // Parâmetros opcionais
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 8;
  const type = searchParams.get("type") as TransactionType | null;
  const categoryId = searchParams.get("category");
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
    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(type && { type }),
      ...(categoryId && { categoryId }),
      ...(accountId && { accountId }),
      ...(search?.trim() && {
        description: {
          contains: search.trim(),
          mode: Prisma.QueryMode.insensitive
        }
      })
    };

    if (year) where.year = parseInt(year);
    if (month) where.month = parseInt(month);

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { transactionDate: "desc" },
        include: {
          // account: { select: { id: true, name: true, currency: true } },
          // category: { select: { id: true, name: true } },
          account: true,
          category: true,
        }
      }),
      prisma.transaction.count({ where }),
    ]);

    return NextResponse.json({
        success: true,
        data: { items: transactions, total },
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

// Atualizar transação (PUT)
export async function PUT(req: Request) {
  try {
    const { id, ...data } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID da transação é obrigatório" },
        { status: 400 }
      );
    }

    // Atualizar campos de data se transactionDate mudar
    if (data.transactionDate) {
      data.year = new Date(data.transactionDate).getFullYear();
      data.month = new Date(data.transactionDate).getMonth() + 1;
      data.day = new Date(data.transactionDate).getDate();
    }

    const updateData = {
      ...data,
      amount: new Prisma.Decimal(data.amount),
      unitPrice: data.unitPrice ? new Prisma.Decimal(data.unitPrice) : null,
    };

    await prisma.transaction.update({
      where: { id },
      data: updateData,
      include: {
        account: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      { 
        success: true, 
        message: "Transação atualizada com sucesso!" 
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

// Deletar transação (DELETE)
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID da transação é obrigatório" },
        { status: 400 }
      );
    }

    await prisma.transaction.delete({ where: { id } });

    return NextResponse.json(
      { 
        success: true, 
        message: "Transação deletada com sucesso!" 
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