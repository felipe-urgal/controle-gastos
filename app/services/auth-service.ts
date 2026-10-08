import { apiClient } from "./api-client";
import type { User } from "@/app/types/user";

export interface LoginRequest {
  email: string;
  password: string;
};

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: User;
  mfaRequired?: boolean;
  mfaChallenge?: string;
  expiresInSeconds?: number;
};

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
};

export interface SignupResponse {
  success: boolean;
  message: string;
};

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  showValues?: boolean;
  periodicSummaryEnabled?: boolean;
  periodicSummaryFrequency?: 'WEEKLY';
  cancelPendingEmail?: boolean;
};

export interface forgotPasswordRequest {
  email: string;
};

export interface forgotPasswordResponse {
  success: boolean;
  message: string;
};

export interface ResetPasswordRequest {
  token: string;
  novaSenha: string;
};

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
};

export interface AuthMeResponse {
  status: number;
  success: boolean;
  message: string;
  data: User;
};

export interface ApiResponse<T = any> {
  status: number;
  success: boolean;
  message: string;
  data?: T;
  user?: User;
};

// Falhas HTTP chegam como ApiClientError (status, code, retryAfterSeconds,
// fieldErrors); os fluxos de auth reutilizam esse envelope.
export const authService = {
  async getCurrentUser(): Promise<User> {
    const response = await apiClient<AuthMeResponse>("/api/user", {
      method: "GET",
      credentials: "include",
    });

    return response.data;
  },

  login({ email, password }: LoginRequest) {
    return apiClient<LoginResponse, LoginRequest>("/api/auth/login", {
      method: "POST",
      body: { email, password },
      credentials: "include",
    });
  },

  async logout(): Promise<{ message: string }> {
    const response = await apiClient<ApiResponse>("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    return { message: response.message };
  },

  signup({ name, email, password }: SignupRequest) {
    return apiClient<SignupResponse, SignupRequest>("/api/auth/signup", {
      method: "POST",
      body: { name, email, password },
    });
  },

  resendVerification(email: string) {
    return apiClient<SignupResponse, { email: string }>(
      "/api/auth/resend-verification",
      { method: "POST", body: { email } },
    );
  },

  forgotPassword(email: string) {
    return apiClient<forgotPasswordResponse, forgotPasswordRequest>(
      "/api/auth/forgot-password",
      { method: "POST", body: { email } },
    );
  },

  resetPassword({ token, novaSenha }: ResetPasswordRequest) {
    return apiClient<ResetPasswordResponse, ResetPasswordRequest>(
      "/api/auth/reset-password",
      { method: "POST", body: { token, novaSenha } },
    );
  },
};
