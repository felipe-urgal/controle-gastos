// src/app/services/apiClient.ts

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
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(endpoint, baseUrl);

    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

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
      return response.json() as Promise<TResponse>;
    }
    
    // Para respostas que não são JSON (como texto vazio)
    return null as unknown as TResponse;
  } catch (error) {
    console.error("API request failed:", error);
    throw error instanceof Error ? error : new Error("Erro inesperado na requisição");
  }
}