type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

interface ApiClientOptions<TRequestBody = unknown> {
  method?: HttpMethod;
  queryParams?: Record<string, string | number | boolean>;
  body?: TRequestBody;
  headers?: HeadersInit;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
};

export async function apiClient<TResponse = unknown, TRequestBody = unknown>(
  endpoint: string,
  {
    method = "GET",
    queryParams,
    body,
    headers = { "Content-Type": "application/json" },
    credentials = "include",
    signal,
  }: ApiClientOptions<TRequestBody> = {}
): Promise<TResponse> {
  try {
    const baseUrl = typeof window !== "undefined"
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
      signal,
    });

    if (!response.ok) {
      let errorMessage = `Erro ${response.status}: ${response.statusText}`;
      let errorCode: string | undefined;
      const rawRetryAfter = response.headers.get("Retry-After");
      const retryAfterSeconds =
        rawRetryAfter && /^\d+$/.test(rawRetryAfter)
          ? Number(rawRetryAfter)
          : undefined;

      try {
        const errorData = (await response.json()) as {
          error?: { message?: string; code?: string };
          message?: string;
        };
        errorMessage =
          errorData?.error?.message || errorData?.message || errorMessage;
        errorCode = errorData?.error?.code;
      } catch {
        // Keep the HTTP fallback when the response body is not JSON.
      }

      throw new ApiClientError(
        errorMessage,
        response.status,
        errorCode,
        retryAfterSeconds,
      );
    }

    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      return (await response.json()) as TResponse;
    }

    return null as unknown as TResponse;
  } catch (error) {
    throw error instanceof Error ? error : new Error("Erro inesperado na requisição");
  }
};
