import { NextResponse } from "next/server";
import { Prisma, TransactionType, Transaction } from "@prisma/client";
import { TransactionModel, TransactionResponse } from '@/app/types/transaction'
import { ErrorResponse } from '@/app/types/error'
import { prisma } from '@/app/lib/prisma';

// Interface para os dados de criação de transação
interface TransactionCreateData {
  amount: number | Prisma.Decimal;
  type: TransactionType;
  description: string;
  transactionDate: Date;
  userId: string;
  categoryId: string | null;
  accountId: string;
  year?: number;
  month?: number;
  day?: number;
}

// Modifique a função POST
export async function POST(req: Request): Promise<NextResponse<TransactionModel | ErrorResponse>> {
  try {
    const body = await req.json();
    const { repeatMonths = 1, ...transactionData } = body;

    await prisma.$transaction(async (prisma) => {
      // Verificar se a conta existe e obter saldo atual
      const account = await prisma.account.findUnique({
        where: { id: transactionData.accountId },
        select: { balance: true }
      });

      if (!account) {
        throw new Error("Account not found");
      }

      const amount = new Prisma.Decimal(transactionData.amount).toDecimalPlaces(2);
      const transactionDate = new Date(transactionData.transactionDate);

      // Calcular novo saldo (apenas para a primeira transação)
      const balanceChange = transactionData.type === "INCOME" ? amount : amount.negated();
      const newBalance = new Prisma.Decimal(account.balance).plus(balanceChange);

      // Criar transação principal
      const transaction = await prisma.transaction.create({
        data: {
          ...transactionData,
          amount: amount,
          year: transactionDate.getFullYear(),
          month: transactionDate.getMonth() + 1,
          day: transactionDate.getDate(),
        },
        include: {
          account: { select: { id: true, balance: true, name: true, currency: true } },
          category: { select: { name: true } }
        }
      });

      // Atualizar saldo da conta
      await prisma.account.update({
        where: { id: transactionData.accountId },
        data: { balance: newBalance }
      });

      // Se houver repetição, criar transações futuras
      if (repeatMonths && repeatMonths > 1) {
        await createMonthlyRecurringTransactions(
          prisma, 
          transaction, 
          repeatMonths, 
          {
            amount: amount,
            type: transactionData.type,
            description: transactionData.description,
            transactionDate: transactionDate,
            userId: transactionData.userId,
            categoryId: transactionData.categoryId,
            accountId: transactionData.accountId
          }, 
          account.balance
        );
      }

      return transaction;
    });

    return NextResponse.json({ 
      success: true, 
      message: `Transação criada${repeatMonths > 1 ? ` e repetida por ${repeatMonths} meses` : ''} com sucesso!` 
    }, { status: 200 });

  } catch(error) {
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

// Função auxiliar para criar transações mensais recorrentes
async function createMonthlyRecurringTransactions(
  prisma: Prisma.TransactionClient,
  originalTransaction: Transaction,
  repeatMonths: number,
  transactionData: TransactionCreateData,
  initialBalance: Prisma.Decimal
) {
  if (!originalTransaction.transactionDate) {
    throw new Error("Transaction date is missing");
  }

  let currentBalance = new Prisma.Decimal(initialBalance);
  const originalDate = new Date(originalTransaction.transactionDate);
  const amount = new Prisma.Decimal(transactionData.amount);
  
  // Já criamos a primeira transação, então começamos do mês 2
  for (let i = 2; i <= repeatMonths; i++) {
    // Calcular próxima data (mesmo dia, mês seguinte)
    const nextDate = new Date(originalDate);
    nextDate.setMonth(originalDate.getMonth() + (i - 1));
    
    // Ajustar se o dia original não existe no próximo mês
    if (nextDate.getDate() !== originalDate.getDate()) {
      nextDate.setDate(0); // Vai para o último dia do mês anterior
    }

    // Calcular novo saldo
    const balanceChange = transactionData.type === "INCOME" ? amount : amount.negated();
    currentBalance = currentBalance.plus(balanceChange);

    // Criar transação recorrente
    await prisma.transaction.create({
      data: {
        amount: amount,
        type: transactionData.type,
        description: transactionData.description,
        transactionDate: nextDate,
        userId: transactionData.userId,
        categoryId: transactionData.categoryId,
        accountId: transactionData.accountId,
        year: nextDate.getFullYear(),
        month: nextDate.getMonth() + 1,
        day: nextDate.getDate(),
      }
    });

    // Atualizar saldo da conta (cada transação afeta o saldo)
    await prisma.account.update({
      where: { id: transactionData.accountId },
      data: { balance: currentBalance }
    });
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

    const [transactions, total, income, expenses] = await Promise.all([
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
      prisma.transaction.aggregate({
        where: { ...where, type: 'INCOME' },
        _sum: { amount: true }
      }).then(res => res._sum.amount || 0),
      prisma.transaction.aggregate({
        where: { ...where, type: 'EXPENSE' },
        _sum: { amount: true }
      }).then(res => res._sum.amount || 0)
    ]);

    return NextResponse.json({
        success: true,
        data: { 
          items: transactions, 
          total,
          additionalData: {
            income: String(income),
            expenses: String(expenses),
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

// Atualizar transação (PUT)
export async function PUT(req: Request): Promise<NextResponse<TransactionModel | ErrorResponse>> {
  try {
    const { id, ...data } = await req.json();

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID da transação é obrigatório" },
        { status: 400 }
      );
    }

    // Process in a transaction to ensure data consistency
    const result = await prisma.$transaction(async (prisma) => {
      // Get existing transaction with account info
      const existingTransaction = await prisma.transaction.findUnique({
        where: { id },
        include: {
          account: { select: { id: true, balance: true } }
        }
      });

      if (!existingTransaction) {
        throw new Error("Transação não encontrada");
      }

      // Prepare update data
      const updateData: Prisma.TransactionUpdateInput = {
        amount: data.amount,
        type: data.type as TransactionType, // Cast to enum type if needed
        description: data.description,
        transactionDate: data.transactionDate,
        // Handle relationships properly:
        account: data.accountId ? { connect: { id: data.accountId } } : undefined,
        category: data.categoryId ? { connect: { id: data.categoryId } } : undefined
      };
      
      // Update date fields if transactionDate changed
      if (data.transactionDate) {
        updateData.year = new Date(data.transactionDate).getFullYear();
        updateData.month = new Date(data.transactionDate).getMonth() + 1;
        updateData.day = new Date(data.transactionDate).getDate();
      }

      // Handle amount changes
      if (data.amount !== undefined) {
        const newAmount = new Prisma.Decimal(data.amount).toDecimalPlaces(2);
        const oldAmount = existingTransaction.amount;
        const amountDiff = newAmount.minus(oldAmount);

        // Calculate balance adjustment (consider transaction type)
        const balanceAdjustment = existingTransaction.type === 'INCOME' 
          ? amountDiff 
          : amountDiff.negated();

        // Update account balance
        await prisma.account.update({
          where: { id: existingTransaction.account.id },
          data: {
            balance: { increment: balanceAdjustment }
          }
        });

        updateData.amount = newAmount;
      }

      // Update the transaction
      const updatedTransaction = await prisma.transaction.update({
        where: { id },
        data: updateData,
        include: {
          account: { select: { id: true, name: true, currency: true } },
          category: { select: { id: true, name: true } },
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

// Deletar transação (DELETE)
export async function DELETE(req: Request): Promise<NextResponse<ErrorResponse | { success: true; message: string; count?: number }>> {
  try {
    const { id, ids } = await req.json();
    
    // Suporte para delete em lote
    if (ids && Array.isArray(ids)) {
      return await prisma.$transaction(async (prisma) => {
        // Buscar todas as transações com informações das contas
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
              message: "Nenhuma transação encontrada com os IDs fornecidos",
            },
            { status: 404 }
          );
        }

        // Agrupar ajustes de saldo por conta
        const balanceAdjustmentsByAccount: { [accountId: string]: Prisma.Decimal } = {};

        for (const transaction of transactions) {
          const adjustment = transaction.type === 'INCOME'
            ? new Prisma.Decimal(transaction.amount).negated()
            : new Prisma.Decimal(transaction.amount);

          if (balanceAdjustmentsByAccount[transaction.account.id]) {
            balanceAdjustmentsByAccount[transaction.account.id] = 
              balanceAdjustmentsByAccount[transaction.account.id].add(adjustment);
          } else {
            balanceAdjustmentsByAccount[transaction.account.id] = adjustment;
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
            message: `${count} transações deletadas e saldos ajustados com sucesso`,
            count
          },
          { status: 200 }
        );
      });
    }
    
    // Delete único
    if (id) {
      return await prisma.$transaction(async (prisma) => {
        // Get the transaction with account info
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

        // Calculate balance adjustment (reverse the original transaction)
        const balanceAdjustment = transaction.type === 'INCOME'
          ? new Prisma.Decimal(transaction.amount).negated()
          : new Prisma.Decimal(transaction.amount);

        // Update account balance
        await prisma.account.update({
          where: { id: transaction.account.id },
          data: {
            balance: { increment: balanceAdjustment }
          }
        });

        // Delete the transaction
        await prisma.transaction.delete({ where: { id } });

        return NextResponse.json(
          { 
            success: true, 
            message: "Transação deletada e saldo ajustado com sucesso" 
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