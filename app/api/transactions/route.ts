import { NextResponse } from "next/server";
import { Prisma, PrismaClient, TransactionType } from "@prisma/client";

const prisma = new PrismaClient();

// Helper para tratamento de erros
const handleError = (error: unknown, context: string) => {
  console.error(`Erro no ${context}:`, error);

  const message = error instanceof Error ? error.message : 'Erro desconhecido';

  return NextResponse.json(
    { 
      success: false, 
      error: `Erro ao ${context}`,
      details: process.env.NODE_ENV === 'development' ? message : undefined
    }, 
    { status: 500 }
  );
};

// Criar transação (POST)
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validação básica
    if (!body.userId || !body.transactionDate || !body.amount || !body.type) {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios faltando" },
        { status: 400 }
      );
    }

    // Criar uma ou múltiplas transações
    if (Array.isArray(body)) {
      const transactions = await prisma.transaction.createMany({
        data: body.map(t => ({
          ...t,
          year: new Date(t.transactionDate).getFullYear(),
          month: new Date(t.transactionDate).getMonth() + 1,
          day: new Date(t.transactionDate).getDate()
        })),
        skipDuplicates: true,
      });
      return NextResponse.json({ success: true, data: transactions }, { status: 201 });
    }

    // Criar transação única
    const transaction = await prisma.transaction.create({
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

    return NextResponse.json({ success: true, data: transaction }, { status: 201 });

  } catch (error) {
    return handleError(error, "criar transação");
  }
}

// Listar transações (GET)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  
  // Parâmetros obrigatórios
  const userId = searchParams.get("userId");
  
  // Parâmetros opcionais
  // const month = searchParams.get("month");
  // const year = searchParams.get("year");
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 5;
  const type = searchParams.get("type") as TransactionType | null;
  const categoryId = searchParams.get("categoryId");
  const accountId = searchParams.get("accountId");
  const search = searchParams.get("search");

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Parâmetros obrigatórios: userId" },
      { status: 400 }
    );
  }

  try {
    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(type && { type }),
      ...(categoryId && { categoryId }),
      ...(accountId && { accountId }),
      ...(search && {
        description: {
          contains: search,
          mode: Prisma.QueryMode.insensitive
        }
      })
    };

    const [transactions, total, allTransacoes] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { transactionDate: "desc" },
        include: {
          // account: { select: { name: true, currency: true } },
          // category: { select: { name: true } }
          account: true,
          category: true,
        }
      }),
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: transactions,
      allTransacoes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }, { status: 200 });

  } catch (error) {
    return handleError(error, "listar transações");
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

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data,
      include: {
        account: { select: { name: true } },
        category: { select: { name: true } }
      }
    });

    return NextResponse.json({ success: true, data: updatedTransaction });

  } catch (error) {
    return handleError(error, "atualizar transação");
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
    return NextResponse.json({ success: true, message: "Transação deletada" });

  } catch (error) {
    return handleError(error, "deletar transação");
  }
}