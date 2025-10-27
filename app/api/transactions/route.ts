import { NextResponse } from "next/server";
import { Prisma, TransactionStatus } from "@prisma/client";
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request): Promise<NextResponse<any>> {
  try {
    const body = await request.json();
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
      repeatMonths = 1
    } = body;

    let errors = "";

    // Validações básicas
    if (!amount || typeof amount !== 'number' || isNaN(amount)) {
      errors += "Valor é obrigatório e deve ser um número válido.;";
    } else if (amount <= 0) {
      errors += "Valor deve ser maior que zero.;";
    } else if (amount > 1000000000) { // 10 milhões
      errors += "Valor não pode exceder 1.000.000.000.;";
    }

    if (!description?.trim()) {
      errors += "Descrição é obrigatória.;";
    }

    if (!year || !month || !day) {
      errors += "Data completa (ano, mês e dia) é obrigatória.;";
    }

    if (!userId) {
      errors += "ID do usuário é obrigatório.;";
    }

    if (!categoryId) {
      errors += "Categoria é obrigatória.;";
    }

    if (!type) {
      errors += "Tipo da transação é obrigatório.;";
    }

    if (!status) {
      errors += "Status é obrigatória.;";
    }

    if (!accountId) {
      errors += "Conta é obrigatória.;";
    }

    if (description?.trim()) {
      if (description.trim().length < 2) {
        errors += "Descrição deve ter pelo menos 2 caracteres.;";
      }

      if (description.trim().length > 100) {
        errors += "Descrição não pode exceder 100 caracteres.;";
      }
    }

    if (type) {
      const validTypes = ['INCOME', 'EXPENSE'];
      if (!validTypes.includes(type)) {
        errors += "Tipo de transação inválido.;";
      }
    }

    if (status) {
      const validStatuses = ['COMPLETED', 'PENDING', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        errors += "Status de transação inválido.;";
      }
    }

    if (year && (year < 2000 || year > 2100)) {
      errors += "Ano deve estar entre 2000 e 2100.;";
    }

    if (month && (month < 1 || month > 12)) {
      errors += "Mês deve estar entre 1 e 12.;";
    }

    if (day && (day < 1 || day > 31)) {
      errors += "Dia deve estar entre 1 e 31.;";
    }

    if (repeatMonths && (repeatMonths < 1 || repeatMonths > 60)) {
      errors += "Repetições devem estar entre 1 e 60 meses.;";
    }

    if (errors) {
      const formattedErrors = errors.slice(0, -1);
      return NextResponse.json({ 
        status: 400,
        success: false,
        message: formattedErrors
      });
    }

    // Verificar se o usuário existe
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!userExists) {
      return NextResponse.json({ 
        status: 404,
        success: false,
        message: "Usuário não encontrado!" 
      });
    }

    // Verificar se a conta existe e pertence ao usuário
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, userId: true }
    });

    if (!account) {
      return NextResponse.json({ 
        status: 404,
        success: false,
        message: "Conta não encontrada!" 
      });
    }

    if (account.userId !== userId) {
      return NextResponse.json({ 
        status: 403,
        success: false,
        message: "Conta não pertence ao usuário!" 
      });
    }

    // Verificar categoria se for fornecida
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true, userId: true }
      });

      if (!category) {
        return NextResponse.json({ 
          status: 404,
          success: false,
          message: "Categoria não encontrada!" 
        });
      }

      if (category.userId !== userId) {
        return NextResponse.json({ 
          status: 403,
          success: false,
          message: "Categoria não pertence ao usuário!" 
        });
      }
    }

    const transactions: any[] = [];
    let totalBalanceChange = 0;

    // Criar transações individualmente
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
        amount,
        type,
        description: i === 0 ? description.trim() : `${description.trim()} (${i + 1}/${repeatMonths})`,
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

      // Criar transação individual
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

      // Acumular mudança de saldo
      if (status === 'COMPLETED') {
        const balanceChange = type === "INCOME" ? amount : -amount;
        totalBalanceChange += balanceChange;
      }
    }

    // Atualizar saldo da conta UMA ÚNICA VEZ (se necessário)
    if (status === 'COMPLETED' && totalBalanceChange !== 0) {
      await prisma.account.update({
        where: { id: accountId },
        data: { 
          balance: { 
            increment: totalBalanceChange 
          } 
        }
      });
    }

    const message = repeatMonths > 1 
      ? `${repeatMonths} transações criadas com sucesso!` 
      : "Transação criada com sucesso!";

    return NextResponse.json({ 
      status: 201,
      success: true, 
      message,
      data: { items: transactions },
      count: transactions.length
    });

  } catch(error) {
    const errorMessage = translateTransactionError(error);
    
    return NextResponse.json({ 
      status: 500,
      success: false, 
      message: errorMessage,
    });
  }
}

export async function GET(request: Request): Promise<NextResponse<any>> {
  try {
    const { searchParams } = new URL(request.url);
    
    const userId = searchParams.get("userId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const day = searchParams.get("day");
    const accountId = searchParams.get("account");

    if (!userId) {
      return NextResponse.json({ 
        status: 400,
        success: false, 
        message: "Usuário é obrigatório!" 
      });
    }

    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!userExists) {
      return NextResponse.json({ 
        status: 404,
        success: false, 
        message: "Usuário não encontrado!" 
      });
    }

    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(accountId && { accountId })
    };

    if (year) where.year = parseInt(year);
    if (month) where.month = parseInt(month);
    if (day) where.day = parseInt(day);

    const [transactions, incomeResult, expensesResult] = await Promise.all([
      prisma.transaction.findMany({
        where,
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
      status: 200,
      success: true,
      message: "Transações carregadas com sucesso!",
      data: { 
        items: transactions,
        additionalData: {
          income,
          expenses,
          balance: income - expenses
        },
      },
    });

  } catch(error) {
    const errorMessage = translateFetchError(error);
    
    return NextResponse.json({ 
      status: 500,
      success: false, 
      message: errorMessage,
    });
  }
}

export async function PUT(request: Request): Promise<NextResponse<any>> {
  try {
    const { 
      id, 
      amount, 
      type, 
      description, 
      year, 
      month, 
      day, 
      categoryId, 
      accountId,
      status 
    } = await request.json();

    let errors = "";

    if (!id) {
      errors += "ID da transação é obrigatório.;";
    }

    if (errors) {
      const formattedErrors = errors.slice(0, -1);
      return NextResponse.json({ 
        status: 400,
        success: false, 
        message: formattedErrors 
      });
    }

    const existingTransaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        account: { select: { id: true, balance: true, userId: true } },
        category: { select: { userId: true } },
        user: { select: { id: true } }
      }
    });

    if (!existingTransaction) {
      return NextResponse.json({ 
        status: 404,
        success: false, 
        message: "Transação não encontrada!" 
      });
    }

    // Validações condicionais
    if (description !== undefined) {
      if (!description.trim()) {
        errors += "Descrição não pode estar vazia.;";
      } else {
        if (description.trim().length < 2) {
          errors += "Descrição deve ter pelo menos 2 caracteres.;";
        }

        if (description.trim().length > 100) {
          errors += "Descrição não pode exceder 100 caracteres.;";
        }
      }
    }

    if (type) {
      const validTypes = ['INCOME', 'EXPENSE'];
      if (!validTypes.includes(type)) {
        errors += "Tipo de transação inválido.;";
      }
    }

    if (status) {
      const validStatuses = ['COMPLETED', 'PENDING', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        errors += "Status de transação inválido.;";
      }
    }

    if (amount !== undefined) {
      if (typeof amount !== 'number' || isNaN(amount)) {
        errors += "Valor deve ser um número válido.;";
      } else if (amount <= 0) {
        errors += "Valor deve ser maior que zero.;";
      } else if (amount > 1000000000) {
        errors += "Valor não pode exceder 1.000.000.000.;";
      }
    }

    if (year && (year < 2000 || year > 2100)) {
      errors += "Ano deve estar entre 2000 e 2100.;";
    }

    if (month && (month < 1 || month > 12)) {
      errors += "Mês deve estar entre 1 e 12.;";
    }

    if (day && (day < 1 || day > 31)) {
      errors += "Dia deve estar entre 1 e 31.;";
    }

    // Verificar conta se for fornecida
    if (accountId && accountId !== existingTransaction.account.id) {
      const newAccount = await prisma.account.findUnique({
        where: { id: accountId },
        select: { id: true, userId: true }
      });

      if (!newAccount) {
        errors += "Nova conta não encontrada.;";
      } else if (newAccount.userId !== existingTransaction.user.id) {
        errors += "Nova conta não pertence ao usuário.;";
      }
    }

    // Verificar categoria se for fornecida
    if (categoryId !== undefined) {
      if (categoryId === null) {
        // Permitir remover categoria
      } else {
        const category = await prisma.category.findUnique({
          where: { id: categoryId },
          select: { id: true, userId: true }
        });

        if (!category) {
          errors += "Categoria não encontrada.;";
        } else if (category.userId !== existingTransaction.user.id) {
          errors += "Categoria não pertence ao usuário.;";
        }
      }
    }

    if (errors) {
      const formattedErrors = errors.slice(0, -1);
      return NextResponse.json({ 
        status: 400,
        success: false, 
        message: formattedErrors 
      });
    }

    // Usar transação para garantir consistência
    const result = await prisma.$transaction(async (prisma) => {
      // Preparar dados de atualização
      const updateData: Prisma.TransactionUpdateInput = {
        ...(description !== undefined && { description: description.trim() }),
        ...(type && { type }),
        ...(status && { status }),
        ...(amount !== undefined && { amount }),
        ...(year !== undefined && { year }),
        ...(month !== undefined && { month }),
        ...(day !== undefined && { day }),
        ...(accountId && {
          account: { connect: { id: accountId } }
        }),
        ...(categoryId !== undefined && {
          category: categoryId 
            ? { connect: { id: categoryId } }
            : { disconnect: true }
        })
      };

      // Se houve mudança que afeta o saldo, ajustar
      if (amount !== undefined || type !== undefined || status !== undefined || accountId !== undefined) {
        // Lógica de ajuste de saldo (similar à anterior)
        let balanceAdjustment = 0;
        
        // Reverter transação antiga se estava completada
        if (existingTransaction.status === 'COMPLETED') {
          balanceAdjustment = existingTransaction.type === 'INCOME' 
            ? -existingTransaction.amount 
            : existingTransaction.amount;
        }

        // Aplicar nova transação se estará completada
        const newStatus = status || existingTransaction.status;
        if (newStatus === 'COMPLETED') {
          const newAmount = amount !== undefined ? amount : existingTransaction.amount;
          const newType = type || existingTransaction.type;
          const newTransactionEffect = newType === 'INCOME' ? newAmount : -newAmount;
          
          balanceAdjustment += newTransactionEffect;
        }

        // Atualizar saldo se houver ajuste
        if (balanceAdjustment !== 0) {
          const targetAccountId = accountId || existingTransaction.account.id;
          await prisma.account.update({
            where: { id: targetAccountId },
            data: {
              balance: { increment: balanceAdjustment }
            }
          });
        }
      }

      // Atualizar transação
      const updatedTransaction = await prisma.transaction.update({
        where: { id },
        data: updateData,
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

    return NextResponse.json({ 
      status: 200,
      success: true, 
      message: "Transação atualizada com sucesso!",
      data: result
    });

  } catch(error) {
    const errorMessage = translateUpdateError(error);
    
    return NextResponse.json({ 
      status: 500,
      success: false, 
      message: errorMessage,
    });
  }
}

export async function DELETE(request: Request): Promise<NextResponse<any>> {
  try {
    const data = await request.json();
    
    // Extrai o ID corretamente - pode ser string ou objeto com propriedade id
    const id = typeof data.id === 'string' ? data.id : data.id?.id;
    
    if (!id) {
      return NextResponse.json({ 
        status: 400,
        success: false, 
        message: "ID da transação é obrigatório!",
      });
    }

    await prisma.$transaction(async (prisma) => {
      const transaction = await prisma.transaction.findUnique({
        where: { id }, // Agora id é uma string
        include: {
          account: { select: { id: true, balance: true } }
        }
      });

      if (!transaction) {
        throw new Error("Transação não encontrada");
      }

      // Ajustar saldo da conta se a transação estava completada
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

      return { success: true };
    });

    return NextResponse.json({ 
      status: 200,
      success: true, 
      message: "Transação deletada com sucesso!" 
    });
    
  } catch(error) {
    const errorMessage = translateDeleteError(error);
    
    return NextResponse.json({ 
      status: 500,
      success: false, 
      message: errorMessage,
    });
  }
}

function translateDeleteError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro interno ao excluir a transação";
  }

  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
    if (errorMessage.includes('foreign key constraint')) {
      return "Não é possível excluir: existem registros vinculados a esta transação";
    }
    if (errorMessage.includes('record to delete does not exist')) {
      return "A transação não existe ou já foi excluída";
    }
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return "Erro de conexão com o banco de dados. Tente novamente";
    }
    return "Erro no banco de dados ao excluir a transação";
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "Erro de conexão. Verifique sua internet e tente novamente";
  }

  return "Erro inesperado ao excluir a transação. Tente novamente";
}

function translateTransactionError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro interno ao processar a criação da transação";
  }

  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
    if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate')) {
      return "Já existe uma transação similar para este usuário";
    }
    if (errorMessage.includes('foreign key constraint')) {
      return "Usuário, conta ou categoria não encontrado ou inválido";
    }
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return "Erro de conexão com o banco de dados. Tente novamente";
    }
    return "Erro no banco de dados ao criar a transação";
  }

  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return "Dados da transação inválidos";
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "Erro de conexão. Verifique sua internet e tente novamente";
  }

  return "Erro inesperado ao criar a transação. Tente novamente";
}

function translateFetchError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro interno ao buscar transações";
  }

  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return "Erro de conexão com o banco de dados. Tente novamente";
    }
    return "Erro no banco de dados ao buscar transações";
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "Erro de conexão. Verifique sua internet e tente novamente";
  }

  return "Erro inesperado ao buscar transações. Tente novamente";
}

function translateUpdateError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro interno ao atualizar a transação";
  }

  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
    if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate')) {
      return "Já existe uma transação similar para este usuário";
    }
    if (errorMessage.includes('record to update not found')) {
      return "Transação não encontrada ou já foi excluída";
    }
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return "Erro de conexão com o banco de dados. Tente novamente";
    }
    return "Erro no banco de dados ao atualizar a transação";
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "Erro de conexão. Verifique sua internet e tente novamente";
  }

  return "Erro inesperado ao atualizar a transação. Tente novamente";
}