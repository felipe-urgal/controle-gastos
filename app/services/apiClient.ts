// src/app/services/apiClient.ts - CORREÇÃO PARA SERVER

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface ApiClientOptions<TRequestBody = unknown> {
  method?: HttpMethod;
  queryParams?: Record<string, string | number | boolean>;
  body?: TRequestBody;
  headers?: HeadersInit;
}

export async function apiClient<TResponse = unknown, TRequestBody = unknown>(
  endpoint: string,
  {
    method = "GET",
    queryParams,
    body,
    headers = { "Content-Type": "application/json" },
  }: ApiClientOptions<TRequestBody> = {}
): Promise<TResponse> {
  try {
    // CORREÇÃO: Base URL para servidor e cliente
    let baseUrl: string;
    
    if (typeof window !== "undefined") {
      // Cliente
      baseUrl = window.location.origin;
    } else {
      // Servidor - use environment variable ou valor padrão
      baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    }

    const url = new URL(endpoint, baseUrl);

    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const isFormData = body instanceof FormData;
    const finalHeaders = isFormData 
      ? {} // FormData define automaticamente o Content-Type com boundary
      : headers;

    // console.log('🔍 API Request:', {
    //   url: url.toString(),
    //   method,
    //   hasBody: !!body,
    //   isFormData
    // });

    const response = await fetch(url.toString(), {
      method,
      headers: finalHeaders,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    // console.log('🔍 API Response:', {
    //   status: response.status,
    //   ok: response.ok,
    //   url: url.toString()
    // });

    if (!response.ok) {
      let errorMessage = `Erro ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json() as { message?: string };
        errorMessage = errorData.message || errorMessage;
      } catch (error) {
        console.error("Failed to parse error response:", error);
      }
      throw new Error(errorMessage);
    }

    // Verifica se a resposta tem conteúdo antes de tentar parsear JSON
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const jsonResponse = await response.json() as TResponse;
      // console.log('🔍 API Response Data:', jsonResponse);
      return jsonResponse;
    }
    
    // Para respostas que não são JSON (como texto vazio)
    return null as unknown as TResponse;
  } catch (error) {
    console.error("❌ API request failed:", {
      endpoint,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error instanceof Error ? error : new Error("Erro inesperado na requisição");
  }
}
