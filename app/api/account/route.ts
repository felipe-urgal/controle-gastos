import { NextResponse } from "next/server";
import { Prisma, PrismaClient, AccountType } from "@prisma/client";
import { AccountModel, AccountResponse } from '@/app/types/account'
import { ErrorResponse } from '@/app/types/error'

const prisma = new PrismaClient();

export async function POST(req: Request): Promise<NextResponse<AccountModel | ErrorResponse>> {
  try {
    const body = await req.json();

    const { name, type, balance, currency, userId } = body;

    await prisma.account.create({ data: { name, type, balance, currency, userId }});

    return NextResponse.json({ success: true, message: "Conta criada com sucesso!" }, { status: 200 });

  } catch(error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function GET(request: Request): Promise<NextResponse<AccountResponse | ErrorResponse>> {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 8;
  const search = searchParams.get("search");
  const type = searchParams.get("type") as AccountType | null;

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

    const where: Prisma.AccountWhereInput = {
      userId,
      ...(type && { type }),
      ...(search?.trim() && {
        name: {
          contains: search.trim(),
          mode: Prisma.QueryMode.insensitive
        }
      })
    };

    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.account.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: { accounts, total },
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

export async function PUT(req: Request): Promise<NextResponse<AccountResponse | ErrorResponse>> {
  try {
    const { id, name, type, balance, currency } = await req.json();

    await prisma.account.update({ where: { id }, data: { name, type, balance, currency }});

    return NextResponse.json(
      { 
        success: true, 
        message: "Conta atualizada com sucesso!" 
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

export async function DELETE(req: Request): Promise<NextResponse<ErrorResponse | { success: true; message: string }>> {
  try {
    const { id } = await req.json();
    
    const accountTransactions = await prisma.transaction.count({ where: { accountId: id } });

    if (accountTransactions > 0) {
      return NextResponse.json(
        { 
          success: false,
          message: "Não é possível excluir esta conta pois existem transações vinculadas a ela",
        },
        { status: 400 }
      );
    }

    await prisma.account.delete({ where: { id } });

    return NextResponse.json(
      { 
        success: true, 
        message: "Conta deletada com sucesso!" 
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