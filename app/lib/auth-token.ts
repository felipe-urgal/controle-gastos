const AUTH_TOKEN_KEY = "auth_token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(AUTH_TOKEN_KEY);
};

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
};

export function removeAuthToken(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
};
