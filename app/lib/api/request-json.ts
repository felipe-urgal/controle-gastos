import { HttpError } from "@/app/lib/http-error";

export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new HttpError("JSON inválido", 400, "INVALID_JSON");
    }

    throw error;
  }
}
