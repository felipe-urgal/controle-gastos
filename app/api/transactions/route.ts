import { NextResponse } from "next/server";
import { Prisma, TransactionType } from "@prisma/client";
import { TransactionModel, TransactionResponse } from '@/app/types/transaction'
import { ErrorResponse } from '@/app/types/error'
import { prisma } from '@/app/lib/prisma';

export async function POST(req: Request): Promise<NextResponse<TransactionModel | ErrorResponse>> {
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
      const balanceChange = body.type === "INCOME" ? amount : amount.negated();
      const newBalance = new Prisma.Decimal(account.balance).plus(balanceChange);

      // Create the transaction
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

      // Update account balance
      await prisma.account.update({
        where: { id: body.accountId },
        data: { balance: newBalance }
      });

      return transaction;
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
export async function DELETE(req: Request): Promise<NextResponse<{ success: boolean; message: string } | ErrorResponse>> {
  try {
    const { id } = await req.json();

    // Validate required field
    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID da transação é obrigatório" },
        { status: 400 }
      );
    }

    // Process in a transaction to ensure data consistency
    await prisma.$transaction(async (prisma) => {
      // Get the transaction with account info
      const transaction = await prisma.transaction.findUnique({
        where: { id },
        include: {
          account: { select: { id: true, balance: true } }
        }
      });

      if (!transaction) {
        throw new Error("Transação não encontrada");
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
    });

    return NextResponse.json(
      { 
        success: true, 
        message: "Transação deletada e saldo ajustado com sucesso!" 
      },
      { status: 200 }
    );

  } catch(error) {
    console.error("Transaction deletion error:", error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Erro ao deletar transação";
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