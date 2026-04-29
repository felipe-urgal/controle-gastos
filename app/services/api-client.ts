import { getAuthToken } from "@/app/lib/auth-token";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface ApiClientOptions<TRequestBody = unknown> {
  method?: HttpMethod;
  queryParams?: Record<string, string | number | boolean | undefined>;
  body?: TRequestBody;
  headers?: HeadersInit;
}

type ApiErrorResponse = {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
};

export async function apiClient<TResponse = unknown, TRequestBody = unknown>(
  endpoint: string,
  {
    method = "GET",
    queryParams,
    body,
    headers,
  }: ApiClientOptions<TRequestBody> = {}
): Promise<TResponse> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!baseUrl) {
      throw new Error("NEXT_PUBLIC_API_URL não configurado");
    }

    const url = new URL(endpoint, baseUrl);

    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const token = getAuthToken();
    const isFormData = body instanceof FormData;

    const finalHeaders = new Headers(headers || {});

    if (!isFormData) {
      finalHeaders.set("Content-Type", "application/json");
    }

    if (token) {
      finalHeaders.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(url.toString(), {
      method,
      headers: finalHeaders,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let errorMessage = `Erro ${response.status}: ${response.statusText}`;

      try {
        const errorData = (await response.json()) as ApiErrorResponse;
        errorMessage =
          errorData?.error?.message ||
          errorData?.message ||
          errorMessage;
      } catch {
        // mantém fallback
      }

      throw new Error(errorMessage);
    }

    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      return (await response.json()) as TResponse;
    }

    return null as TResponse;
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error("Erro inesperado na requisição");
  }
};
