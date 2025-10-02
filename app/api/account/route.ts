import { NextResponse } from "next/server";
import { Prisma, AccountType } from "@prisma/client";
import { AccountModel, AccountResponse } from '@/app/types/account'
import { ErrorResponse } from '@/app/types/error'
import { prisma } from '@/app/lib/prisma';

export async function POST(req: Request): Promise<NextResponse<AccountModel | ErrorResponse>> {
  try {
    const body = await req.json();

    const { 
      name, 
      type, 
      balance = 0, 
      currency = "BRL", 
      userId,
      color,
      icon,
      description,
      isActive = true 
    } = body;

    // Validações
    if (!name || !type || !userId) {
      return NextResponse.json(
        { success: false, message: "Nome, tipo e usuário são obrigatórios!" },
        { status: 400 }
      );
    }

    // Verificar se já existe uma conta com o mesmo nome para o usuário
    const existingAccount = await prisma.account.findFirst({
      where: {
        name,
        userId,
        isActive: true
      }
    });

    if (existingAccount) {
      return NextResponse.json(
        { success: false, message: "Já existe uma conta ativa com este nome!" },
        { status: 400 }
      );
    }

    const account = await prisma.account.create({ 
      data: { 
        name, 
        type, 
        balance, 
        currency, 
        userId,
        color,
        icon,
        description,
        isActive
      }
    });

    return NextResponse.json(
      { 
        success: true, 
        message: "Conta criada com sucesso!",
        data: account
      }, 
      { status: 201 }
    );

  } catch(error) {
    console.error("Account creation error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : String(error) 
      }, 
      { status: 500 }
    );
  }
}

export async function GET(request: Request): Promise<NextResponse<AccountResponse | ErrorResponse>> {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 10;
  const search = searchParams.get("search");
  const type = searchParams.get("type") as AccountType | null;
  const isActive = searchParams.get("isActive");
  const currency = searchParams.get("currency");

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
      ...(isActive !== null && { isActive: isActive === 'true' }),
      ...(currency && { currency }),
      ...(search?.trim() && {
        OR: [
          {
            name: {
              contains: search.trim(),
              mode: Prisma.QueryMode.insensitive
            }
          },
          {
            description: {
              contains: search.trim(),
              mode: Prisma.QueryMode.insensitive
            }
          }
        ]
      })
    };

    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { isActive: 'desc' },
          { createdAt: 'desc' }
        ],
        include: {
          _count: {
            select: {
              transactions: true,
              investments: true
            }
          }
        }
      }),
      prisma.account.count({ where }),
    ]);

    // Calcular saldo total por tipo de conta
    const balanceSummary = await prisma.account.aggregate({
      where: {
        ...where,
        isActive: true
      },
      _sum: {
        balance: true
      }
    });

    return NextResponse.json({
      success: true,
      data: { 
        items: accounts, 
        total,
        additionalData: {
          totalBalance: balanceSummary._sum.balance || 0
        }
      },
      pagination: { 
        currentPage: page, 
        totalPages: Math.ceil(total / limit), 
        totalItems: total, 
        limit: limit 
      }
    });
  } catch(error) {
    console.error("Account fetch error:", error);
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
    const { 
      id, 
      name, 
      type, 
      balance, 
      currency, 
      color,
      icon,
      description,
      isActive 
    } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID da conta é obrigatório!" },
        { status: 400 }
      );
    }

    // Verificar se a conta existe
    const existingAccount = await prisma.account.findUnique({
      where: { id }
    });

    if (!existingAccount) {
      return NextResponse.json(
        { success: false, message: "Conta não encontrada!" },
        { status: 404 }
      );
    }

    // Se estiver mudando o nome, verificar duplicata
    if (name && name !== existingAccount.name) {
      const duplicateAccount = await prisma.account.findFirst({
        where: {
          name,
          userId: existingAccount.userId,
          id: { not: id },
          isActive: true
        }
      });

      if (duplicateAccount) {
        return NextResponse.json(
          { success: false, message: "Já existe uma conta ativa com este nome!" },
          { status: 400 }
        );
      }
    }

    const updatedAccount = await prisma.account.update({ 
      where: { id }, 
      data: { 
        name, 
        type, 
        balance, 
        currency, 
        color,
        icon,
        description,
        isActive 
      } 
    });

    return NextResponse.json(
      { 
        success: true, 
        message: "Conta atualizada com sucesso!",
        data: updatedAccount
      },
      { status: 200 }
    );

  } catch(error) {
    console.error("Account update error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request): Promise<NextResponse<ErrorResponse | { success: true; message: string; count?: number }>> {
  try {
    const { id, ids } = await req.json();
    
    // Suporte para delete em lote
    if (ids && Array.isArray(ids)) {
      // Verificar se alguma conta tem transações vinculadas
      const accountsWithTransactions = await prisma.transaction.groupBy({
        by: ['accountId'],
        where: {
          accountId: { in: ids }
        },
        _count: {
          accountId: true
        }
      });

      if (accountsWithTransactions.length > 0) {
        const accountIdsWithTransactions = accountsWithTransactions.map(item => item.accountId);
        return NextResponse.json(
          { 
            success: false,
            message: `Não é possível excluir contas com transações vinculadas. IDs: ${accountIdsWithTransactions.join(', ')}`,
          },
          { status: 400 }
        );
      }

      // Verificar se alguma conta tem investimentos vinculados
      const accountsWithInvestments = await prisma.investment.groupBy({
        by: ['accountId'],
        where: {
          accountId: { in: ids }
        },
        _count: {
          accountId: true
        }
      });

      if (accountsWithInvestments.length > 0) {
        const accountIdsWithInvestments = accountsWithInvestments.map(item => item.accountId);
        return NextResponse.json(
          { 
            success: false,
            message: `Não é possível excluir contas com investimentos vinculados. IDs: ${accountIdsWithInvestments.join(', ')}`,
          },
          { status: 400 }
        );
      }

      const { count } = await prisma.account.deleteMany({
        where: { 
          id: { in: ids } 
        }
      });

      return NextResponse.json(
        { 
          success: true, 
          message: `${count} contas deletadas com sucesso`,
          count
        },
        { status: 200 }
      );
    }
    
    // Delete único
    if (id) {
      // Verificar se a conta existe
      const account = await prisma.account.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              transactions: true,
              investments: true
            }
          }
        }
      });

      if (!account) {
        return NextResponse.json(
          { 
            success: false,
            message: "Conta não encontrada",
          },
          { status: 404 }
        );
      }

      // Verificar se a conta tem transações vinculadas
      if (account._count.transactions > 0) {
        return NextResponse.json(
          { 
            success: false,
            message: "Não é possível excluir esta conta pois existem transações vinculadas a ela",
          },
          { status: 400 }
        );
      }

      // Verificar se a conta tem investimentos vinculados
      if (account._count.investments > 0) {
        return NextResponse.json(
          { 
            success: false,
            message: "Não é possível excluir esta conta pois existem investimentos vinculados a ela",
          },
          { status: 400 }
        );
      }

      await prisma.account.delete({ where: { id } });

      return NextResponse.json(
        { 
          success: true, 
          message: "Conta deletada com sucesso" 
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: "ID ou IDs são obrigatórios" 
      },
      { status: 400 }
    );
    
  } catch(error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

// Nova rota para buscar todas as contas ativas do usuário (sem paginação)
// export async function GET_ALL(request: Request): Promise<NextResponse<AccountResponse | ErrorResponse>> {
//   const { searchParams } = new URL(request.url);
//   const userId = searchParams.get("userId");
//   const isActive = searchParams.get("isActive") || 'true';

//   if (!userId) {
//     return NextResponse.json(
//       { 
//         success: false, 
//         message: "Usuário é obrigatório!" 
//       },
//       { status: 400 }
//     );
//   }

//   try {
//     const accounts = await prisma.account.findMany({
//       where: {
//         userId,
//         isActive: isActive === 'true'
//       },
//       orderBy: [
//         { type: 'asc' },
//         { name: 'asc' }
//       ],
//       select: {
//         id: true,
//         name: true,
//         type: true,
//         balance: true,
//         currency: true,
//         color: true,
//         icon: true,
//         description: true,
//         isActive: true,
//         createdAt: true,
//         updatedAt: true
//       }
//     });

//     return NextResponse.json({
//       success: true,
//       data: { 
//         items: accounts,
//         total: accounts.length
//       }
//     });
//   } catch(error) {
//     console.error("Account fetch all error:", error);
//     return NextResponse.json(
//       { 
//         success: false, 
//         message: error instanceof Error ? error.message : String(error) 
//       },
//       { status: 500 }
//     );
//   }
// }