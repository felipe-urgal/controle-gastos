export class UnauthorizedError extends Error {
  constructor() {
    super("UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export function isUnauthorizedError(error: unknown): error is Error {
  return (
    error instanceof UnauthorizedError ||
    (error instanceof Error && error.message === "UNAUTHORIZED")
  );
}
