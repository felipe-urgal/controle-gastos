import { NextResponse } from "next/server";
import { Prisma, AccountType } from "@prisma/client";
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request): Promise<NextResponse<any>> {
  try {
    const body = await request.json();

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

    let errors = "";

    if (!name?.trim()) {
      errors += "Nome da conta é obrigatório!;";
    }

    if (!type) {
      errors += "Tipo da conta é obrigatório!;";
    }

    if (!userId) {
      errors += "ID do usuário é obrigatório!;";
    }

    if (name?.trim()) {
      if (name.trim().length < 2) {
        errors += "Nome da conta deve ter pelo menos 2 caracteres!;";
      }

      if (name.trim().length > 50) {
        errors += "Nome da conta não pode exceder 50 caracteres!;";
      }
    }

    if (type) {
      const validTypes = ['CREDIT_DEBIT', 'INVESTMENT'];
      if (!validTypes.includes(type)) {
        errors += "Tipo de conta inválido!;";
      }
    }

    if (currency) {
      const validCurrencies = ['BRL', 'USD', 'EUR'];
      if (!validCurrencies.includes(currency)) {
        errors += "Moeda inválida!;";
      }
    }

    if (typeof balance !== 'number' || isNaN(balance)) {
      errors += "Saldo deve ser um número válido!;";
    } else if (balance < -1000000 || balance > 100000000) {
      errors += "Saldo deve estar entre -1.000.000 e 100.000.000!;";
    }

    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      errors += "Formato de cor inválido (#RRGGBB)!;";
    }

    if (errors) {
      const formattedErrors = errors.slice(0, -1);
      return NextResponse.json({ 
        status: 400,
        success: false,
        message: formattedErrors
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

    const existingAccount = await prisma.account.findFirst({
      where: { 
        name: name.trim(),
        userId, 
        isActive: true 
      }
    });

    if (existingAccount) {
      return NextResponse.json({
        status: 409,
        success: false, 
        message: "Já existe uma conta ativa com este nome para este usuário!" 
      });
    }

    await prisma.account.create({ 
      data: { 
        name: name.trim(), 
        type, 
        balance, 
        currency, 
        userId, 
        color, 
        icon, 
        description: description?.trim(), 
        isActive 
      }
    });

    return NextResponse.json({ 
      status: 201,
      success: true, 
      message: "Conta criada com sucesso!",
    });

  } catch(error) {
    const errorMessage = translateAccountError(error);
    
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
    const search = searchParams.get("search");
    const type = searchParams.get("type") as AccountType | null;
    const isActive = searchParams.get("isActive");
    const currency = searchParams.get("currency");

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

    if (type) {
      const validTypes = ['CREDIT_DEBIT', 'INVESTMENT'];
      if (!validTypes.includes(type)) {
        return NextResponse.json({ 
          status: 400,
          success: false, 
          message: 'Tipo de conta inválido'
        });
      }
    }

    if (currency) {
      const validCurrencies = ['BRL', 'USD', 'EUR'];
      if (!validCurrencies.includes(currency)) {
        return NextResponse.json({ 
          status: 400,
          success: false, 
          message: 'Moeda inválida'
        });
      }
    }

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

    const accounts = await prisma.account.findMany({
      where,
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
    });

    return NextResponse.json({
      status: 200,
      success: true,
      message: "Contas carregadas com sucesso!",
      data: { items: accounts },
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
      name, 
      type, 
      balance, 
      currency, 
      color,
      icon,
      description,
      isActive 
    } = await request.json();

    let errors = "";

    if (!id) {
      errors += "Conta é obrigatório!;";
    }

    if (errors) {
      const formattedErrors = errors.slice(0, -1);
      return NextResponse.json({ 
        status: 400,
        success: false, 
        message: formattedErrors 
      });
    }

    const existingAccount = await prisma.account.findUnique({
      where: { id },
      include: { user: { select: { id: true }}}
    });

    if (!existingAccount) {
      return NextResponse.json({ 
        status: 404,
        success: false, 
        message: "Conta não encontrada!" 
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        errors += "Nome da conta não pode estar vazio!;";
      } else {
        if (name.trim().length < 2) {
          errors += "Nome da conta deve ter pelo menos 2 caracteres!;";
        }

        if (name.trim().length > 50) {
          errors += "Nome da conta não pode exceder 50 caracteres!;";
        }

        if (name.trim() !== existingAccount.name && name.trim().length >= 2 && name.trim().length <= 50) {
          const duplicateAccount = await prisma.account.findFirst({
            where: {
              name: name.trim(),
              userId: existingAccount.userId,
              id: { not: id },
              isActive: true
            }
          });

          if (duplicateAccount) {
            errors += "Já existe uma conta ativa com este nome para este usuário!;";
          }
        }
      }
    }

    if (type) {
      const validTypes = ['CREDIT_DEBIT', 'INVESTMENT'];
      if (!validTypes.includes(type)) {
        errors += "Tipo de conta inválido!;";
      }
    }

    if (currency) {
      const validCurrencies = ['BRL', 'USD', 'EUR'];
      if (!validCurrencies.includes(currency)) {
        errors += "Moeda inválida!;";
      }
    }

    if (balance !== undefined) {
      if (typeof balance !== 'number' || isNaN(balance)) {
        errors += "Saldo deve ser um número válido!;";
      } else if (balance < -1000000 || balance > 100000000) {
        errors += "Saldo deve estar entre -1.000.000 e 100.000.000!;";
      }
    }

    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      errors += "Formato de cor inválido (#RRGGBB)!;";
    }

    const updateData: any = {
      ...(name !== undefined && { name: name.trim() }),
      ...(type && { type }),
      ...(balance !== undefined && { balance }),
      ...(currency && { currency }),
      ...(color !== undefined && { color }),
      ...(icon !== undefined && { icon }),
      ...(description !== undefined && { description: description?.trim() }),
      ...(isActive !== undefined && { isActive })
    };

    if (Object.keys(updateData).length === 0) {
      errors += "Nenhum dado fornecido para atualização!;";
    }

    if (errors) {
      const formattedErrors = errors.slice(0, -1);
      return NextResponse.json({ 
        status: 400,
        success: false, 
        message: formattedErrors 
      });
    }

    await prisma.account.update({ 
      where: { id }, 
      data: updateData,
      include: {
        _count: {
          select: {
            transactions: true,
            investments: true
          }
        }
      }
    });

    return NextResponse.json({ 
      status: 200,
      success: true, 
      message: "Conta atualizada com sucesso!",
    });

  } catch(error) {
    const errorMessage = translateUpdateError(error);
    
    return NextResponse.json(
      { 
        status: 500,
        success: false, 
        message: errorMessage,
      }
    );
  }
}

export async function DELETE(request: Request): Promise<NextResponse<any>> {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ 
        status: 400,
        success: false, 
        message: "Conta é obrigatório!",
      });
    }

    const account = await prisma.account.findUnique({
      where: { id },
      include: { _count: { select: { transactions: true, investments: true }}}
    });

    if (!account) {
      return NextResponse.json({ 
        status: 404,
        success: false,
        message: "Conta não encontrada",
      });
    }

    if (account._count.transactions > 0) {
      return NextResponse.json({ 
        status: 400,
        success: false,
        message: "Não é possível excluir esta conta pois existem transações vinculadas a ela",
      });
    }

    if (account._count.investments > 0) {
      return NextResponse.json({ 
        status: 400,
        success: false,
        message: "Não é possível excluir esta conta pois existem investimentos vinculados a ela",
      });
    }

    await prisma.account.delete({ where: { id } });

    return NextResponse.json({ 
      status: 200,
      success: true, 
      message: "Conta deletada com sucesso!" 
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
    return "Erro interno ao excluir a conta";
  }

  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
    if (errorMessage.includes('foreign key constraint')) {
      return "Não é possível excluir: existem registros vinculados a esta conta";
    }
    if (errorMessage.includes('record to delete does not exist')) {
      return "A conta não existe ou já foi excluída";
    }
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return "Erro de conexão com o banco de dados. Tente novamente";
    }
    return "Erro no banco de dados ao excluir a conta";
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "Erro de conexão. Verifique sua internet e tente novamente";
  }

  return "Erro inesperado ao excluir a conta. Tente novamente";
}

function translateAccountError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro interno ao processar a criação da conta";
  }

  const errorMessage = error.message.toLowerCase();

  // Erros do Prisma
  if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
    if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate')) {
      return "Já existe uma conta com este nome para o usuário";
    }
    if (errorMessage.includes('foreign key constraint')) {
      return "Usuário não encontrado ou inválido";
    }
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return "Erro de conexão com o banco de dados. Tente novamente";
    }
    return "Erro no banco de dados ao criar a conta";
  }

  // Erros de validação
  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return "Dados da conta inválidos";
  }

  // Erros de rede/requisição
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "Erro de conexão. Verifique sua internet e tente novamente";
  }

  // Erro genérico
  return "Erro inesperado ao criar a conta. Tente novamente";
}

function translateFetchError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro interno ao buscar contas";
  }

  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return "Erro de conexão com o banco de dados. Tente novamente";
    }
    return "Erro no banco de dados ao buscar contas";
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "Erro de conexão. Verifique sua internet e tente novamente";
  }

  return "Erro inesperado ao buscar contas. Tente novamente";
}

function translateUpdateError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro interno ao atualizar a conta";
  }

  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
    if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate')) {
      return "Já existe uma conta com este nome para o usuário";
    }
    if (errorMessage.includes('record to update not found')) {
      return "Conta não encontrada ou já foi excluída";
    }
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return "Erro de conexão com o banco de dados. Tente novamente";
    }
    return "Erro no banco de dados ao atualizar a conta";
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "Erro de conexão. Verifique sua internet e tente novamente";
  }

  return "Erro inesperado ao atualizar a conta. Tente novamente";
}
