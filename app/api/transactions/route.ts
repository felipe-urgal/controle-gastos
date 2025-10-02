import { NextResponse } from "next/server";
import { Prisma, TransactionType, TransactionStatus } from "@prisma/client";
import { TransactionModel, TransactionResponse } from '@/app/types/transaction'
import { ErrorResponse } from '@/app/types/error'
import { prisma } from '@/app/lib/prisma';

export async function POST(req: Request): Promise<NextResponse<TransactionModel | ErrorResponse>> {
  try {
    const body = await req.json();
    const { 
      amount, 
      type, 
      description, 
      year, 
      month, 
      day, 
      userId, 
      categoryId, 
      accountId,
      status = 'COMPLETED',
      repeatMonths = 1 // Novo parâmetro: número de meses para repetir
    } = body;

    // Validações básicas
    if (!amount || !type || !description || !year || !month || !day || !userId || !accountId) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Campos obrigatórios: amount, type, description, year, month, day, userId, accountId" 
        }, 
        { status: 400 }
      );
    }

    // Validar repeatMonths
    if (repeatMonths < 1 || repeatMonths > 60) { // Limite de 5 anos
      return NextResponse.json(
        { 
          success: false, 
          message: "repeatMonths deve estar entre 1 e 60" 
        }, 
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (prisma) => {
      // Verificar se a conta existe
      const account = await prisma.account.findUnique({
        where: { id: accountId },
        select: { 
          id: true, 
          balance: true,
          userId: true 
        }
      });

      if (!account) {
        throw new Error("Conta não encontrada");
      }

      // Verificar se a conta pertence ao usuário
      if (account.userId !== userId) {
        throw new Error("Conta não pertence ao usuário");
      }

      // Verificar categoria se for fornecida
      if (categoryId) {
        const category = await prisma.category.findUnique({
          where: { id: categoryId },
          select: { userId: true }
        });

        if (!category) {
          throw new Error("Categoria não encontrada");
        }

        if (category.userId !== userId) {
          throw new Error("Categoria não pertence ao usuário");
        }
      }

      const amountInt = amount; // Já deve vir em centavos (int)
      
      // CORREÇÃO: Definir tipo explícito para o array de transações
      const transactions: any[] = [];

      // Criar transações para cada mês
      for (let i = 0; i < repeatMonths; i++) {
        const currentMonth = month + i;
        let currentYear = year;
        let adjustedMonth = currentMonth;
        
        // Ajustar ano e mês se passar de dezembro
        if (currentMonth > 12) {
          adjustedMonth = ((currentMonth - 1) % 12) + 1;
          currentYear = year + Math.floor((currentMonth - 1) / 12);
        }

        // Verificar se o dia existe no mês
        const daysInMonth = new Date(currentYear, adjustedMonth, 0).getDate();
        const adjustedDay = Math.min(day, daysInMonth);

        // Dados da transação
        const transactionData: Prisma.TransactionCreateInput = {
          amount: amountInt,
          type,
          description: i === 0 ? description : `${description} (${i + 1}/${repeatMonths})`,
          status: status as TransactionStatus,
          year: currentYear,
          month: adjustedMonth,
          day: adjustedDay,
          user: {
            connect: { id: userId }
          },
          account: {
            connect: { id: accountId }
          },
          ...(categoryId && {
            category: {
              connect: { id: categoryId }
            }
          })
        };

        // Criar transação
        const transaction = await prisma.transaction.create({
          data: transactionData,
          include: {
            account: { 
              select: { 
                id: true, 
                name: true, 
                currency: true,
                type: true,
                color: true,
                icon: true
              } 
            },
            category: { 
              select: { 
                id: true, 
                name: true,
                color: true,
                icon: true,
                type: true
              } 
            }
          }
        });

        transactions.push(transaction);

        // Atualizar saldo da conta apenas se a transação estiver COMPLETED
        if (status === 'COMPLETED') {
          const balanceChange = type === "INCOME" ? amountInt : -amountInt;
          
          await prisma.account.update({
            where: { id: accountId },
            data: { 
              balance: { 
                increment: balanceChange 
              } 
            }
          });
        }
      }

      return transactions;
    });

    const message = repeatMonths > 1 
      ? `${repeatMonths} transações criadas com sucesso!` 
      : "Transação criada com sucesso!";

    return NextResponse.json({ 
      success: true, 
      message,
      data: result,
      count: result.length
    }, { status: 201 });

  } catch(error) {
    console.error("Transaction creation error:", error);
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

// Resto do código permanece igual...
export async function GET(request: Request): Promise<NextResponse<TransactionResponse | ErrorResponse>> {
  const { searchParams } = new URL(request.url);
  
  // Parâmetros obrigatórios
  const userId = searchParams.get("userId");
  
  // Parâmetros opcionais
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 10;
  const type = searchParams.get("type") as TransactionType | null;
  const categoryId = searchParams.get("categoryId");
  const accountId = searchParams.get("accountId");
  const status = searchParams.get("status") as TransactionStatus | null;
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
      ...(status && { status }),
      ...(search?.trim() && {
        OR: [
          {
            description: {
              contains: search.trim(),
              mode: Prisma.QueryMode.insensitive
            }
          },
          {
            account: {
              name: {
                contains: search.trim(),
                mode: Prisma.QueryMode.insensitive
              }
            }
          },
          {
            category: {
              name: {
                contains: search.trim(),
                mode: Prisma.QueryMode.insensitive
              }
            }
          }
        ]
      })
    };

    // Filtros de data usando os campos otimizados
    if (year) where.year = parseInt(year);
    if (month) where.month = parseInt(month);

    const [transactions, total, incomeResult, expensesResult] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        // Ordenar por data usando os campos year, month, day
        orderBy: [
          { year: 'desc' },
          { month: 'desc' },
          { day: 'desc' },
          { createdAt: 'desc' }
        ],
        include: {
          account: {
            select: { 
              id: true, 
              name: true, 
              currency: true,
              type: true,
              color: true,
              icon: true
            } 
          },
          category: {
            select: { 
              id: true, 
              name: true,
              color: true,
              icon: true,
              type: true
            } 
          },
        }
      }),
      prisma.transaction.count({ where }),
      prisma.transaction.aggregate({
        where: { ...where, type: 'INCOME' },
        _sum: { amount: true }
      }),
      prisma.transaction.aggregate({
        where: { ...where, type: 'EXPENSE' },
        _sum: { amount: true }
      })
    ]);

    const income = incomeResult._sum.amount || 0;
    const expenses = expensesResult._sum.amount || 0;

    return NextResponse.json({
      success: true,
      data: { 
        items: transactions, 
        total,
        additionalData: {
          income: (income / 100).toString(), // Converter de centavos para reais
          expenses: (expenses / 100).toString(),
          balance: ((income - expenses) / 100).toString()
        },
      },
      pagination: { 
        currentPage: page, 
        totalPages: Math.ceil(total / limit), 
        totalItems: total, 
        limit: limit 
      }
    });
  } catch(error) {
    console.error("Transaction fetch error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

// PUT e DELETE permanecem iguais...
export async function PUT(req: Request): Promise<NextResponse<TransactionModel | ErrorResponse>> {
  try {
    const { id, ...updateData } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID da transação é obrigatório" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (prisma) => {
      // Buscar transação existente
      const existingTransaction = await prisma.transaction.findUnique({
        where: { id },
        include: {
          account: { select: { id: true, balance: true, userId: true } },
          category: { select: { userId: true } }
        }
      });

      if (!existingTransaction) {
        throw new Error("Transação não encontrada");
      }

      // Verificar permissões
      if (updateData.userId && updateData.userId !== existingTransaction.userId) {
        throw new Error("Não é possível alterar o usuário da transação");
      }

      // Verificar categoria se for fornecida
      if (updateData.categoryId) {
        const category = await prisma.category.findUnique({
          where: { id: updateData.categoryId },
          select: { userId: true }
        });

        if (category && category.userId !== existingTransaction.userId) {
          throw new Error("Categoria não pertence ao usuário");
        }
      }

      // Preparar dados de atualização
      const data: Prisma.TransactionUpdateInput = {
        ...(updateData.description && { description: updateData.description }),
        ...(updateData.type && { type: updateData.type }),
        ...(updateData.status && { status: updateData.status }),
        ...(updateData.accountId && {
          account: { connect: { id: updateData.accountId } }
        }),
        ...(updateData.categoryId !== undefined && {
          category: updateData.categoryId 
            ? { connect: { id: updateData.categoryId } }
            : { disconnect: true }
        })
      };

      // Se a data mudou, atualizar campos otimizados
      if (updateData.year || updateData.month || updateData.day) {
        data.year = updateData.year ? parseInt(updateData.year) : existingTransaction.year;
        data.month = updateData.month ? parseInt(updateData.month) : existingTransaction.month;
        data.day = updateData.day ? parseInt(updateData.day) : existingTransaction.day;
      }

      // Se o valor mudou, ajustar saldo da conta
      if (updateData.amount !== undefined) {
        const newAmount = updateData.amount; // Já deve vir em centavos
        const oldAmount = existingTransaction.amount;

        // Calcular ajuste do saldo (considerar tipo e status)
        let balanceAdjustment = 0;
        
        if (existingTransaction.status === 'COMPLETED') {
          // Reverter transação antiga
          balanceAdjustment = existingTransaction.type === 'INCOME' 
            ? -oldAmount 
            : oldAmount;
        }

        if (updateData.status === 'COMPLETED' || (!updateData.status && existingTransaction.status === 'COMPLETED')) {
          // Aplicar nova transação
          const newTransactionEffect = (updateData.type || existingTransaction.type) === 'INCOME'
            ? newAmount
            : -newAmount;
          
          balanceAdjustment = balanceAdjustment + newTransactionEffect;
        }

        // Atualizar saldo se houver ajuste
        if (balanceAdjustment !== 0) {
          await prisma.account.update({
            where: { id: existingTransaction.account.id },
            data: {
              balance: { increment: balanceAdjustment }
            }
          });
        }

        data.amount = newAmount;
      }

      // Atualizar transação
      const updatedTransaction = await prisma.transaction.update({
        where: { id },
        data,
        include: {
          account: { 
            select: { 
              id: true, 
              name: true, 
              currency: true,
              type: true,
              color: true,
              icon: true
            } 
          },
          category: { 
            select: { 
              id: true, 
              name: true,
              color: true,
              icon: true,
              type: true
            } 
          },
        }
      });

      return updatedTransaction;
    });

    return NextResponse.json(
      { 
        success: true, 
        message: "Transação atualizada com sucesso!",
        data: result 
      },
      { status: 200 }
    );

  } catch(error) {
    console.error("Transaction update error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    const statusCode = error instanceof Error && error.message.includes("não encontrada") ? 404 : 500;
    
    return NextResponse.json(
      { 
        success: false, 
        message: errorMessage 
      },
      { status: statusCode }
    );
  }
}

export async function DELETE(req: Request): Promise<NextResponse<ErrorResponse | { success: true; message: string; count?: number }>> {
  try {
    const { id, ids } = await req.json();
    
    if (ids && Array.isArray(ids)) {
      return await prisma.$transaction(async (prisma) => {
        // Buscar transações com informações das contas
        const transactions = await prisma.transaction.findMany({
          where: { id: { in: ids } },
          include: {
            account: { select: { id: true, balance: true } }
          }
        });

        if (transactions.length === 0) {
          return NextResponse.json(
            { 
              success: false,
              message: "Nenhuma transação encontrada",
            },
            { status: 404 }
          );
        }

        // Agrupar ajustes de saldo por conta (apenas para transações COMPLETED)
        const balanceAdjustmentsByAccount: { [accountId: string]: number } = {};

        for (const transaction of transactions) {
          if (transaction.status === 'COMPLETED') {
            const adjustment = transaction.type === 'INCOME'
              ? -transaction.amount
              : transaction.amount;

            if (balanceAdjustmentsByAccount[transaction.account.id]) {
              balanceAdjustmentsByAccount[transaction.account.id] = 
                balanceAdjustmentsByAccount[transaction.account.id] + adjustment;
            } else {
              balanceAdjustmentsByAccount[transaction.account.id] = adjustment;
            }
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

        // Deletar as transações
        const { count } = await prisma.transaction.deleteMany({
          where: { id: { in: ids } }
        });

        return NextResponse.json(
          { 
            success: true, 
            message: `${count} transações deletadas com sucesso`,
            count
          },
          { status: 200 }
        );
      });
    }
    
    if (id) {
      return await prisma.$transaction(async (prisma) => {
        const transaction = await prisma.transaction.findUnique({
          where: { id },
          include: {
            account: { select: { id: true, balance: true } }
          }
        });

        if (!transaction) {
          return NextResponse.json(
            { 
              success: false,
              message: "Transação não encontrada",
            },
            { status: 404 }
          );
        }

        // Reverter saldo apenas se a transação estava COMPLETED
        if (transaction.status === 'COMPLETED') {
          const balanceAdjustment = transaction.type === 'INCOME'
            ? -transaction.amount
            : transaction.amount;

          await prisma.account.update({
            where: { id: transaction.account.id },
            data: {
              balance: { increment: balanceAdjustment }
            }
          });
        }

        await prisma.transaction.delete({ where: { id } });

        return NextResponse.json(
          { 
            success: true, 
            message: "Transação deletada com sucesso" 
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
    console.error("Transaction deletion error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}