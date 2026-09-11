import { apiClient } from "./api-client";

export interface User {
  id: string;
  name: string;
  email: string;
  showValues: boolean;
  totpEnabled: boolean;
};

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
  status: number;
  success: boolean;
  message: string;
  user: User;
};

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  showValues?: boolean;
};

export interface forgotPasswordRequest {
  email: string;
};

export interface forgotPasswordResponse {
  status: number;
  success: boolean;
  message: string;
};

export interface ResetPasswordRequest {
  token: string;
  novaSenha: string;
};

export interface ResetPasswordResponse {
  status: number;
  success: boolean;
  message: string;
};

export interface DeleteAccountResponse {
  status: number;
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

export class AuthError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message);
    this.name = 'AuthError';
  }
};

export const authService = {
  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient<AuthMeResponse>("/api/user", {method: "GET", credentials: "include"});
      
      if (!response.success) {
        if (response.status === 401) {
          throw new AuthError(response.message, response.status, 'NOT_AUTHENTICATED');
        }
        throw new AuthError(response.message, response.status);
      }
      
      return response.data!;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Não autenticado')) {
        throw new AuthError('Não autenticado', 401, 'NOT_AUTHENTICATED');
      }
      throw error;
    }
  },

  async login({ email, password }: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient<LoginResponse, LoginRequest>("/api/auth/login", {method: "POST", body: { email, password }, credentials: "include"});
    
    if (!response.success) {
      throw new AuthError(response.message);
    }
    
    return response;
  },

  async logout(): Promise<{ message: string }> {
    const response = await apiClient<ApiResponse>("/api/auth/logout", {method: "POST", credentials: "include"});
    
    if (!response.success) {
      throw new AuthError(response.message, response.status);
    }
    
    return { message: response.message };
  },

  async signup({ name, email, password }: SignupRequest): Promise<SignupResponse> {
    const response = await apiClient<SignupResponse, SignupRequest>("/api/auth/signup", {method: "POST", body: { name, email, password }});
    
    if (!response.success) {
      throw new AuthError(response.message, response.status);
    }
    
    return response;
  },

  async updateUser(data: UpdateUserRequest): Promise<User> {
    const response = await apiClient<ApiResponse, UpdateUserRequest>("/api/auth/update-user", {method: "PUT", body: data, credentials: "include"});
    
    if (!response.success) {
      throw new AuthError(response.message, response.status);
    }
    
    return response.user!;
  },

  async forgotPassword(email: string): Promise<forgotPasswordResponse> {
    const response = await apiClient<forgotPasswordResponse, forgotPasswordRequest>("/api/auth/forgot-password", {method: "POST", body: { email }});
    return response;
  },

  async resetPassword({ token, novaSenha }: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    const response = await apiClient<ResetPasswordResponse, ResetPasswordRequest>("/api/auth/reset-password", {method: "POST", body: { token, novaSenha }});
    return response;
  },

  async deleteAccount(): Promise<DeleteAccountResponse> {
    const response = await apiClient<DeleteAccountResponse>("/api/auth/delete-account", {method: "DELETE", credentials: "include"});
    return response;
  },
};
