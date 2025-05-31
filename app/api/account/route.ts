import { NextResponse } from "next/server";
import { Prisma, PrismaClient, AccountType } from "@prisma/client";
import { AccountModel, ErrorResponse, AccountResponse } from '@/app/types/account'

const prisma = new PrismaClient();

// Criar uma nova contas (POST)
export async function POST(req: Request): Promise<NextResponse<AccountModel | ErrorResponse | { count: number }>> {
  try {
    const body = await req.json();

    if (Array.isArray(body)) {
      const { count } = await prisma.account.createMany({
        data: body,
        skipDuplicates: true,
      });
      return NextResponse.json({ count }, { status: 201 });
    }

    const { name, type, balance, currency, userId } = body;

    const newAccount = await prisma.account.create({
      data: { name, type, balance, currency, userId },
    });
    return NextResponse.json(
      {
        ...newAccount,
        balance: newAccount.balance.toNumber(),
      },
      { status: 201 }
    );
  } catch(error) {
    console.log(error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Listar todas as contas (GET)
export async function GET(request: Request): Promise<NextResponse<AccountResponse | ErrorResponse>> {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 5;
  const search = searchParams.get("search");
  const type = searchParams.get("type") as AccountType | null;

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Usuário é obrigatório!" },
      { status: 400 }
    );
  }

  try {

    const where: Prisma.AccountWhereInput = {
      userId,
      ...(type && { type }),
      ...(search && {
        name: {
          contains: search,
          mode: Prisma.QueryMode.insensitive
        }
      })
    };

    const total = await prisma.account.count({ where: { userId } });
    const accounts = await prisma.account.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: { accounts, total },
      pagination: {
        total,
        currentPage: page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch(error) {
    console.log(error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Atualizar uma categoria (PUT)
export async function PUT(req: Request): Promise<NextResponse<AccountResponse | ErrorResponse>> {
  try {
    const { id, name, type, balance, currency } = await req.json();

    const updateAccount = await prisma.account.update({
      where: { id },
      data: { name, type, balance, currency },
    });

    // Converte balance pra number
    const sanitizedAccount = {
      ...updateAccount,
      balance: updateAccount.balance.toNumber(),
    };

    // Retorna conforme AccountResponse (mesmo que só uma conta)
    return NextResponse.json({
      success: true,
      data: {
        accounts: [sanitizedAccount],
        total: 1,
      },
      pagination: {
        currentPage: 1,
        totalPages: 1,
      }
    }, { status: 200 });

  } catch(error) {
    console.log(error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Deletar uma categoria (DELETE)
export async function DELETE(req: Request): Promise<NextResponse<ErrorResponse | { success: true; message: string }>> {
  try {
    const { id } = await req.json();
    
    const accountTransactions = await prisma.transaction.count({
      where: { accountId: id }
    });

    if (accountTransactions > 0) {
      return NextResponse.json(
        { 
          success: false,
          error: "Não é possível excluir esta categoria pois existem transações vinculadas a ela",
          details: { accountTransactions: accountTransactions }
        },
        { status: 400 }
      );
    }

    await prisma.account.delete({ where: { id } });
    return NextResponse.json(
      { success: true, message: "Categoria deletada com sucesso!" },
      { status: 200 }
    );
  } catch(error) {
    console.log(error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}