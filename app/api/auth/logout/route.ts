import { NextResponse } from "next/server";

export async function POST(): Promise<NextResponse<any>> {
  try {
    const response = NextResponse.json({
      status: 200,
      success: true,
      message: "Logout realizado com sucesso!"
    });

    // Remove o cookie de token
    response.cookies.delete("token");

    return response;

  } catch (error) {
    const errorMessage = translateLogoutError(error);
    
    return NextResponse.json({ 
      status: 500,
      success: false, 
      message: errorMessage,
    });
  }
}

function translateLogoutError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro interno ao processar o logout";
  }

  const errorMessage = error.message.toLowerCase();

  // Erros relacionados a cookies
  if (errorMessage.includes('cookie') || errorMessage.includes('token')) {
    return "Erro ao remover token de autenticação";
  }

  // Erros de rede/requisição
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "Erro de conexão. Verifique sua internet e tente novamente";
  }

  // Erro genérico
  return "Erro inesperado ao realizar logout. Tente novamente";
}