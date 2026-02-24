type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface ApiClientOptions<TRequestBody = unknown> {
  method?: HttpMethod;
  queryParams?: Record<string, string | number | boolean>;
  body?: TRequestBody;
  headers?: HeadersInit;
  credentials?: RequestCredentials;
}

export async function apiClient<TResponse = unknown, TRequestBody = unknown>(
  endpoint: string,
  {
    method = "GET",
    queryParams,
    body,
    headers = { "Content-Type": "application/json" },
    credentials = "include",
  }: ApiClientOptions<TRequestBody> = {}
): Promise<TResponse> {
  try {
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXTAUTH_URL || "http://localhost:3000";

    const url = new URL(endpoint, baseUrl);

    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const isFormData = body instanceof FormData;
    const finalHeaders = isFormData ? {} : headers;

    const response = await fetch(url.toString(), {
      method,
      headers: finalHeaders,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
      credentials,
    });

    if (!response.ok) {
      let errorMessage = `Erro ${response.status}: ${response.statusText}`;

      try {
        const errorData = await response.json();

        errorMessage =
          errorData?.error?.message ||
          errorData?.message ||
          errorMessage;
      } catch {
        let errorMessage = `Erro ${response.status}: ${response.statusText}`;
        try {
          const errorData = (await response.json()) as { message?: string };
          errorMessage = errorData.message || errorMessage;
        } catch {
        }
        throw new Error(errorMessage);
      }

      throw new Error(errorMessage);
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return (await response.json()) as TResponse;
    }

    return null as unknown as TResponse;
  } catch (error) {
    throw error instanceof Error ? error : new Error("Erro inesperado na requisição");
  }
}
