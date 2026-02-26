import { apiClient } from "./api-client";

export interface User {
  id: string;
  name: string;
  email: string;
  showValues: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  status: number;
  success: boolean;
  message: string;
  user: User;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

export interface SignupResponse {
  status: number;
  success: boolean;
  message: string;
  user: User;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  showValues?: boolean;
}

export interface forgotPasswordRequest {
  email: string;
}

export interface forgotPasswordResponse {
  status: number;
  success: boolean;
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  novaSenha: string;
}

export interface ResetPasswordResponse {
  status: number;
  success: boolean;
  message: string;
}

export interface DeleteAccountResponse {
  status: number;
  success: boolean;
  message: string;
}

export interface AuthMeResponse {
  status: number;
  success: boolean;
  message: string;
  data: User;
}

export interface ApiResponse<T = any> {
  status: number;
  success: boolean;
  message: string;
  data?: T;
  user?: User;
}

// Erro customizado para autenticação
export class AuthError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export const authService = {
  /**
   * Verifica se o usuário está autenticado
   * Retorna o usuário se autenticado, lança AuthError se não autenticado
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient<AuthMeResponse>("/api/user", {
        method: "GET",
        credentials: "include",
      });
      
      if (!response.success) {
        // Para erro 401 (Não autenticado), não lançamos erro, apenas retornamos null
        if (response.status === 401) {
          throw new AuthError(response.message, response.status, 'NOT_AUTHENTICATED');
        }
        throw new AuthError(response.message, response.status);
      }
      
      return response.data!;
    } catch (error) {
      // Se for erro de autenticação (401), relançamos como AuthError
      if (error instanceof Error && error.message.includes('Não autenticado')) {
        throw new AuthError('Não autenticado', 401, 'NOT_AUTHENTICATED');
      }
      throw error;
    }
  },

  /**
   * Realiza login do usuário
   */
  async login({ email, password }: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient<LoginResponse, LoginRequest>("/api/auth/login", {
      method: "POST",
      body: { email, password },
      credentials: "include",
    });
    
    if (!response.success) {
      throw new AuthError(response.message, response.status);
    }
    
    return response;
  },

  /**
   * Realiza logout do usuário
   */
  async logout(): Promise<{ message: string }> {
    const response = await apiClient<ApiResponse>("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    
    if (!response.success) {
      throw new AuthError(response.message, response.status);
    }
    
    return { message: response.message };
  },

  /**
   * Registra um novo usuário
   */
  async signup({ name, email, password }: SignupRequest): Promise<SignupResponse> {
    const response = await apiClient<SignupResponse, SignupRequest>("/api/auth/signup", {
      method: "POST",
      body: { name, email, password },
    });
    
    if (!response.success) {
      throw new AuthError(response.message, response.status);
    }
    
    return response;
  },

  /**
   * Atualiza dados do usuário
   */
  async updateUser(data: UpdateUserRequest): Promise<User> {
    const response = await apiClient<ApiResponse, UpdateUserRequest>("/api/auth/update-user", {
      method: "PUT",
      body: data,
      credentials: "include",
    });
    
    if (!response.success) {
      throw new AuthError(response.message, response.status);
    }
    
    return response.user!;
  },

  /**
   * Solicita recuperação de senha
   */
  async forgotPassword(email: string): Promise<forgotPasswordResponse> {
    const response = await apiClient<forgotPasswordResponse, forgotPasswordRequest>("/api/auth/forgot-password", {
      method: "POST",
      body: { email },
    });
    
    // Não lançamos erro aqui para permitir tratamento específico no UI
    return response;
  },

  /**
   * Redefine a senha com token
   */
  async resetPassword({ token, novaSenha }: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    const response = await apiClient<ResetPasswordResponse, ResetPasswordRequest>("/api/auth/reset-password", {
      method: "POST",
      body: { token, novaSenha },
    });
    
    // Não lançamos erro aqui para permitir tratamento específico no UI
    return response;
  },

  /**
   * Exclui a conta do usuário
   */
  async deleteAccount(): Promise<DeleteAccountResponse> {
    const response = await apiClient<DeleteAccountResponse>("/api/auth/delete-account", {
      method: "DELETE",
      credentials: "include",
    });
    
    // Não lançamos erro aqui para permitir tratamento específico no UI
    return response;
  },
};